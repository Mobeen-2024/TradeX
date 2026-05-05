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
  symbolPositions: (sym: string) => `tradex:pos:sym:${sym.toLowerCase()}`, // Set → IDs
  openOrders:  'tradex:open_orders',        // Hash  → id → JSON
  orderBook:   (sym: string) => `tradex:ob:${sym.toLowerCase()}`,  // JSON string
  globalState: 'tradex:global_state',       // Hash  → price, high, low, vol
  rateLimit:   (key: string) => `tradex:rl:${key}`,  // String (TTL)
} as const;

// ── Typed Helpers ──────────────────────────────────────────────
export async function getPositions(): Promise<any[]> {
  const raw = await redis.hgetall(KEYS.positions);
  return Object.values(raw).map((v) => JSON.parse(v));
}

export async function getPositionsBySymbol(symbol: string): Promise<any[]> {
  const ids = await redis.smembers(KEYS.symbolPositions(symbol));
  if (ids.length === 0) return [];
  const raw = await redis.hmget(KEYS.positions, ...ids);
  return raw.filter(Boolean).map((v) => JSON.parse(v!));
}

export async function setPosition(id: string, pos: any) {
  const symbol = (pos.pair || pos.symbol || '').toLowerCase();
  const pipe = redis.pipeline();
  pipe.hset(KEYS.positions, id, JSON.stringify(pos));
  if (symbol) {
    pipe.sadd(KEYS.symbolPositions(symbol), id);
  }
  await pipe.exec();
}

export async function deletePosition(id: string) {
  const raw = await redis.hget(KEYS.positions, id);
  if (!raw) return;
  const pos = JSON.parse(raw);
  const symbol = (pos.pair || pos.symbol || '').toLowerCase();
  
  const pipe = redis.pipeline();
  pipe.hdel(KEYS.positions, id);
  if (symbol) {
    pipe.srem(KEYS.symbolPositions(symbol), id);
  }
  await pipe.exec();
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

// ── Lua Scripts ────────────────────────────────────────────────

const LUA_UPDATE_POSITION = `
local posKey = KEYS[1]
local symKey = KEYS[2]
local posId = ARGV[1]
local childQty = tonumber(ARGV[2])
local price = tonumber(ARGV[3])
local childDataStr = ARGV[4]
local timestamp = tonumber(ARGV[5])

local raw = redis.call('HGET', posKey, posId)
local position

if raw then
  position = cjson.decode(raw)
  local newSize = position.size + childQty
  local newEntry = price
  if newSize > 0 then
    newEntry = ((position.entry * position.size) + (price * childQty)) / newSize
  end
  
  position.size = newSize
  position.entry = newEntry
  position.cost = newSize * newEntry
  position.mark = price
  position.lastUpdated = timestamp
else
  position = cjson.decode(childDataStr)
  redis.call('SADD', symKey, posId)
end

local updatedRaw = cjson.encode(position)
redis.call('HSET', posKey, posId, updatedRaw)

return posId
`;

export async function executeAtomicPositionUpdate(
  posId: string,
  symbol: string,
  childQty: number,
  price: number,
  newPositionData: any
) {
  await redis.eval(
    LUA_UPDATE_POSITION,
    2,
    KEYS.positions,
    KEYS.symbolPositions(symbol),
    posId,
    childQty.toString(),
    price.toString(),
    JSON.stringify(newPositionData),
    Date.now().toString()
  );
}
