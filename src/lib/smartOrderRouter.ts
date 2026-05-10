/**
 * smartOrderRouter.ts — Server-side only
 *
 * Smart Order Router (SOR) — determines the optimal execution path for every
 * order after it passes risk checks. Responsibilities:
 *
 *  1. Iceberg Slicer: Breaks large institutional orders into smaller child orders
 *     to minimize market impact (visible size vs. total size)
 *  2. TWAP Scheduler: Distributes execution over a time window to achieve
 *     time-weighted average price
 *  3. Multi-Account Fanout: Routes synchronized trades across multiple sub-accounts
 *     simultaneously using Promise.allSettled
 *  4. Execution Logging: Every child order execution is persisted to QuestDB
 */

import { randomBytes } from 'crypto';
import { getGlobalState, setPosition, setOpenOrder, redis, executeAtomicPositionUpdate } from './redis.ts';
import { writeExecutionLog } from './questdb.ts';
import type { RawOrder } from './riskEngine.ts';
import { circuitBreakers } from './circuitBreaker.ts';
import { eventBus } from './events/eventBus.ts';

const activeTwapTimers = new Map<string, NodeJS.Timeout>();
const TWAP_STATE_KEY = 'tradex:active_twaps'; // Hash -> parentId -> JSON state

// ── Types ─────────────────────────────────────────────────────────
export type RoutingStrategy = 'market' | 'iceberg' | 'twap';

export interface SORConfig {
  strategy:       RoutingStrategy;
  icebergVisiblePct?: number;     // % of total size visible per slice (0.05–0.5)
  icebergSlices?:     number;     // Fixed number of slices
  twapWindowMs?:      number;     // Total TWAP window in ms
  twapIntervalMs?:    number;     // Interval between child orders in ms
}

export interface ChildOrder {
  id:        string;
  parentId:  string;
  accountId: string;
  symbol:    string;
  side:      'Buy' | 'Sell';
  type:      'Market' | 'Limit';
  quantity:  number;
  price?:    number;
  leverage?: number;
  sliceIdx:  number;
  totalSlices: number;
  status:    'pending' | 'submitted' | 'filled' | 'failed';
}

export interface SORResult {
  parentId:    string;
  strategy:    RoutingStrategy;
  totalSlices: number;
  results:     { accountId: string; status: 'fulfilled' | 'rejected'; orderId?: string; error?: string }[];
}

// ── Parent Order Registry (Redis) ─────────────────────────────────
async function recordParentOrder(parentId: string, order: RawOrder, config: SORConfig) {
  try {
    await redis.hset('tradex:parent_orders', parentId, JSON.stringify({
      ...order, config, parentId, createdAt: Date.now(), status: 'routing'
    }));
    eventBus.emitEvent('execution.route', 'smart_router', 'INFO', { parentId, symbol: order.symbol, side: order.side, qty: order.quantity, strategy: config.strategy });
  } catch { /* Redis unavailable — skip persistence in dev */ }
}

async function finalizeParentOrder(parentId: string, status: 'complete' | 'partial' | 'failed') {
  try {
    const raw = await redis.hget('tradex:parent_orders', parentId);
    if (!raw) return;
    const order = JSON.parse(raw);
    await redis.hset('tradex:parent_orders', parentId, JSON.stringify({ ...order, status, completedAt: Date.now() }));
    eventBus.emitEvent(status === 'failed' ? 'execution.failed' : 'execution.filled', 'smart_router', status === 'failed' ? 'ERROR' : 'INFO', { parentId, status });
  } catch { /* Redis unavailable — skip persistence in dev */ }
}

// ── Execution Simulator (replaces real exchange API calls) ────────
async function executeChildOrder(child: ChildOrder, price: number): Promise<string> {
  return circuitBreakers.exchangeRest.execute(async () => {
    // 1. Generate a deterministic ID for position consolidation (Account + Symbol + Side)
    const posId = `pos_${child.accountId}_${child.symbol.toLowerCase()}_${child.side.toLowerCase()}`;
    
    // 2. Define baseline position data for the Lua script (used only if position doesn't exist)
    const newPosition = {
      id:           posId,
      pair:         child.symbol,
      type:         child.side === 'Buy' ? 'LONG' : 'SHORT',
      leverage:     child.leverage ?? 1,
      size:         child.quantity,
      cost:         child.quantity * price,
      entry:        price,
      mark:         price,
      liveDelta:    0,
      liveDeltaPercent: 0,
      accountId:    child.accountId,
      protocolLimits: ['-', '-'],
      lastUpdated: Date.now()
    };

    // 3. Persist consolidated position atomically via Lua script
    await executeAtomicPositionUpdate(posId, child.symbol, child.quantity, price, newPosition);

    // 4. Log the individual execution to QuestDB for audit trail
    const execId = `exec_${randomBytes(5).toString('hex')}`;
    writeExecutionLog(execId, child.symbol, child.side, price, child.quantity, 'filled');

    // 5. Emit event for sourcing
    eventBus.emitEvent('execution.filled', 'smart_router', 'INFO', { 
      execId, 
      childId: child.id, 
      parentId: child.parentId, 
      symbol: child.symbol, 
      side: child.side, 
      price, 
      qty: child.quantity 
    });

    return posId;
  });
}

// ── Iceberg Slicer ────────────────────────────────────────────────
function buildIcebergSlices(
  order: RawOrder,
  accountIds: string[],
  config: SORConfig,
): ChildOrder[][] {
  const numSlices = config.icebergSlices ?? Math.ceil(1 / (config.icebergVisiblePct ?? 0.1));
  const sliceQty  = order.quantity / numSlices;

  // Returns one array of child orders per account
  return accountIds.map(accountId =>
    Array.from({ length: numSlices }, (_, i): ChildOrder => ({
      id:          `child_${randomBytes(4).toString('hex')}`,
      parentId:    '',
      accountId,
      symbol:      order.symbol,
      side:        order.side,
      type:        'Market',
      quantity:    parseFloat(sliceQty.toFixed(6)),
      price:       order.price,
      leverage:    order.leverage,
      sliceIdx:    i,
      totalSlices: numSlices,
      status:      'pending',
    }))
  );
}

// ── Main Router ───────────────────────────────────────────────────
export const smartOrderRouter = {

  /**
   * Route a single order (or multi-account fanout) through the SOR.
   * @param order      The validated order from the risk engine
   * @param accountIds List of account IDs to execute on (multi-account fanout)
   * @param config     Routing strategy config
   */
  async route(
    order: RawOrder,
    accountIds: string[] = [order.accountId],
    config: SORConfig = { strategy: 'market' },
  ): Promise<SORResult> {
    const parentId = `parent_${randomBytes(6).toString('hex')}`;
    await recordParentOrder(parentId, order, config);

    const globalState = await getGlobalState();
    const currentPrice = parseFloat(globalState.price ?? '0');
    const execPrice = order.price ?? currentPrice;

    let sorResult: SORResult;

    switch (config.strategy) {

      case 'iceberg': {
        sorResult = await this._routeIceberg(parentId, order, accountIds, config, execPrice);
        break;
      }

      case 'twap': {
        // Start TWAP and return immediately — do NOT await the entire window
        sorResult = await this._routeTwap(parentId, order, accountIds, config, execPrice);
        break;
      }

      default: // 'market' — immediate fanout
        sorResult = await this._routeMarket(parentId, order, accountIds, execPrice);
    }

    const allOk = sorResult.results.every(r => r.status === 'fulfilled');
    await finalizeParentOrder(parentId, allOk ? 'complete' : 'partial');
    console.log(`[SOR] Parent ${parentId} → ${config.strategy} | ${sorResult.results.length} accounts | ${allOk ? '✅ complete' : '⚠️ partial'}`);
    return sorResult;
  },

  // ── Immediate Market Fanout ──────────────────────────────────────
  async _routeMarket(
    parentId: string,
    order: RawOrder,
    accountIds: string[],
    price: number,
  ): Promise<SORResult> {
    const executions = await Promise.allSettled(
      accountIds.map(accountId =>
        executeChildOrder({
          id:          `child_${randomBytes(4).toString('hex')}`,
          parentId,
          accountId,
          symbol:      order.symbol,
          side:        order.side,
          type:        'Market',
          quantity:    order.quantity,
          price,
          sliceIdx:    0,
          totalSlices: 1,
          status:      'pending',
        }, price)
      )
    );

    return {
      parentId,
      strategy:    'market',
      totalSlices: 1,
      results: executions.map((r, i) => ({
        accountId: accountIds[i],
        status:    r.status,
        orderId:   r.status === 'fulfilled' ? r.value : undefined,
        error:     r.status === 'rejected'  ? String(r.reason) : undefined,
      })),
    };
  },

  // ── Iceberg Routing ──────────────────────────────────────────────
  async _routeIceberg(
    parentId: string,
    order: RawOrder,
    accountIds: string[],
    config: SORConfig,
    price: number,
  ): Promise<SORResult> {
    const sliceGroups = buildIcebergSlices(order, accountIds, config);
    const results: SORResult['results'] = [];

    // Execute slice-by-slice with a small delay to avoid market impact
    for (let sliceIdx = 0; sliceIdx < sliceGroups[0].length; sliceIdx++) {
      const sliceBatch = sliceGroups.map(group => ({ ...group[sliceIdx], parentId, leverage: order.leverage }));

      const batchResults = await Promise.allSettled(
        sliceBatch.map(child => executeChildOrder(child, price + (Math.random() - 0.5) * 0.5)) // ±0.5 price variation per slice
      );

      if (sliceIdx === 0) {
        // Only record per-account results on first slice
        batchResults.forEach((r, i) => results.push({
          accountId: accountIds[i],
          status:    r.status,
          orderId:   r.status === 'fulfilled' ? r.value : undefined,
          error:     r.status === 'rejected'  ? String(r.reason) : undefined,
        }));
      }

      // Delay between slices (configurable)
      if (sliceIdx < sliceGroups[0].length - 1) {
        await new Promise(res => setTimeout(res, 200));
      }
    }

    return { parentId, strategy: 'iceberg', totalSlices: sliceGroups[0].length, results };
  },

  // ── TWAP Routing ─────────────────────────────────────────────────
  async _routeTwap(
    parentId: string,
    order: RawOrder,
    accountIds: string[],
    config: SORConfig,
    basePrice: number,
  ): Promise<SORResult> {
    const windowMs    = config.twapWindowMs   ?? 60_000;
    const intervalMs  = config.twapIntervalMs ?? 10_000;
    const numSlices   = Math.floor(windowMs / intervalMs);
    const sliceQty    = order.quantity / numSlices;

    const state = {
      parentId, order, accountIds, config, basePrice,
      numSlices, sliceQty, intervalMs, completedSlices: 0, status: 'active'
    };

    // Persist state to Redis before starting (best-effort)
    try { await redis.hset(TWAP_STATE_KEY, parentId, JSON.stringify(state)); } catch { /* mock mode */ }

    // Start the execution loop (non-blocking)
    this._runTwapLoop(state);

    return {
      parentId, strategy: 'twap', totalSlices: numSlices,
      results: accountIds.map(id => ({ accountId: id, status: 'fulfilled' as const }))
    };
  },

  _runTwapLoop(state: any) {
    const { parentId, intervalMs, numSlices } = state;

    let isRunning = true;
    
    const twapLoop = async () => {
      while (isRunning) {
        try {
          // Refresh state from Redis (in case of manual cancellation or updates)
          let currentState = state; // fall back to in-memory state if Redis unavailable
          try {
            const raw = await redis.hget(TWAP_STATE_KEY, parentId);
            if (!raw) { activeTwapTimers.delete(parentId); break; }
            currentState = JSON.parse(raw);
          } catch { /* Redis unavailable — use in-memory state */ }

          if (currentState.status !== 'active') {
            activeTwapTimers.delete(parentId);
            break;
          }

          const slicePrice = currentState.basePrice + (Math.random() - 0.5) * currentState.basePrice * 0.0002;

          await Promise.allSettled(
            currentState.accountIds.map((accountId: string) =>
              executeChildOrder({
                id:          `child_${randomBytes(4).toString('hex')}`,
                parentId,
                accountId,
                symbol:      currentState.order.symbol,
                side:        currentState.order.side,
                type:        'Market',
                quantity:    parseFloat(currentState.sliceQty.toFixed(6)),
                price:       slicePrice,
                leverage:    currentState.order.leverage,
                sliceIdx:    currentState.completedSlices,
                totalSlices: numSlices,
                status:      'pending',
              }, slicePrice)
            )
          );

          currentState.completedSlices++;
          state.completedSlices = currentState.completedSlices; // keep in-memory state in sync

          if (currentState.completedSlices >= numSlices) {
            activeTwapTimers.delete(parentId);
            try { await redis.hdel(TWAP_STATE_KEY, parentId); } catch { /* mock */ }
            await finalizeParentOrder(parentId, 'complete');
            console.log(`[SOR] TWAP ${parentId} finished successfully.`);
            break;
          } else {
            try { await redis.hset(TWAP_STATE_KEY, parentId, JSON.stringify(currentState)); } catch { /* mock */ }
          }
        } catch (err) {
          console.error(`[SOR] Error in TWAP loop for ${parentId}:`, err);
        }

        if (!isRunning) break;

        // Wait for intervalMs before executing the next slice (prevents overlapping execution)
        await new Promise(res => {
          const timerId = setTimeout(res, intervalMs);
          activeTwapTimers.set(parentId, timerId);
        });
      }
    };

    // Start the async loop
    twapLoop();
  },

  /**
   * Resumes active TWAP orders from Redis. To be called on server startup.
   */
  async resumeActiveTwaps() {
    let all: Record<string, string> = {};
    try {
      all = await redis.hgetall(TWAP_STATE_KEY);
    } catch {
      // Redis unavailable — no TWAPs to resume
      return;
    }
    const count = Object.keys(all).length;
    if (count === 0) return;

    console.log(`[SOR] Resuming ${count} active TWAP orders from Redis...`);
    for (const [id, raw] of Object.entries(all)) {
      try {
        const lockKey = `tradex:twap_lock:${id}`;
        const acquired = await redis.setnx(lockKey, Date.now().toString());
        if (acquired) {
          await redis.expire(lockKey, 3600);
          const state = JSON.parse(raw);
          if (state.status === 'paused_by_system') {
            state.status = 'active';
            await redis.hset(TWAP_STATE_KEY, id, JSON.stringify(state));
          }
          this._runTwapLoop(state);
        }
      } catch { /* skip this TWAP if Redis fails mid-resume */ }
    }
  },

  async cancelAllTwap() {
    for (const [id, timer] of activeTwapTimers) {
      clearTimeout(timer);
      activeTwapTimers.delete(id);
      try {
        const raw = await redis.hget(TWAP_STATE_KEY, id);
        if (raw) {
          const state = JSON.parse(raw);
          state.status = 'paused_by_system';
          await redis.hset(TWAP_STATE_KEY, id, JSON.stringify(state));
        }
        await redis.del(`tradex:twap_lock:${id}`);
      } catch { /* Redis unavailable during shutdown — skip */ }
      console.warn(`[SOR] TWAP ${id} paused during shutdown`);
    }
  }
};
