/**
 * workers/deltaNeutralWorker.ts
 *
 * Node.js worker_thread for continuous Delta-Neutral hedging.
 *
 * Delta-Neutral: Maintains a portfolio where the sum of all position deltas ≈ 0,
 * so that small price moves produce no net P&L change (used in options/vol trading).
 *
 * This worker runs in a SEPARATE THREAD, polling the Redis state every `intervalMs`
 * and rebalancing the hedge position via the parent thread message channel.
 *
 * Communication:
 *   parentPort.postMessage({ type: 'hedge_order', ... }) → triggers SOR in main thread
 *   parentPort.postMessage({ type: 'log', ... })         → monitoring
 *   parentPort.postMessage({ type: 'stopped' })          → graceful shutdown
 *
 * Receives:
 *   { type: 'stop' } → graceful shutdown
 *   { type: 'update_config', config: DeltaNeutralConfig }
 */

import { parentPort, workerData, isMainThread } from 'worker_threads';
import { 
  redis,
  updateMockStore 
} from '../lib/redis.ts';

if (isMainThread) {
  throw new Error('deltaNeutralWorker must be run as a worker_thread, not directly.');
}

// ── Worker Config ──────────────────────────────────────────────────
interface DeltaNeutralConfig {
  accountId:       string;
  symbol:          string;
  targetDelta:     number;
  deltaThreshold:  number;
  maxHedgeUsd:     number;
  intervalMs:      number;
}

let config: DeltaNeutralConfig = workerData as DeltaNeutralConfig;
let running = true;

function log(msg: string) {
  parentPort?.postMessage({ type: 'log', worker: 'delta_neutral', message: msg });
}

// ── Delta Computation ──────────────────────────────────────────────
function computeNetDelta(positions: any[]): number {
  return positions.reduce((delta, pos) => {
    // For linear futures: delta = size * (LONG = +1, SHORT = -1)
    const sign = pos.type === 'LONG' ? 1 : -1;
    return delta + (pos.size * sign);
  }, 0);
}

// ── Main Loop ──────────────────────────────────────────────────────
async function run() {
  log(`Delta-Neutral worker started for account=${config.accountId}, symbol=${config.symbol}, target_delta=${config.targetDelta}`);

  while (running) {
    try {
      // Fetch positions from Redis
      const raw = await redis.hgetall('tradex:positions');
      const allPositions = Object.values(raw).map(v => JSON.parse(v as string));
      const accountPositions = allPositions.filter(
        p => p.accountId === config.accountId && p.pair?.toLowerCase().includes(config.symbol.toLowerCase())
      );

      const netDelta = computeNetDelta(accountPositions);
      const deltaError = netDelta - config.targetDelta;

      // Fetch current price
      const globalState = await redis.hgetall('tradex:global_state');
      const price = parseFloat(globalState.price ?? '0');

      log(`Net delta=${netDelta.toFixed(4)}, error=${deltaError.toFixed(4)}, price=${price}`);

      // Rebalance if outside threshold
      if (Math.abs(deltaError) > config.deltaThreshold && price > 0) {
        const hedgeQty = Math.min(
          Math.abs(deltaError),
          config.maxHedgeUsd / price
        );
        const hedgeSide = deltaError > 0 ? 'Sell' : 'Buy'; // Reduce excess delta

        log(`⚖️  Rebalancing: ${hedgeSide} ${hedgeQty.toFixed(6)} ${config.symbol} @ ~${price}`);

        // Send hedge order request to main thread
        parentPort?.postMessage({
          type: 'hedge_order',
          order: {
            accountId:  config.accountId,
            symbol:     config.symbol,
            side:       hedgeSide,
            orderType:  'Market',
            quantity:   parseFloat(hedgeQty.toFixed(6)),
            price,
            leverage:   1,
            reason:     `delta_neutral_rebalance | delta_error=${deltaError.toFixed(4)}`,
          },
        });
      }
    } catch (err) {
      log(`Error: ${(err as Error).message}`);
    }

    await new Promise(res => setTimeout(res, config.intervalMs));
  }

  await redis.quit();
  parentPort?.postMessage({ type: 'stopped', worker: 'delta_neutral' });
  log('Delta-Neutral worker stopped.');
}

// ── Message Handler ────────────────────────────────────────────────
parentPort?.on('message', (msg) => {
  if (msg.type === 'stop') {
    running = false;
  } else if (msg.type === 'update_config') {
    config = { ...config, ...msg.config };
    log(`Config updated: ${JSON.stringify(msg.config)}`);
  } else if (msg.type === 'mock_sync') {
    updateMockStore(msg.key, msg.value);
  }
});

run().catch(err => {
  parentPort?.postMessage({ type: 'error', worker: 'delta_neutral', error: err.message });
  process.exit(1);
});
