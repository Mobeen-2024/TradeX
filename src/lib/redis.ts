// src/lib/redis.ts
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export function createRedisClient(options: any = {}) {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    ...options
  });
  client.on('error', (err) => console.error('[Redis] Error:', (err as Error).message));
  return client;
}

export const redis = createRedisClient();

redis.on('connect', () => console.log('[Redis] Connected'));

// ── Key Schema ─────────────────────────────────────────────────
export const KEYS = {
  positions:   'tradex:positions',          // Hash  → id → JSON
  openOrders:  'tradex:open_orders',        // Hash  → id → JSON
  orderBook:   (sym: string) => `tradex:ob:${sym}`,  // JSON string
  globalState: 'tradex:global_state',       // Hash  → price, high, low, vol
  rateLimit:   (key: string) => `tradex:rl:${key}`,  // String (TTL)
} as const;

// ── Typed Helpers ──────────────────────────────────────────────
export async function getPositions(): Promise<any[]> {
  const raw = await redis.hgetall(KEYS.positions);
  return Object.values(raw).map((v) => JSON.parse(v));
}

export async function setPosition(id: string, pos: object) {
  await redis.hset(KEYS.positions, id, JSON.stringify(pos));
}

export async function deletePosition(id: string) {
  await redis.hdel(KEYS.positions, id);
}

export async function getOpenOrders(): Promise<any[]> {
  const raw = await redis.hgetall(KEYS.openOrders);
  return Object.values(raw).map((v) => JSON.parse(v));
}

export async function setOpenOrder(id: string, order: object) {
  await redis.hset(KEYS.openOrders, id, JSON.stringify(order));
}

export async function deleteOpenOrder(id: string) {
  await redis.hdel(KEYS.openOrders, id);
}

export async function getGlobalState() {
  return redis.hgetall(KEYS.globalState);
}

export async function setGlobalPrice(price: number, high: number, low: number) {
  await redis.hset(KEYS.globalState, {
    price: price.toFixed(2),
    high24h: high.toFixed(2),
    low24h: low.toFixed(2),
    updatedAt: Date.now().toString(),
  });
}
