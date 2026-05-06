/**
 * workers/straddleWorker.ts
 *
 * Node.js worker_thread for automated multi-leg Straddle strategy.
 *
 * A Straddle is a volatility strategy where you simultaneously hold:
 *  - LONG  position (profits if price rises)
 *  - SHORT position (profits if price falls)
 * Both at the same notional size, so you profit from large moves in EITHER direction.
 * An ASYMMETRIC straddle has different sizes/prices per leg.
 *
 * This worker:
 *  1. Monitors market volatility (realized vol via price history in Redis)
 *  2. Opens straddle legs when volatility triggers are met
 *  3. Closes legs individually when profit targets or stop-losses are hit
 *  4. Manages the lifecycle of the entire multi-leg position
 *
 * Communication:
 *   parentPort.postMessage({ type: 'open_legs', ... })  → SOR opens legs
 *   parentPort.postMessage({ type: 'close_leg', ... })  → SOR closes a leg
 *   parentPort.postMessage({ type: 'log', ... })        → monitoring
 */

import { parentPort, workerData, isMainThread } from 'worker_threads';
import { createRedisClient } from '../lib/redis.ts';

if (isMainThread) {
  throw new Error('straddleWorker must be run as a worker_thread, not directly.');
}

// ── Worker Config ──────────────────────────────────────────────────
interface StraddleConfig {
  accountId:          string;
  symbol:             string;
  notionalUsdPerLeg:  number;    // Size per leg in USDT
  leverage:           number;
  volatilityThreshold: number;   // Min realized vol % to enter
  takeProfitPct:      number;    // Per-leg profit target %
  stopLossPct:        number;    // Per-leg stop loss %
  asymmetry:          number;    // 1.0 = symmetric; 1.5 = long leg 50% larger
  intervalMs:         number;    // Monitor interval in ms
}

interface StraddleLeg {
  id:        string;
  side:      'LONG' | 'SHORT';
  entryPrice: number;
  quantity:  number;
  status:    'open' | 'closed';
}

let config: StraddleConfig = workerData as StraddleConfig;
let running = true;
let activeLeg: { long?: StraddleLeg; short?: StraddleLeg } = {};

// ── Redis client ───────────────────────────────────────────────────
const redis = createRedisClient();

// Price history ring buffer (last 20 prices for vol computation)
const priceHistory: number[] = [];
const VOL_WINDOW = 20;

function log(msg: string) {
  parentPort?.postMessage({ type: 'log', worker: 'straddle', message: msg });
}

// ── Realized Volatility (simple std-dev of returns) ───────────────
function computeRealizedVol(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns = prices.slice(1).map((p, i) => Math.log(p / prices[i]));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * 100; // % per tick
}

// ── Leg P&L computation ───────────────────────────────────────────
function computeLegPnlPct(leg: StraddleLeg, currentPrice: number): number {
  const diff = leg.side === 'LONG'
    ? (currentPrice - leg.entryPrice) / leg.entryPrice
    : (leg.entryPrice - currentPrice) / leg.entryPrice;
  return diff * 100;
}

// ── Main Loop ──────────────────────────────────────────────────────
async function run() {
  log(`Straddle worker started for account=${config.accountId}, symbol=${config.symbol}, notional=$${config.notionalUsdPerLeg}`);

  while (running) {
    try {
      const globalState = await redis.hgetall('tradex:global_state');
      const price = parseFloat(globalState.price ?? '0');

      if (price > 0) {
        // Update price history
        priceHistory.push(price);
        if (priceHistory.length > VOL_WINDOW) priceHistory.shift();

        const vol = computeRealizedVol(priceHistory);

        // ── Entry Logic: Open straddle legs when vol > threshold ──
        const noLegsOpen = !activeLeg.long && !activeLeg.short;
        if (noLegsOpen && vol >= config.volatilityThreshold && priceHistory.length >= VOL_WINDOW) {
          const longQty  = parseFloat((config.notionalUsdPerLeg * config.asymmetry  / price).toFixed(6));
          const shortQty = parseFloat((config.notionalUsdPerLeg / price).toFixed(6));

          log(`🎯 Vol trigger met (${vol.toFixed(4)}% >= ${config.volatilityThreshold}%). Opening straddle legs @ ${price}`);

          parentPort?.postMessage({
            type: 'open_legs',
            legs: [
              { side: 'Buy',  quantity: longQty,  symbol: config.symbol, price, accountId: config.accountId, leverage: config.leverage },
              { side: 'Sell', quantity: shortQty, symbol: config.symbol, price, accountId: config.accountId, leverage: config.leverage },
            ],
          });

          // Track legs locally (IDs will be updated via parentPort message)
          activeLeg.long  = { id: `long_${Date.now()}`,  side: 'LONG',  entryPrice: price, quantity: longQty,  status: 'open' };
          activeLeg.short = { id: `short_${Date.now()}`, side: 'SHORT', entryPrice: price, quantity: shortQty, status: 'open' };
        }

        // ── Exit Logic: Close individual legs on TP/SL ───────────
        for (const legKey of ['long', 'short'] as const) {
          const leg = activeLeg[legKey];
          if (!leg || leg.status !== 'open') continue;

          const pnlPct = computeLegPnlPct(leg, price);
          const closeSide = leg.side === 'LONG' ? 'Sell' : 'Buy';

          if (pnlPct >= config.takeProfitPct) {
            log(`✅ Take-profit hit on ${leg.side} leg: +${pnlPct.toFixed(2)}%. Closing.`);
            parentPort?.postMessage({
              type: 'close_leg',
              leg:  { ...leg, closeSide, closePrice: price, reason: 'take_profit' },
            });
            leg.status = 'closed';
          } else if (pnlPct <= -config.stopLossPct) {
            log(`🛑 Stop-loss hit on ${leg.side} leg: ${pnlPct.toFixed(2)}%. Closing.`);
            parentPort?.postMessage({
              type: 'close_leg',
              leg:  { ...leg, closeSide, closePrice: price, reason: 'stop_loss' },
            });
            leg.status = 'closed';
          }
        }

        // Reset if both legs closed
        if (activeLeg.long?.status === 'closed' && activeLeg.short?.status === 'closed') {
          log('Both straddle legs closed. Ready for next entry.');
          activeLeg = {};
        }
      }
    } catch (err) {
      log(`Error: ${(err as Error).message}`);
    }

    await new Promise(res => setTimeout(res, config.intervalMs));
  }

  await redis.quit();
  parentPort?.postMessage({ type: 'stopped', worker: 'straddle' });
  log('Straddle worker stopped.');
}

// ── Message Handler ────────────────────────────────────────────────
parentPort?.on('message', (msg) => {
  if (msg.type === 'stop') {
    running = false;
  } else if (msg.type === 'update_config') {
    config = { ...config, ...msg.config };
    log(`Config updated: ${JSON.stringify(msg.config)}`);
  } else if (msg.type === 'leg_opened') {
    // Main thread confirms leg opened with real position ID
    const { side, positionId } = msg;
    const key = side === 'LONG' ? 'long' : 'short';
    if (activeLeg[key]) activeLeg[key]!.id = positionId;
    log(`Leg confirmed open: ${side} positionId=${positionId}`);
  }
});

run().catch(err => {
  parentPort?.postMessage({ type: 'error', worker: 'straddle', error: err.message });
  process.exit(1);
});
