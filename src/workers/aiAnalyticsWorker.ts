/**
 * workers/aiAnalyticsWorker.ts
 *
 * Background worker thread for AI-Driven Market Structure Analytics.
 *
 * Intervals:
 *  - Intent Analysis: ~1s (with quality gate)
 *  - Level Mapping: 30s
 *  - Pattern Scan: on new candle (emulated via periodic check here)
 */

import { parentPort, workerData, isMainThread } from 'worker_threads';
import Redis from 'ioredis';
import {
  streamIntentAnalysis,
  validateLevelsWithAI,
  scanForPatternsAI,
  IntentSnapshot,
  StructuralZone
} from '../lib/aiAnalytics.ts';
import { createRedisClient } from '../lib/redis.ts';

if (isMainThread) {
  throw new Error('aiAnalyticsWorker must run as a worker_thread.');
}

// ── Worker Config ──────────────────────────────────────────────────
interface AIConfig {
  symbol: string;
  intentIntervalMs: number;
  levelsIntervalMs: number;
  qualityGateEnabled: boolean;
}

let config: AIConfig = {
  symbol: 'btcusdt',
  intentIntervalMs: 1000,
  levelsIntervalMs: 30000,
  qualityGateEnabled: true,
  ...workerData
};

let running = true;

// ── Redis ──────────────────────────────────────────────────────────
const redis = createRedisClient();

function log(msg: string) {
  parentPort?.postMessage({ type: 'log', worker: 'ai_analytics', message: msg });
}

// ── Helper: Pivot Detection for Level Mapping ──────────────────────
function detectPivots(candles: any[]): StructuralZone[] {
  const zones: StructuralZone[] = [];
  const lookback = 5;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const curr = candles[i];
    const range = candles.slice(i - lookback, i + lookback + 1);

    const isHigh = range.every(c => curr.high >= c.high);
    const isLow = range.every(c => curr.low <= c.low);

    if (isHigh || isLow) {
      zones.push({
        price: isHigh ? curr.high : curr.low,
        upperBound: (isHigh ? curr.high : curr.low) * 1.001,
        lowerBound: (isHigh ? curr.high : curr.low) * 0.999,
        type: isHigh ? 'supply' : 'demand',
        strength: 1,
        touches: 1
      });
    }
  }

  // Basic clustering
  const clustered: StructuralZone[] = [];
  zones.forEach(z => {
    const existing = clustered.find(c => Math.abs(c.price - z.price) / z.price < 0.003);
    if (existing) {
      existing.touches++;
      existing.strength++;
      existing.price = (existing.price + z.price) / 2;
    } else {
      clustered.push(z);
    }
  });

  return clustered.sort((a, b) => b.strength - a.strength).slice(0, 10);
}

// ── Task 1: Intent Analysis ────────────────────────────────────────
async function runIntentAnalysis() {
  try {
    const obRaw = await redis.get(`tradex:ob:${config.symbol}`);
    const globalState = await redis.hgetall('tradex:global_state');

    if (!obRaw || !globalState.price) return;

    const ob = JSON.parse(obRaw);
    const price = parseFloat(globalState.price);

    const bidVol = ob.bids.slice(0, 10).reduce((sum: number, b: any) => sum + b.amount, 0);
    const askVol = ob.asks.slice(0, 10).reduce((sum: number, a: any) => sum + a.amount, 0);
    const imbalance = bidVol / (bidVol + askVol);
    const spread = Math.abs(ob.asks[0].price - ob.bids[0].price);

    // Quality Gate: Only analyze if imbalance is significant
    if (config.qualityGateEnabled && Math.abs(imbalance - 0.5) < 0.05) return;

    const snapshot: IntentSnapshot = {
      symbol: config.symbol,
      price,
      bidVolume: bidVol,
      askVolume: askVol,
      imbalanceRatio: imbalance,
      recentTrades: [], // Placeholder for recent trades from Redis/QuestDB
      spread
    };

    await streamIntentAnalysis(
      snapshot,
      (chunk) => parentPort?.postMessage({ type: 'ai_intent_chunk', chunk }),
      (full) => {
        parentPort?.postMessage({ type: 'ai_intent', narration: full, imbalanceRatio: imbalance });
      }
    );
  } catch (e) {
    log(`Intent Analysis Error: ${(e as Error).message}`);
  }
}

// ── Task 2: Level Mapping ──────────────────────────────────────────
async function runLevelMapping() {
  try {
    // In a real app, fetch historical candles from QuestDB here.
    // For now, we'll simulate or use a smaller set if available.
    const rawCandles = await redis.get(`tradex:history:${config.symbol}`);
    const candles = rawCandles ? JSON.parse(rawCandles) : [];

    if (candles.length < 50) return;

    const rawZones = detectPivots(candles);
    const validated = await validateLevelsWithAI(rawZones, candles);

    await redis.set('tradex:ai_levels', JSON.stringify(validated), 'EX', 60);
    parentPort?.postMessage({ type: 'ai_levels', levels: validated });
  } catch (e) {
    log(`Level Mapping Error: ${(e as Error).message}`);
  }
}

// ── Task 3: Pattern Scan ───────────────────────────────────────────
async function runPatternScan() {
  try {
    const rawCandles = await redis.get(`tradex:history:${config.symbol}`);
    const globalState = await redis.hgetall('tradex:global_state');
    const candles = rawCandles ? JSON.parse(rawCandles) : [];

    if (candles.length < 20) return;

    const alerts = await scanForPatternsAI(candles.slice(-20), parseFloat(globalState.price || '0'));
    if (alerts.length > 0) {
      parentPort?.postMessage({ type: 'ai_pattern', alerts });
    }
  } catch (e) {
    log(`Pattern Scan Error: ${(e as Error).message}`);
  }
}

// ── Main Loop ──────────────────────────────────────────────────────
async function run() {
  log(`AI Analytics worker started for ${config.symbol}`);

  let lastLevelsUpdate = 0;
  let lastPatternScan = 0;

  while (running) {
    const now = Date.now();

    // Intent (frequent)
    await runIntentAnalysis();

    // Levels (periodic)
    if (now - lastLevelsUpdate > config.levelsIntervalMs) {
      await runLevelMapping();
      lastLevelsUpdate = now;
    }

    // Pattern (every 1m approx or on check)
    if (now - lastPatternScan > 60000) {
      await runPatternScan();
      lastPatternScan = now;
    }

    await new Promise(res => setTimeout(res, config.intentIntervalMs));
  }

  await redis.quit();
  parentPort?.postMessage({ type: 'stopped', worker: 'ai_analytics' });
}

parentPort?.on('message', (msg) => {
  if (msg.type === 'stop') running = false;
  if (msg.type === 'update_config') config = { ...config, ...msg.config };
});

run().catch(err => {
  parentPort?.postMessage({ type: 'error', worker: 'ai_analytics', error: err.message });
  setTimeout(() => process.exit(1), 100);
});
