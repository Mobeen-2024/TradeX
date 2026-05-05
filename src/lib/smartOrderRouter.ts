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
import { getGlobalState, setPosition, setOpenOrder, redis } from './redis.js';
import { writeExecutionLog } from './questdb.js';
import type { RawOrder } from './riskEngine.js';
import { circuitBreakers } from './circuitBreaker.js';

const activeTwapTimers = new Map<string, NodeJS.Timeout>();

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
  await redis.hset('tradex:parent_orders', parentId, JSON.stringify({
    ...order, config, parentId, createdAt: Date.now(), status: 'routing'
  }));
}

async function finalizeParentOrder(parentId: string, status: 'complete' | 'partial' | 'failed') {
  const raw = await redis.hget('tradex:parent_orders', parentId);
  if (!raw) return;
  const order = JSON.parse(raw);
  await redis.hset('tradex:parent_orders', parentId, JSON.stringify({ ...order, status, completedAt: Date.now() }));
}

// ── Execution Simulator (replaces real exchange API calls) ────────
// In production: replace with `credentialVault.decryptCredentials(accountId)` + exchange SDK calls
async function executeChildOrder(child: ChildOrder, price: number): Promise<string> {
  return circuitBreakers.exchangeRest.execute(async () => {
    const execId = `exec_${randomBytes(5).toString('hex')}`;

    // Simulated fill — in production, this calls the exchange REST API
    await setPosition(execId, {
      id:           execId,
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
      parentOrderId: child.parentId,
      sliceIdx:     child.sliceIdx,
      protocolLimits: ['-', '-'],
    });

    // Log to QuestDB
    writeExecutionLog(execId, child.symbol, child.side, price, child.quantity, 'filled');

    return execId;
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

    console.log(`[SOR] TWAP: ${numSlices} slices over ${windowMs / 1000}s @ ${intervalMs / 1000}s interval`);

    const results: SORResult['results'] = [];
    let sliceIdx = 0;

    return new Promise<SORResult>(resolve => {
      const timer = setInterval(async () => {
        const slicePrice = basePrice + (Math.random() - 0.5) * basePrice * 0.0002; // ±0.02% variation

        const batch = await Promise.allSettled(
          accountIds.map(accountId =>
            executeChildOrder({
              id:          `child_${randomBytes(4).toString('hex')}`,
              parentId,
              accountId,
              symbol:      order.symbol,
              side:        order.side,
              type:        'Market',
              quantity:    parseFloat(sliceQty.toFixed(6)),
              price:       slicePrice,
              leverage:    order.leverage,
              sliceIdx,
              totalSlices: numSlices,
              status:      'pending',
            }, slicePrice)
          )
        );

        if (sliceIdx === 0) {
          batch.forEach((r, i) => results.push({
            accountId: accountIds[i],
            status:    r.status,
            orderId:   r.status === 'fulfilled' ? r.value : undefined,
            error:     r.status === 'rejected'  ? String(r.reason) : undefined,
          }));
        }

        sliceIdx++;
        if (sliceIdx >= numSlices) {
          clearInterval(timer);
          activeTwapTimers.delete(parentId);
          resolve({ parentId, strategy: 'twap', totalSlices: numSlices, results });
        }
      }, intervalMs);
      
      activeTwapTimers.set(parentId, timer);
    });
  },

  cancelAllTwap() {
    for (const [id, timer] of activeTwapTimers) {
      clearInterval(timer);
      activeTwapTimers.delete(id);
      console.warn(`[SOR] TWAP ${id} cancelled during shutdown`);
    }
  }
};
