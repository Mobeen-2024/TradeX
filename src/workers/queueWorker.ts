import { Worker, Job } from 'bullmq';
import { db } from '../lib/db.ts';
import { smartOrderRouter } from '../lib/smartOrderRouter.ts';
import { runRiskChecks } from '../lib/riskEngine.ts';
import { eventBus } from '../lib/events/eventBus.ts';
import { signalQueue, executionQueue, auditQueue, isDurable } from '../lib/queueManager.ts';
import { redis } from '../lib/redis.ts';

/**
 * Worker Logic
 */
async function processExecution(job: any) {
  const { order, accountIds, sorConfig } = job.data;
  try {
    eventBus.emitEvent('execution.route', 'queue_worker', 'INFO', { 
      jobId: job.id, 
      symbol: order.symbol, 
      side: order.side, 
      qty: order.quantity 
    }, order.strategyId);

    const riskResult = await runRiskChecks(order);
    if (!riskResult.approved) {
      console.warn(`[QueueWorker] [WARN] 🛡️ Risk block on ${job.id}: ${riskResult.reason}`);
      return { success: false, reason: riskResult.reason };
    }

    const result = await smartOrderRouter.route(order, accountIds, sorConfig);
    return { success: true, result };
  } catch (err: any) {
    console.error(`[QueueWorker] [ERROR] ❌ Execution job ${job.id} failed:`, err.message);
    throw err;
  }
}

async function processAudit(job: any) {
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
    console.error(`[QueueWorker] [ERROR] ❌ Failed to persist audit log ${job.id}:`, err.message);
    throw err;
  }
}

async function processSignal(job: any) {
  const { type, data } = job.data;
  eventBus.emitEvent('signal.received', 'queue_worker', 'INFO', { 
    type, 
    data, 
    jobId: job.id 
  }, data?.strategyId);
}

/**
 * Lifecycle Handlers for BullMQ
 */
const setupBullMQHandlers = (worker: Worker, name: string) => {
  worker.on('completed', (job) => console.debug(`[QueueWorker] [INFO] ✅ ${name} job ${job.id} completed.`));
  worker.on('failed', (job, err) => console.error(`[QueueWorker] [ERROR] ⚠️ ${name} job ${job?.id} failed:`, err.message));
  worker.on('error', (err) => {
    if (process.env.NODE_ENV !== 'production' && err.message.includes('ECONNREFUSED')) return;
    console.error(`[QueueWorker] [ERROR] ${name} Queue Error:`, err.message);
  });
};


/**
 * Initialization function called by server boot
 */
export function initQueueWorkers() {
  if (!isDurable) {
    console.log('[QueueWorker] [INFO] Initializing Ephemeral Local Workers (Event Listeners).');
    
    executionQueue.on('job', (job: any) => {
      processExecution(job).catch(e => console.error(`[QueueWorker] [ERROR] Local execution failed:`, e.message));
    });
    
    auditQueue.on('job', (job: any) => {
      processAudit(job).catch(e => console.error(`[QueueWorker] [ERROR] Local audit failed:`, e.message));
    });
    
    signalQueue.on('job', (job: any) => {
      processSignal(job).catch(e => console.error(`[QueueWorker] [ERROR] Local signal failed:`, e.message));
    });

    return;
  }

  console.log('[QueueWorker] [INFO] 🚀 Initializing Durable BullMQ Clusters.');
  
  // Reuse existing validated connection
  const connection = redis;
  
  const executionWorker = new Worker('executions', processExecution, { 
    connection,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 }
  });

  const auditWorker = new Worker('audit', processAudit, { 
    connection, 
    concurrency: 10 
  });

  const signalWorker = new Worker('signals', processSignal, { 
    connection, 
    concurrency: 5 
  });

  setupBullMQHandlers(executionWorker, 'Execution');
  setupBullMQHandlers(auditWorker, 'Audit');
  setupBullMQHandlers(signalWorker, 'Signal');
}

// initQueueWorkers(); // Manually initialized by server boot
