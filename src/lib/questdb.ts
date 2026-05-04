// src/lib/questdb.ts
import net from 'net';

const HOST = process.env.QUESTDB_HOST ?? 'localhost';
const ILP_PORT = parseInt(process.env.QUESTDB_ILP_PORT ?? '9009');

let client: net.Socket | null = null;
let connected = false;
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
    console.log('[QuestDB] ILP connected');
  });

  const handleFailure = (msg: string) => {
    if (connected) {
      console.warn(`[QuestDB] Connection lost: ${msg}`);
    } else {
      console.error(`[QuestDB] ILP error: ${msg}`);
    }
    connected = false;
    
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(connect, 5000);
    }
  };

  client.on('error', (err) => handleFailure((err as Error).message));
  client.on('close', () => handleFailure('Socket closed'));
}

connect();

// ILP format: table,tag=val field=val timestamp\n
export function writeTick(symbol: string, price: number, qty: number, side: 'buy' | 'sell') {
  if (!connected || !client) return;
  const ts = Date.now() * 1_000_000; // nanoseconds
  const line = `ticks,symbol=${symbol},side=${side} price=${price},qty=${qty} ${ts}\n`;
  client.write(line);
}

export function writeOHLCV(symbol: string, o: number, h: number, l: number, c: number, v: number, interval: string) {
  if (!connected || !client) return;
  const ts = Date.now() * 1_000_000;
  const line = `ohlcv,symbol=${symbol},interval=${interval} open=${o},high=${h},low=${l},close=${c},volume=${v} ${ts}\n`;
  client.write(line);
}

export function writeExecutionLog(orderId: string, symbol: string, side: string, price: number, qty: number, status: string) {
  if (!connected || !client) return;
  const ts = Date.now() * 1_000_000;
  const line = `executions,orderId=${orderId},symbol=${symbol},side=${side},status=${status} price=${price},qty=${qty} ${ts}\n`;
  client.write(line);
}
