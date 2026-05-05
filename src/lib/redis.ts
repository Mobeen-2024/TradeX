// src/lib/redis.ts
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export function createRedisClient(options: any = {}) {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => {
      if (process.env.NODE_ENV !== 'production' && times >= 3) {
        return null; // Stop retrying in dev to prevent log spam
      }
      return Math.min(times * 100, 3000);
    },
    ...options
  });
  client.on('error', (err) => {
    if (!useMock) {
      console.error('[Redis] Error:', err.message || err);
    }
  });
  return client;
}

export const redis = createRedisClient();

// ── In-Memory Fallback Store (for Dev without Redis) ────────────
const memoryStore: Record<string, Record<string, string>> = {};
const memorySets: Record<string, Set<string>> = {};
let useMock = false;

redis.on('connect', () => {
  useMock = false;
  console.log('[Redis] Connected');
});

redis.on('error', (err) => {
  if (!useMock) {
    console.warn('[Redis] Connection failed. Falling back to In-Memory store for development.');
    useMock = true;
  }
});

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
  if (useMock) {
    const raw = memoryStore[KEYS.positions] || {};
    return Object.values(raw).map((v) => JSON.parse(v));
  }
  const raw = await redis.hgetall(KEYS.positions);
  return Object.values(raw).map((v) => JSON.parse(v));
}

export async function getPositionsBySymbol(symbol: string): Promise<any[]> {
  if (useMock) {
    const ids = Array.from(memorySets[KEYS.symbolPositions(symbol)] || []);
    if (ids.length === 0) return [];
    const raw = (memoryStore[KEYS.positions] || {});
    return ids.map(id => raw[id]).filter(Boolean).map(v => JSON.parse(v));
  }
  const ids = await redis.smembers(KEYS.symbolPositions(symbol));
  if (ids.length === 0) return [];
  const raw = await redis.hmget(KEYS.positions, ...ids);
  return raw.filter(Boolean).map((v) => JSON.parse(v!));
}

export async function setPosition(id: string, pos: any) {
  const symbol = (pos.pair || pos.symbol || '').toLowerCase();
  
  if (useMock) {
    if (!memoryStore[KEYS.positions]) memoryStore[KEYS.positions] = {};
    memoryStore[KEYS.positions][id] = JSON.stringify(pos);
    if (symbol) {
      if (!memorySets[KEYS.symbolPositions(symbol)]) memorySets[KEYS.symbolPositions(symbol)] = new Set();
      memorySets[KEYS.symbolPositions(symbol)].add(id);
    }
    return;
  }

  const pipe = redis.pipeline();
  pipe.hset(KEYS.positions, id, JSON.stringify(pos));
  if (symbol) {
    pipe.sadd(KEYS.symbolPositions(symbol), id);
  }
  await pipe.exec();
}

export async function deletePosition(id: string) {
  if (useMock) {
    const raw = memoryStore[KEYS.positions]?.[id];
    if (!raw) return;
    const pos = JSON.parse(raw);
    const symbol = (pos.pair || pos.symbol || '').toLowerCase();
    delete memoryStore[KEYS.positions][id];
    if (symbol) memorySets[KEYS.symbolPositions(symbol)]?.delete(id);
    return;
  }

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
  if (useMock) {
    const raw = memoryStore[KEYS.openOrders] || {};
    return Object.values(raw).map((v) => JSON.parse(v));
  }
  const raw = await redis.hgetall(KEYS.openOrders);
  return Object.values(raw).map((v) => JSON.parse(v));
}

export async function setOpenOrder(id: string, order: object) {
  if (useMock) {
    if (!memoryStore[KEYS.openOrders]) memoryStore[KEYS.openOrders] = {};
    memoryStore[KEYS.openOrders][id] = JSON.stringify(order);
    return;
  }
  await redis.hset(KEYS.openOrders, id, JSON.stringify(order));
}

export async function deleteOpenOrder(id: string) {
  if (useMock) {
    delete memoryStore[KEYS.openOrders]?.[id];
    return;
  }
  await redis.hdel(KEYS.openOrders, id);
}

export async function getGlobalState() {
  if (useMock) return memoryStore[KEYS.globalState] || {};
  return redis.hgetall(KEYS.globalState);
}

export async function setGlobalPrice(price: number, high: number, low: number) {
  const update = {
    price: price.toFixed(2),
    high24h: high.toFixed(2),
    low24h: low.toFixed(2),
    updatedAt: Date.now().toString(),
  };

  if (useMock) {
    memoryStore[KEYS.globalState] = update;
    return;
  }

  await redis.hset(KEYS.globalState, update);
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
  if (useMock) {
    if (!memoryStore[KEYS.positions]) memoryStore[KEYS.positions] = {};
    const raw = memoryStore[KEYS.positions][posId];
    let position;
    if (raw) {
      position = JSON.parse(raw);
      const newSize = position.size + childQty;
      const newEntry = newSize > 0 ? ((position.entry * position.size) + (price * childQty)) / newSize : price;
      position.size = newSize;
      position.entry = newEntry;
      position.cost = newSize * newEntry;
      position.mark = price;
      position.lastUpdated = Date.now();
    } else {
      position = newPositionData;
      if (!memorySets[KEYS.symbolPositions(symbol)]) memorySets[KEYS.symbolPositions(symbol)] = new Set();
      memorySets[KEYS.symbolPositions(symbol)].add(posId);
    }
    memoryStore[KEYS.positions][posId] = JSON.stringify(position);
    return;
  }

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
