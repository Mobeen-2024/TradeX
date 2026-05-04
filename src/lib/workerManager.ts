/**
 * workerManager.ts — Server-side only
 *
 * Central orchestrator for all algorithm worker_threads.
 *
 * Responsibilities:
 *  1. Spawn / terminate worker threads by strategy type
 *  2. Bridge worker hedge_order / open_legs / close_leg messages → SOR
 *  3. Emit worker logs and status to connected frontend clients (via Fastify WS)
 *  4. Maintain a live registry of running workers in Redis
 */

import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { runRiskChecks } from './riskEngine.js';
import { smartOrderRouter } from './smartOrderRouter.js';
import { redis } from './redis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type StrategyType = 'delta_neutral' | 'straddle';

interface WorkerEntry {
  id:       string;
  type:     StrategyType;
  worker:   Worker;
  config:   Record<string, any>;
  status:   'running' | 'stopped' | 'error';
  startedAt: number;
}

// ── Live registry ──────────────────────────────────────────────────
const registry = new Map<string, WorkerEntry>();

// WS broadcast callback — injected from server.ts
let broadcastFn: ((payload: string) => void) | null = null;
export function setWorkerBroadcast(fn: (payload: string) => void) {
  broadcastFn = fn;
}

function broadcast(payload: object) {
  broadcastFn?.(JSON.stringify(payload));
}

// ── Redis registry sync ────────────────────────────────────────────
async function syncRegistryToRedis() {
  const summary: Record<string, any> = {};
  for (const [id, entry] of registry.entries()) {
    summary[id] = {
      id,
      type:      entry.type,
      status:    entry.status,
      config:    entry.config,
      startedAt: entry.startedAt,
    };
  }
  await redis.set('tradex:workers', JSON.stringify(summary));
}

// ── Worker file resolution ─────────────────────────────────────────
function resolveWorkerFile(type: StrategyType): string {
  const isProd = process.env.NODE_ENV === 'production';
  const ext = isProd ? 'js' : 'ts';
  const workerMap: Record<StrategyType, string> = {
    delta_neutral: path.join(__dirname, '..', 'workers', `deltaNeutralWorker.${ext}`),
    straddle:      path.join(__dirname, '..', 'workers', `straddleWorker.${ext}`),
  };
  return workerMap[type];
}

// ── Message handler (from worker thread → main thread) ────────────
async function handleWorkerMessage(workerId: string, msg: any) {
  switch (msg.type) {

    case 'log':
      console.log(`[Worker:${msg.worker}] ${msg.message}`);
      broadcast({ type: 'worker_log', workerId, worker: msg.worker, message: msg.message, ts: Date.now() });
      break;

    case 'hedge_order': {
      const order = msg.order;
      console.log(`[WorkerMgr] Hedge order from ${workerId}: ${order.side} ${order.quantity} ${order.symbol}`);

      const rawOrder = {
        accountId: order.accountId,
        symbol:    order.symbol,
        side:      order.side,
        type:      'Market' as const,
        quantity:  order.quantity,
        price:     order.price,
        leverage:  order.leverage ?? 1,
      };

      const riskResult = await runRiskChecks(rawOrder);
      if (!riskResult.approved) {
        console.warn(`[WorkerMgr] Hedge order BLOCKED by risk engine: ${riskResult.reason}`);
        broadcast({ type: 'worker_risk_blocked', workerId, reason: riskResult.reason });
        break;
      }

      const sorResult = await smartOrderRouter.route(rawOrder, [order.accountId], { strategy: 'market' });
      broadcast({ type: 'worker_order_routed', workerId, sorResult });
      break;
    }

    case 'open_legs': {
      const legs = msg.legs;
      console.log(`[WorkerMgr] Opening ${legs.length} straddle legs from ${workerId}`);
      
      for (const leg of legs) {
        const rawOrder = {
          accountId: leg.accountId,
          symbol:    leg.symbol,
          side:      leg.side,
          type:      'Market' as const,
          quantity:  leg.quantity,
          price:     leg.price,
          leverage:  leg.leverage ?? 1,
        };

        const riskResult = await runRiskChecks(rawOrder);
        if (!riskResult.approved) {
          console.warn(`[WorkerMgr] Leg BLOCKED by risk engine: ${riskResult.reason}`);
          break;
        }

        const sorResult = await smartOrderRouter.route(rawOrder, [leg.accountId], { strategy: 'market' });
        const entry = registry.get(workerId);
        if (entry) {
          entry.worker.postMessage({ type: 'leg_opened', side: leg.side === 'Buy' ? 'LONG' : 'SHORT', positionId: sorResult.parentId });
        }
      }
      break;
    }

    case 'close_leg':
      console.log(`[WorkerMgr] Closing leg from ${workerId}: ${msg.leg.side} @ ${msg.leg.closePrice} (${msg.leg.reason})`);
      broadcast({ type: 'worker_leg_closed', workerId, leg: msg.leg });
      break;

    case 'stopped': {
      const entry = registry.get(workerId);
      if (entry) entry.status = 'stopped';
      await syncRegistryToRedis();
      broadcast({ type: 'worker_stopped', workerId });
      break;
    }

    case 'error': {
      const entry = registry.get(workerId);
      if (entry) entry.status = 'error';
      await syncRegistryToRedis();
      console.error(`[Worker:${workerId}] Error: ${msg.error}`);
      broadcast({ type: 'worker_error', workerId, error: msg.error });
      break;
    }
  }
}

// ── Public API ────────────────────────────────────────────────────
export const workerManager = {

  async start(type: StrategyType, config: Record<string, any>): Promise<string> {
    const workerId = `wkr_${type}_${Date.now()}`;
    const workerFile = resolveWorkerFile(type);

    console.log(`[WorkerMgr] Spawning ${type} worker: ${workerId}`);

    const worker = new Worker(workerFile, {
      workerData: config,
      env: { REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379' },
    });

    worker.on('message', (msg) => handleWorkerMessage(workerId, msg));
    worker.on('error',   (err) => handleWorkerMessage(workerId, { type: 'error', error: err.message }));
    worker.on('exit',    (code) => {
      if (code !== 0) console.error(`[WorkerMgr] Worker ${workerId} exited with code ${code}`);
      registry.delete(workerId);
      syncRegistryToRedis();
    });

    const entry: WorkerEntry = { id: workerId, type, worker, config, status: 'running', startedAt: Date.now() };
    registry.set(workerId, entry);
    await syncRegistryToRedis();
    broadcast({ type: 'worker_started', workerId, strategyType: type, config });

    return workerId;
  },

  async stop(workerId: string): Promise<void> {
    const entry = registry.get(workerId);
    if (!entry) throw new Error(`Worker ${workerId} not found.`);
    entry.worker.postMessage({ type: 'stop' });
    console.log(`[WorkerMgr] Stop signal sent to ${workerId}`);
  },

  async stopAll(): Promise<void> {
    for (const [id] of registry) await this.stop(id);
  },

  list(): { id: string; type: StrategyType; status: string; startedAt: number }[] {
    return Array.from(registry.values()).map(e => ({
      id:        e.id,
      type:      e.type,
      status:    e.status,
      startedAt: e.startedAt,
    }));
  },

  updateConfig(workerId: string, config: Record<string, any>): void {
    const entry = registry.get(workerId);
    if (!entry) throw new Error(`Worker ${workerId} not found.`);
    entry.worker.postMessage({ type: 'update_config', config });
    entry.config = { ...entry.config, ...config };
  },
};
