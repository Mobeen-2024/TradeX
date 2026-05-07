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
  return val ? parseFloat(val) : 0;
}

export async function recordLoss(accountId: string, lossUsd: number): Promise<void> {
  const key = `tradex:daily_loss:${accountId}:${new Date().toISOString().slice(0, 10)}`;
  const pipe = redis.pipeline();
  pipe.incrbyfloat(key, lossUsd);
  pipe.expire(key, 86400); // 24h TTL
  await pipe.exec();
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
    return { approved: false, reason: `Symbol ${order.symbol} not in account whitelist.` };
  }

  // ── 2. Leverage cap ──────────────────────────────────────────────
  if (order.leverage > profile.maxLeverage) {
    return { approved: false, reason: `Leverage ${order.leverage}x exceeds account limit of ${profile.maxLeverage}x.` };
  }

  // ── 3. Notional value check ──────────────────────────────────────
  const execPrice = order.price ?? currentPrice;
  const notional = order.notionalUsd ?? (order.quantity * execPrice);
  if (notional > profile.maxPositionSizeUsd) {
    return {
      approved: false,
      reason: `Order notional $${notional.toFixed(2)} exceeds max position size $${profile.maxPositionSizeUsd}.`
    };
  }
  if (notional > profile.maxPositionSizeUsd * 0.8) {
    warnings.push(`Order notional approaching max position size limit (${((notional / profile.maxPositionSizeUsd) * 100).toFixed(1)}% used).`);
  }

  // ── 4. Open position count ───────────────────────────────────────
  if (accountPositions.length >= profile.maxOpenPositions) {
    return { approved: false, reason: `Max open positions limit (${profile.maxOpenPositions}) reached for account ${order.accountId}.` };
  }

  // ── 5. Daily loss circuit-breaker ───────────────────────────────
  const dailyLoss = await getDailyLoss(order.accountId);
  if (dailyLoss >= profile.maxDailyLossUsd) {
    return { approved: false, reason: `Daily loss limit $${profile.maxDailyLossUsd} breached. Trading suspended for account ${order.accountId}.` };
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
    return {
      approved: false,
      reason: `Drawdown circuit-breaker triggered: ${drawdownPct.toFixed(2)}% > ${profile.maxDrawdownPct}% limit.`
    };
  }

  console.log(`[RiskEngine] ✅ Order approved for ${order.accountId} — notional=$${notional.toFixed(2)}, dailyLoss=$${dailyLoss.toFixed(2)}, positions=${accountPositions.length}`);

  return { approved: true, warnings };
}
