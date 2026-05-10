// src/lib/questdb.ts
import net from 'net';

const HOST = process.env.QUESTDB_HOST ?? 'localhost';
const ILP_PORT = parseInt(process.env.QUESTDB_ILP_PORT ?? '9009');

let client: net.Socket | null = null;
let connected = false;
let useMock = false;
let reconnectTimer: NodeJS.Timeout | null = null;

function connect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (client) {
    client.removeAllListeners();
    client.destroy();
  }

  client = new net.Socket();
  client.connect(ILP_PORT, HOST, () => {
    connected = true;
    console.log('[QuestDB] [INFO] ILP connected');
    flushQueue();
  });

  client.on('drain', flushQueue);

  const handleFailure = (msg: string) => {
    if (connected) {
      console.warn(`[QuestDB] Connection lost: ${msg}`);
    } else {
      if (!useMock) {
        console.warn('[QuestDB] [WARN] Infrastructure unavailable — Time-series logging degraded.');
        console.log('[QuestDB] [INFO] Falling back to local Mock Mode for execution telemetry.');
        useMock = true;
      }
    }
    connected = false;
    
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(connect, 30000); // Check every 30s instead of 5s to reduce log spam
    }
  };

  client.on('error', (err) => handleFailure((err as Error).message));
  client.on('close', () => handleFailure('Socket closed'));
}

connect();

// ILP format: table,tag=val field=val timestamp\n
const writeQueue: string[] = [];
const MAX_QUEUE = 10_000;
let draining = false;

function flushQueue() {
  if (!connected || !client || draining) return;
  draining = true;
  while (writeQueue.length > 0) {
    const line = writeQueue.shift()!;
    const ok = client.write(line);
    if (!ok) {
      writeQueue.unshift(line); // put it back
      break;
    }
  }
  draining = false;
}

function safeWrite(line: string) {
  if (useMock) {
    // console.log(`[QuestDB-Mock] Logged: ${line.trim()}`);
    return;
  }
  if (!connected || !client) return;
  if (writeQueue.length > 0 || !client.write(line)) {
    if (writeQueue.length >= MAX_QUEUE) {
      console.warn('[QuestDB] Write queue full — dropping oldest tick');
      writeQueue.shift();
    }
    writeQueue.push(line);
  }
}

// Ensure flush on drain
// (client is assigned in connect(), need to handle there too, but for exports):
export function writeTick(symbol: string, price: number, qty: number, side: 'buy' | 'sell') {
  const ts = Date.now() * 1_000_000; // nanoseconds
  const line = `ticks,symbol=${symbol},side=${side} price=${price},qty=${qty} ${ts}\n`;
  safeWrite(line);
}

export function writeOHLCV(symbol: string, o: number, h: number, l: number, c: number, v: number, interval: string) {
  const ts = Date.now() * 1_000_000;
  const line = `ohlcv,symbol=${symbol},interval=${interval} open=${o},high=${h},low=${l},close=${c},volume=${v} ${ts}\n`;
  safeWrite(line);
}

export function writeExecutionLog(orderId: string, symbol: string, side: string, price: number, qty: number, status: string) {
  const ts = Date.now() * 1_000_000;
  const line = `executions,orderId=${orderId},symbol=${symbol},side=${side},status=${status} price=${price},qty=${qty} ${ts}\n`;
  safeWrite(line);
}
