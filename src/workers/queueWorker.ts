import { Worker, Job } from 'bullmq';
import { db } from '../lib/db.ts';
import { smartOrderRouter } from '../lib/smartOrderRouter.ts';
import { runRiskChecks } from '../lib/riskEngine.ts';
import { eventBus } from '../lib/events/eventBus.ts';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

connection.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') return;
  console.error('[QueueWorker] Redis Connection Error:', err.message);
});

/**
 * Institutional Queue Workers
 * 
 * These workers consume the BullMQ persistent queues to ensure that
 * no trade, signal, or audit event is ever lost during a crash.
 */

// ── 1. Execution Worker: Durable Trade Routing ─────────────────────
export const executionWorker = new Worker('executions', async (job: Job) => {
  const { order, accountIds, sorConfig } = job.data;
  
  try {
    eventBus.emitEvent('execution.route', 'queue_worker', 'INFO', { 
      jobId: job.id, 
      symbol: order.symbol, 
      side: order.side, 
      qty: order.quantity 
    }, order.strategyId);

    // Last-mile risk verification
    const riskResult = await runRiskChecks(order);
    if (!riskResult.approved) {
      console.warn(`[QueueWorker] 🛡️ Risk block on ${job.id}: ${riskResult.reason}`);
      return { success: false, reason: riskResult.reason };
    }

    // Execute via SOR
    const result = await smartOrderRouter.route(order, accountIds, sorConfig);
    return { success: true, result };

  } catch (err: any) {
    console.error(`[QueueWorker] ❌ Execution job ${job.id} failed:`, err.message);
    throw err; // BullMQ will handle backoff and retry
  }
}, { 
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000
  }
});

// ── 2. Audit Worker: Durable Event Ingestion ───────────────────────
export const auditWorker = new Worker('audit', async (job: Job) => {
  const event = job.data;
  try {
    await (db as any).auditEvent.create({
      data: {
        eventType: event.eventType,
        source: event.source,
        severity: event.severity,
        payload: event.payload,
        strategyId: event.strategyId || null,
        timestamp: new Date(event.timestamp || Date.now())
      }
    });
  } catch (err: any) {
    console.error(`[QueueWorker] ❌ Failed to persist audit log ${job.id}:`, err.message);
    throw err;
  }
}, { connection, concurrency: 10 });

// ── 3. Signal Worker: Durable Strategy Triggers ────────────────────
export const signalWorker = new Worker('signals', async (job: Job) => {
  const { type, data } = job.data;
  eventBus.emitEvent('signal.received', 'queue_worker', 'INFO', { 
    type, 
    data, 
    jobId: job.id 
  }, data?.strategyId);

  // Logic to trigger specific AI Strategy Workflows or Workers would go here
  // This ensures that even if the backend reboots during a volatility spike,
  // the signal is still processed.
}, { connection, concurrency: 5 });

/**
 * Lifecycle Handlers
 */
const setupHandlers = (worker: Worker, name: string) => {
  worker.on('completed', (job) => console.debug(`[QueueWorker] ✅ ${name} job ${job.id} completed.`));
  worker.on('failed', (job, err) => console.error(`[QueueWorker] ⚠️ ${name} job ${job?.id} failed:`, err.message));
};

setupHandlers(executionWorker, 'Execution');
setupHandlers(auditWorker, 'Audit');
setupHandlers(signalWorker, 'Signal');

console.log('[QueueWorker] 🦾 Institutional persistence workers online.');
