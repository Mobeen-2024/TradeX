// src/lib/exchangeGateway.ts
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { redis, KEYS, setGlobalPrice } from './redis.ts';
import { writeTick } from './questdb.ts';

interface GatewayConfig {
  symbols: string[];           // e.g. ['btcusdt', 'ethusdt']
  baseUrl: string;
  reconnectMaxDelay: number;   // ms
  pingIntervalMs: number;
}

const DEFAULT_CONFIG: GatewayConfig = {
  symbols: (process.env.STREAM_SYMBOLS ?? 'btcusdt').split(','),
  baseUrl: process.env.BINANCE_WS_BASE ?? 'wss://stream.binance.com:9443/ws',
  reconnectMaxDelay: 30_000,
  pingIntervalMs: 20_000,
};

export class ExchangeGateway extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1_000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private isAlive = false;
  private terminated = false;
  private config: GatewayConfig;

  // Aggregate: single combined stream URL
  private get streamUrl(): string {
    const streams = this.config.symbols.flatMap((sym) => [
      `${sym}@trade`,           // real-time trade stream
      `${sym}@depth10@100ms`,   // order book depth (top 10, 100ms)
      `${sym}@ticker`,          // 24hr rolling ticker
    ]);
    return `${this.config.baseUrl}/${streams.join('/')}`;
  }

  constructor(config: Partial<GatewayConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  connect() {
    if (this.terminated) return;
    console.log('[Gateway] Connecting to:', this.streamUrl.slice(0, 80) + '...');

    this.ws = new WebSocket(this.streamUrl, {
      perMessageDeflate: {           // ← payload compression
        zlibDeflateOptions: { level: 6 },
        zlibInflateOptions: { chunkSize: 10 * 1024 },
        clientMaxWindowBits: 15,
        serverMaxWindowBits: 15,
        concurrencyLimit: 4,
        threshold: 1024,
      },
    });

    this.ws.on('open', () => {
      console.log('[Gateway] WSS open');
      this.isAlive = true;
      this.reconnectDelay = 1_000; // reset backoff
      this.startHeartbeat();
      this.emit('connected');
    });

    this.ws.on('message', (raw: Buffer) => {
      this.handleMessage(raw);
    });

    this.ws.on('pong', () => {
      this.isAlive = true;
    });

    this.ws.on('close', (code, reason) => {
      console.warn(`[Gateway] WSS closed: ${code} ${reason}`);
      this.stopHeartbeat();
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[Gateway] WSS error:', err.message);
      this.stopHeartbeat();
      this.ws?.terminate();
      this.ws = null;
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.stopHeartbeat();
        return;
      }
      if (!this.isAlive) {
        console.warn('[Gateway] Heartbeat timeout — reconnecting');
        this.ws?.terminate();
        this.ws = null;
        return;
      }
      this.isAlive = false;
      this.ws?.ping();
    }, this.config.pingIntervalMs);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.terminated || this.reconnectTimer) return;
    console.log(`[Gateway] Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);
    // Exponential backoff with jitter, capped at max
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2 + Math.random() * 1000,
      this.config.reconnectMaxDelay
    );
  }

  private async handleMessage(raw: Buffer) {
    try {
      const msg = JSON.parse(raw.toString());
      const stream: string = msg.stream ?? '';
      const data = msg.data ?? msg;

      if (stream.endsWith('@trade')) {
        await this.onTrade(data);
      } else if (stream.includes('@depth')) {
        await this.onDepth(data, stream.split('@')[0]);
      } else if (stream.endsWith('@ticker')) {
        await this.onTicker(data);
      }
    } catch (err) {
      console.error('[Gateway] Parse error:', err);
    }
  }

  private async onTrade(data: any) {
    const symbol = (data.s as string).toLowerCase();
    const price = parseFloat(data.p);
    const qty = parseFloat(data.q);
    const side = data.m ? 'sell' : 'buy'; // m=true → maker (sell)

    // 1. Persist to QuestDB
    writeTick(symbol, price, qty, side);

    // 2. Update Redis global state
    await setGlobalPrice(price, price, price); // high/low updated by ticker

    // 3. Emit for Fastify broadcaster
    this.emit('trade', { symbol, price, qty, side, timestamp: data.T });
  }

  private async onDepth(data: any, symbol: string) {
    const orderBook = {
      bids: (data.bids as [string, string][]).map(([p, q]) => ({
        price: parseFloat(p),
        amount: parseFloat(q),
      })),
      asks: (data.asks as [string, string][]).map(([p, q]) => ({
        price: parseFloat(p),
        amount: parseFloat(q),
      })),
      updatedAt: Date.now(),
    };

    // Persist order book snapshot to Redis
    await redis.set(KEYS.orderBook(symbol), JSON.stringify(orderBook), 'EX', 5);

    this.emit('depth', { symbol, orderBook });
  }

  private async onTicker(data: any) {
    const high = parseFloat(data.h);
    const low = parseFloat(data.l);
    const price = parseFloat(data.c);
    await redis.hset(KEYS.globalState, {
      price: price.toFixed(2),
      high24h: high.toFixed(2),
      low24h: low.toFixed(2),
      volume: parseFloat(data.v).toFixed(2),
      priceChange: data.p,
      priceChangePct: data.P,
      updatedAt: Date.now().toString(),
    });
    this.emit('ticker', data);
  }

  terminate() {
    this.terminated = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

// Singleton export
export const gateway = new ExchangeGateway();
