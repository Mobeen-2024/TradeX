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
import { blackboard } from '../lib/agents/blackboard.ts';

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
// Keep track of original config for adaptive resets
const baseConfig: StraddleConfig = { ...config };

let running = true;
let activeLeg: { long?: StraddleLeg; short?: StraddleLeg } = {};

// ── Redis client ───────────────────────────────────────────────────
const redis = createRedisClient();

// Price history ring buffer (last 20 prices for vol computation)
const priceHistory: number[] = [];
const VOL_WINDOW = 20;

/**
 * Execution Bridge: Adaptive Intelligence
 * 
 * Synchronizes strategy parameters with the global Blackboard.
 * Adjusts risk (SL/Size) dynamically based on agent-detected market regimes.
 */
async function syncWithBlackboard() {
  try {
    const beliefs = await blackboard.getBeliefs(config.symbol);
    const volAgent = beliefs['Volatility'];

    if (!volAgent) return;

    const { status: volStatus } = volAgent;
    let slMultiplier = 1.0;
    let tpMultiplier = 1.0;
    let sizeMultiplier = 1.0;

    if (volStatus === 'SPIKE') {
      slMultiplier = 2.0;    // Widen stops to survive whip-saws
      tpMultiplier = 1.5;    // Target larger runs
      sizeMultiplier = 0.5;  // Reduce size for safety
    } else if (volStatus === 'EXPANDING') {
      slMultiplier = 1.5;
      tpMultiplier = 1.2;
      sizeMultiplier = 0.8;
    }

    // ── Sentiment Adaptation ──
    const sentAgent = beliefs['Sentiment'];
    let newAsymmetry = baseConfig.asymmetry;
    
    if (sentAgent) {
      if (sentAgent.label === 'BULLISH') {
        newAsymmetry = Math.max(baseConfig.asymmetry, 1.5); // Favor longs
      } else if (sentAgent.label === 'BEARISH') {
        newAsymmetry = 1.0 / Math.max(baseConfig.asymmetry, 1.5); // Favor shorts (inverse of 1.5 = 0.66)
      }
    }

    const newSL = baseConfig.stopLossPct * slMultiplier;
    const newTP = baseConfig.takeProfitPct * tpMultiplier;
    const newSize = baseConfig.notionalUsdPerLeg * sizeMultiplier;

    if (config.stopLossPct !== newSL || config.notionalUsdPerLeg !== newSize || config.asymmetry !== newAsymmetry) {
      log(`🧠 Adaptive Bridge: Vol=${volStatus}, Sent=${sentAgent?.label || 'NONE'}. Adjusting SL=${newSL.toFixed(2)}%, TP=${newTP.toFixed(2)}%, Size=$${newSize.toFixed(0)}, Asym=${newAsymmetry.toFixed(2)}`);
      config.stopLossPct = newSL;
      config.takeProfitPct = newTP;
      config.notionalUsdPerLeg = newSize;
      config.asymmetry = newAsymmetry;
    }
  } catch (e) {
    // Blackboard sync failed — proceed with existing config
  }
}

// ── Recovery Logic ─────────────────────────────────────────────────
if ((workerData as any).__RECOVERY_STATE__) {
  const recovery = (workerData as any).__RECOVERY_STATE__;
  if (recovery.nodeStates) {
    activeLeg = recovery.nodeStates.activeLeg ? JSON.parse(recovery.nodeStates.activeLeg) : {};
    if (recovery.nodeStates.priceHistory) {
      const history = JSON.parse(recovery.nodeStates.priceHistory);
      priceHistory.push(...history);
    }
  }
}

async function persistState() {
  try {
    const workerId = (workerData as any).id || `wkr_straddle_${config.symbol}`; // fallback
    await redis.hset(`tradex:runtime:nodes:${workerId}`, {
      activeLeg: JSON.stringify(activeLeg),
      priceHistory: JSON.stringify(priceHistory),
      lastUpdated: Date.now().toString()
    });
  } catch (e) {
    // Silent fail
  }
}

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
      // Sync with global intelligence before each check
      await syncWithBlackboard();

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

        // ── Persist state for recovery ───────────
        await persistState();
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

// ── Heartbeat ──────────────────────────────────────────────────────
setInterval(() => {
  if (running) {
    parentPort?.postMessage({
      type: 'heartbeat',
      data: {
        cpu: process.cpuUsage().user / 1000000,
        memory: process.memoryUsage().heapUsed / 1024 / 1024,
        nodeId: 'straddle_primary'
      }
    });
  }
}, 1000);


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
