// src/lib/redis.ts
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// ── In-Memory Fallback Store ───────────────────────────────────────
// NOTE: Each Node.js worker_thread gets its own copy of this module.
// Cross-thread sync is handled via postMessage in workerManager.ts.
const memoryStore: Record<string, any> = {};
let useMock = false;

/**
 * Directly updates the local in-memory store.
 * Called when the main thread broadcasts a 'mock_sync' message to workers.
 */
export function updateMockStore(key: string, value: any) {
  memoryStore[key] = value;
}

// ── Mock Redis Implementation ──────────────────────────────────────
class MockRedis {
  async get(key: string): Promise<string | null> {
    const val = memoryStore[key];
    if (val === undefined) return null;
    return typeof val === 'string' ? val : JSON.stringify(val);
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
    memoryStore[key] = value;
    return 'OK';
  }

  async hget(key: string, field: string): Promise<string | null> {
    const store = memoryStore[key];
    if (!store || typeof store !== 'object') return null;
    const val = store[field];
    return val === undefined ? null : String(val);
  }

  async hset(key: string, ...args: any[]): Promise<number> {
    if (!memoryStore[key] || typeof memoryStore[key] !== 'object') {
      memoryStore[key] = {};
    }
    // hset(key, field, value, field2, value2 ...) OR hset(key, { field: value })
    if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      Object.assign(memoryStore[key], args[0]);
      return Object.keys(args[0]).length;
    }
    let count = 0;
    for (let i = 0; i < args.length; i += 2) {
      if (i + 1 < args.length) {
        memoryStore[key][args[i]] = args[i + 1];
        count++;
      }
    }
    return count;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const store = memoryStore[key];
    if (!store || typeof store !== 'object') return {};
    // Convert all values to string, as Redis would
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(store)) {
      result[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return result;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    if (!memoryStore[key]) return 0;
    let count = 0;
    fields.forEach(f => {
      if (f in memoryStore[key]) { delete memoryStore[key][f]; count++; }
    });
    return count;
  }

  async del(key: string): Promise<number> {
    if (key in memoryStore) { delete memoryStore[key]; return 1; }
    return 0;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!memoryStore[key]) memoryStore[key] = [];
    const set = new Set<string>(memoryStore[key]);
    const before = set.size;
    members.forEach(m => set.add(m));
    memoryStore[key] = Array.from(set);
    return set.size - before;
  }

  async smembers(key: string): Promise<string[]> {
    return Array.isArray(memoryStore[key]) ? [...memoryStore[key]] : [];
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (!Array.isArray(memoryStore[key])) return 0;
    const set = new Set<string>(memoryStore[key]);
    let count = 0;
    members.forEach(m => { if (set.delete(m)) count++; });
    memoryStore[key] = Array.from(set);
    return count;
  }

  async hmget(key: string, ...fields: string[]): Promise<(string | null)[]> {
    return fields.map(f => {
      const val = memoryStore[key]?.[f];
      return val === undefined ? null : String(val);
    });
  }

  async setnx(key: string, value: string): Promise<0 | 1> {
    if (memoryStore[key] !== undefined) return 0;
    memoryStore[key] = value;
    return 1;
  }

  async expire(_key: string, _seconds: number): Promise<0 | 1> { return 1; }

  async quit(): Promise<'OK'> { return 'OK'; }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async eval(_script: string, _numKeys: number, ..._args: any[]): Promise<any> { return null; }

  pipeline() {
    const ops: Array<() => Promise<any>> = [];
    const pipe = {
      hset: (k: string, ...a: any[]) => { ops.push(() => this.hset(k, ...a)); return pipe; },
      hdel: (k: string, ...a: any[]) => { ops.push(() => this.hdel(k, ...a)); return pipe; },
      sadd: (k: string, ...a: any[]) => { ops.push(() => this.sadd(k, ...a)); return pipe; },
      srem: (k: string, ...a: any[]) => { ops.push(() => this.srem(k, ...a)); return pipe; },
      exec: async () => { const results = await Promise.all(ops.map(op => op())); return results.map(v => [null, v]); },
    };
    return pipe as any;
  }
}

const globalMock = new MockRedis();

// ── Redis Client Factory ───────────────────────────────────────────
/**
 * Creates a Redis client that transparently falls back to an in-memory
 * mock when Redis is unavailable. Uses enableOfflineQueue=false so that
 * commands fail immediately (instead of queuing) when the connection is
 * down — allowing the caller's try/catch to engage right away.
 */
export function createRedisClient(options: Record<string, any> = {}): any {
  const realClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: false,   // ← KEY: fail fast, don't queue commands on closed connection
    lazyConnect: false,
    retryStrategy(times) {
      // In development, stop retrying after 2 attempts to avoid log spam
      if (process.env.NODE_ENV !== 'production' && times >= 2) return null;
      return Math.min(times * 500, 5000);
    },
    ...options,
  });

  let warned = false;

  realClient.on('error', () => {
    if (!warned) {
      warned = true;
      useMock = true;
    }
  });

  realClient.on('connect', () => {
    useMock = false;
    warned = false;
  });

  /**
   * Wraps every call: if useMock is true (Redis failed), proxy to MockRedis.
   * If useMock is false but the call throws (race condition during failover),
   * catch it, set useMock=true, and retry against the mock.
   */
  const handler: ProxyHandler<Redis> = {
    get(target, prop: string) {
      // Pass through non-function properties (status, options, etc.)
      const mockVal = (globalMock as any)[prop];
      if (typeof mockVal !== 'function') {
        return (target as any)[prop];
      }

      return async (...args: any[]) => {
        if (useMock) {
          return (globalMock as any)[prop](...args);
        }
        try {
          return await (target as any)[prop](...args);
        } catch (err: any) {
          // Catch "Connection is closed" / ECONNREFUSED and fall back to mock
          if (
            err?.message?.includes('Connection is closed') ||
            err?.message?.includes('ECONNREFUSED') ||
            err?.message?.includes('Stream isn\'t writeable') ||
            err?.code === 'ECONNREFUSED'
          ) {
            useMock = true;
            return (globalMock as any)[prop](...args);
          }
          throw err;
        }
      };
    },
  };

  return new Proxy(realClient, handler);
}

// ── Singleton for the main process ────────────────────────────────
export const redis = createRedisClient();

// ── Key Schema ─────────────────────────────────────────────────────
export const KEYS = {
  positions:       'tradex:positions',
  symbolPositions: (sym: string) => `tradex:pos:sym:${sym.toLowerCase()}`,
  accountPositions: (acc: string) => `tradex:pos:acc:${acc}`,
  openOrders:      'tradex:open_orders',
  orderBook:       (sym: string) => `tradex:ob:${sym.toLowerCase()}`,
  globalState:     'tradex:global_state',
  rateLimit:       (key: string) => `tradex:rl:${key}`,
  workers:         'tradex:workers',
  activeTwaps:     'tradex:active_twaps',
  parentOrders:    'tradex:parent_orders',
} as const;

// ── Typed Helpers ──────────────────────────────────────────────────
export async function getPositions(): Promise<any[]> {
  const raw = await redis.hgetall(KEYS.positions);
  return Object.values(raw).map((v) => JSON.parse(v as string));
}

export async function getPositionsBySymbol(symbol: string): Promise<any[]> {
  const ids = await redis.smembers(KEYS.symbolPositions(symbol));
  if (ids.length === 0) return [];
  const raw = await redis.hmget(KEYS.positions, ...ids);
  return (raw as (string | null)[]).filter(Boolean).map((v) => JSON.parse(v!));
}

export async function getPositionsByAccount(accountId: string): Promise<any[]> {
  const ids = await redis.smembers(KEYS.accountPositions(accountId));
  if (ids.length === 0) return [];
  const raw = await redis.hmget(KEYS.positions, ...ids);
  return (raw as (string | null)[]).filter(Boolean).map((v) => JSON.parse(v!));
}

export async function setPosition(id: string, pos: any) {
  const symbol = (pos.pair || pos.symbol || '').toLowerCase();
  const accountId = pos.accountId || 'default';
  const pipe = redis.pipeline();
  pipe.hset(KEYS.positions, id, JSON.stringify(pos));
  if (symbol) pipe.sadd(KEYS.symbolPositions(symbol), id);
  if (accountId) pipe.sadd(KEYS.accountPositions(accountId), id);
  await pipe.exec();
}

export async function deletePosition(id: string) {
  const raw = await redis.hget(KEYS.positions, id);
  if (!raw) return;
  const pos = JSON.parse(raw);
  const symbol = (pos.pair || pos.symbol || '').toLowerCase();
  const accountId = pos.accountId || 'default';
  const pipe = redis.pipeline();
  pipe.hdel(KEYS.positions, id);
  if (symbol) pipe.srem(KEYS.symbolPositions(symbol), id);
  if (accountId) pipe.srem(KEYS.accountPositions(accountId), id);
  await pipe.exec();
}

export async function getOpenOrders(): Promise<any[]> {
  const raw = await redis.hgetall(KEYS.openOrders);
  return Object.values(raw).map((v) => JSON.parse(v as string));
}

export async function setOpenOrder(id: string, order: object) {
  await redis.hset(KEYS.openOrders, id, JSON.stringify(order));
}

export async function deleteOpenOrder(id: string) {
  await redis.hdel(KEYS.openOrders, id);
}

export async function getGlobalState(): Promise<Record<string, string>> {
  return redis.hgetall(KEYS.globalState);
}

export async function setGlobalPrice(price: number, high: number, low: number) {
  await redis.hset(KEYS.globalState, {
    price:     price.toFixed(2),
    high24h:   high.toFixed(2),
    low24h:    low.toFixed(2),
    updatedAt: Date.now().toString(),
  });
}

export async function executeAtomicPositionUpdate(
  posId: string,
  symbol: string,
  childQty: number,
  price: number,
  newPositionData: any
) {
  // In mock mode (or as a universal safe implementation), do it in JS
  const raw = await redis.hget(KEYS.positions, posId);
  let position: any;
  if (raw) {
    position = JSON.parse(raw);
    const newSize = position.size + childQty;
    const newEntry =
      newSize > 0
        ? (position.entry * position.size + price * childQty) / newSize
        : price;
    position.size = newSize;
    position.entry = newEntry;
    position.cost = newSize * newEntry;
    position.mark = price;
    position.lastUpdated = Date.now();
  } else {
    position = newPositionData;
    await redis.sadd(KEYS.symbolPositions(symbol), posId);
    if (position.accountId) await redis.sadd(KEYS.accountPositions(position.accountId), posId);
  }
  await redis.hset(KEYS.positions, posId, JSON.stringify(position));
}
