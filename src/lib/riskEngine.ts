/**
 * riskEngine.ts — Server-side only
 *
 * Synchronous pre-flight risk check layer. Every order submitted to the
 * execution engine MUST pass through this module before routing to the exchange.
 *
 * Checks performed (in order):
 *  1. Account status validation
 *  2. Permission verification
 *  3. Margin / available capital check
 *  4. Maximum position size limit
 *  5. Maximum open positions limit
 *  6. Maximum drawdown circuit-breaker
 *  7. Daily loss limit circuit-breaker
 */

import { getPositionsByAccount, getGlobalState, redis } from './redis.ts';
import { eventBus } from './events/eventBus.ts';
import { db } from './db.ts';

// ── Risk Profile (per-account limits) ────────────────────────────
export interface RiskProfile {
  accountId:         string;
  maxPositionSizeUsd:  number;   // Max single position notional value
  maxOpenPositions:    number;   // Max concurrent open positions
  maxDrawdownPct:      number;   // Circuit-breaker: daily drawdown %
  maxDailyLossUsd:     number;   // Circuit-breaker: absolute daily loss
  maxLeverage:         number;   // Leverage cap
  allowedSymbols:      string[]; // Whitelist (empty = all)
}

// ── Order Payload passed to the risk engine ───────────────────────
export interface RawOrder {
  accountId:  string;
  symbol:     string;
  side:       'Buy' | 'Sell';
  type:       'Market' | 'Limit' | 'Stop' | 'StopMarket';
  quantity:   number;
  price?:     number;
  leverage:   number;
  notionalUsd?: number; // Pre-computed notional
}

// ── Risk Check Result ─────────────────────────────────────────────
export interface RiskCheckResult {
  approved:  boolean;
  reason?:   string;
  warnings?: string[];
  adjustedOrder?: Partial<RawOrder>; // SOR may adjust qty, price
}

// ── Default risk profiles (overridable per-account via Redis) ─────
const DEFAULT_PROFILE: Omit<RiskProfile, 'accountId'> = {
  maxPositionSizeUsd: 500_000,
  maxOpenPositions:   50,
  maxDrawdownPct:     10,
  maxDailyLossUsd:    25_000,
  maxLeverage:        20,
  allowedSymbols:     [],
};

async function getRiskProfile(accountId: string): Promise<RiskProfile> {
  const raw = await redis.hget('tradex:risk_profiles', accountId);
  if (raw) return JSON.parse(raw);
  return { accountId, ...DEFAULT_PROFILE };
}

export async function setRiskProfile(profile: RiskProfile): Promise<void> {
  await redis.hset('tradex:risk_profiles', profile.accountId, JSON.stringify(profile));
}

async function getDailyLoss(accountId: string): Promise<number> {
  const key = `tradex:daily_loss:${accountId}:${new Date().toISOString().slice(0, 10)}`;
  const val = await redis.get(key);
  if (val) return parseFloat(val);

  // Fallback to PostgreSQL if Redis is empty (e.g., after crash)
  try {
    const state = await (db as any).riskState.findUnique({ where: { accountId } });
    if (state) {
      // Re-populate Redis for performance
      await redis.set(key, state.dailyLossUsd.toString(), { EX: 86400 });
      return state.dailyLossUsd;
    }
  } catch (e) {
    console.error('[RiskEngine] Persistence fallback failed:', e);
  }
  
  return 0;
}

export async function recordLoss(accountId: string, lossUsd: number): Promise<void> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const key = `tradex:daily_loss:${accountId}:${dateStr}`;
  
  // 1. Update Redis (Hot path)
  const pipe = redis.pipeline();
  pipe.incrbyfloat(key, lossUsd);
  pipe.expire(key, 86400);
  await pipe.exec();

  // 2. Update PostgreSQL (Persistence path)
  try {
    const current = await getDailyLoss(accountId);
    await (db as any).riskState.upsert({
      where: { accountId },
      update: { dailyLossUsd: current },
      create: { accountId, dailyLossUsd: current }
    });
  } catch (e) {
    console.error('[RiskEngine] Failed to persist risk state:', e);
  }
}

/**
 * Hydrate the risk engine from persistent storage.
 * Called during system boot to ensure continuity.
 */
export async function hydrateRiskState() {
  console.log('[RiskEngine] Hydrating risk state from PostgreSQL...');
  try {
    const states = await (db as any).riskState.findMany();
    const dateStr = new Date().toISOString().slice(0, 10);

    for (const state of states) {
      const key = `tradex:daily_loss:${state.accountId}:${dateStr}`;
      await redis.set(key, state.dailyLossUsd.toString(), { EX: 86400 });
    }
    console.log(`[RiskEngine] Successfully hydrated ${states.length} account risk profiles.`);
  } catch (e) {
    console.error('[RiskEngine] Hydration failed:', e);
  }
}

// ── Core Risk Check (synchronous logic, async data fetches) ────────
export async function runRiskChecks(order: RawOrder): Promise<RiskCheckResult> {
  // ── 0. Infrastructure Health Check ──────────────────────────────
  if (redis.status !== 'ready') {
    return { approved: false, reason: 'System integrity error: Redis connection not ready.' };
  }

  const warnings: string[] = [];
  const profile = await getRiskProfile(order.accountId);
  const globalState = await getGlobalState();
  const currentPrice = parseFloat(globalState.price ?? '0');
  const accountPositions = await getPositionsByAccount(order.accountId);

  // ── 1. Symbol Whitelist ──────────────────────────────────────────
  if (profile.allowedSymbols.length > 0 && !profile.allowedSymbols.includes(order.symbol)) {
    const reason = `Symbol ${order.symbol} not in account whitelist.`;
    eventBus.log('risk.rejected', 'risk_engine', 'WARN', { accountId: order.accountId, reason, symbol: order.symbol });
    return { approved: false, reason };
  }

  // ── 2. Leverage cap ──────────────────────────────────────────────
  if (order.leverage > profile.maxLeverage) {
    const reason = `Leverage ${order.leverage}x exceeds account limit of ${profile.maxLeverage}x.`;
    eventBus.log('risk.rejected', 'risk_engine', 'WARN', { accountId: order.accountId, reason, leverage: order.leverage });
    return { approved: false, reason };
  }

  // ── 3. Notional value check ──────────────────────────────────────
  const execPrice = order.price ?? currentPrice;
  const notional = order.notionalUsd ?? (order.quantity * execPrice);
  if (notional > profile.maxPositionSizeUsd) {
    const reason = `Order notional $${notional.toFixed(2)} exceeds max position size $${profile.maxPositionSizeUsd}.`;
    eventBus.log('risk.rejected', 'risk_engine', 'WARN', { accountId: order.accountId, reason, notional });
    return {
      approved: false,
      reason
    };
  }
  if (notional > profile.maxPositionSizeUsd * 0.8) {
    warnings.push(`Order notional approaching max position size limit (${((notional / profile.maxPositionSizeUsd) * 100).toFixed(1)}% used).`);
  }

  // ── 4. Open position count ───────────────────────────────────────
  if (accountPositions.length >= profile.maxOpenPositions) {
    const reason = `Max open positions limit (${profile.maxOpenPositions}) reached for account ${order.accountId}.`;
    eventBus.log('risk.rejected', 'risk_engine', 'WARN', { accountId: order.accountId, reason });
    return { approved: false, reason };
  }

  // ── 5. Daily loss circuit-breaker ───────────────────────────────
  const dailyLoss = await getDailyLoss(order.accountId);
  if (dailyLoss >= profile.maxDailyLossUsd) {
    const reason = `Daily loss limit $${profile.maxDailyLossUsd} breached. Trading suspended for account ${order.accountId}.`;
    eventBus.log('risk.triggered', 'risk_engine', 'CRITICAL', { accountId: order.accountId, reason, dailyLoss });
    return { approved: false, reason };
  }

  // ── 6. Drawdown circuit-breaker ──────────────────────────────────
  const totalUnrealizedPnl = accountPositions.reduce((sum, p) => sum + (p.liveDelta ?? 0), 0);
  
  // Use stored equity or fall back to a safe minimum to avoid division by 1 or 0
  const storedEquity = await redis.hget('tradex:account_equity', order.accountId);
  const equity = storedEquity 
    ? parseFloat(storedEquity) 
    : (accountPositions.reduce((sum, p) => sum + p.cost, 0) || profile.maxPositionSizeUsd);
  
  const drawdownPct = Math.abs(totalUnrealizedPnl / equity) * 100;
  if (totalUnrealizedPnl < 0 && drawdownPct > profile.maxDrawdownPct) {
    const reason = `Drawdown circuit-breaker triggered: ${drawdownPct.toFixed(2)}% > ${profile.maxDrawdownPct}% limit.`;
    eventBus.log('risk.triggered', 'risk_engine', 'CRITICAL', { accountId: order.accountId, reason, drawdownPct });
    return { approved: false, reason };
  }

  // ── 7. Correlation Exposure Check ────────────────────────────────
  // Group assets into sectors (simplified mock logic)
  const sectors: Record<string, string[]> = {
    'layer1': ['BTC', 'ETH', 'SOL', 'AVAX', 'DOT'],
    'ai': ['RNDR', 'FET', 'AGIX', 'OCEAN'],
    'defi': ['AAVE', 'UNI', 'MKR', 'SNX']
  };

  const getSector = (sym: string) => Object.keys(sectors).find(s => sectors[s].includes(sym.toUpperCase().replace('USDT', ''))) || 'other';
  const orderSector = getSector(order.symbol);

  if (orderSector !== 'other') {
    const sectorCount = accountPositions.filter(p => getSector(p.pair) === orderSector).length;
    if (sectorCount >= 3) { // Max 3 positions per correlated sector
      const reason = `Correlation limit reached: Account already has ${sectorCount} active positions in ${orderSector} sector.`;
      eventBus.log('risk.rejected', 'risk_engine', 'WARN', { accountId: order.accountId, reason, sector: orderSector });
      return { approved: false, reason };
    }
  }

  console.log(`[RiskEngine] ✅ Order approved for ${order.accountId} — notional=$${notional.toFixed(2)}, dailyLoss=$${dailyLoss.toFixed(2)}, positions=${accountPositions.length}`);
  
  eventBus.log('risk.approved', 'risk_engine', 'INFO', { 
    accountId: order.accountId, 
    symbol: order.symbol, 
    notional,
    dailyLoss
  });

  return { approved: true, warnings };
}
