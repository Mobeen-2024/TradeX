import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared Redis connection for BullMQ
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

/**
 * Institutional Queue Manager
 * 
 * Manages persistent, durable task queues using BullMQ to prevent
 * signal loss and ensure idempotent execution of trades.
 */

// ── 1. Signal Queue: Inbound strategy triggers ─────────────────────
export const signalQueue = new Queue('signals', { connection });
export const signalQueueEvents = new QueueEvents('signals', { connection });

// ── 2. Execution Queue: Formatted orders for the SOR ───────────────
export const executionQueue = new Queue('executions', { connection });
export const executionQueueEvents = new QueueEvents('executions', { connection });

// ── 3. Audit Queue: High-volume persistence to PostgreSQL ──────────
export const auditQueue = new Queue('audit', { connection });

/**
 * Task Submission Helpers
 */
export const queueManager = {
  async addSignal(type: string, data: any, options = {}) {
    return signalQueue.add(type, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      ...options
    });
  },

  async addExecution(order: any, options = {}) {
    return executionQueue.add('execute', order, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 500 },
      ...options
    });
  },

  async addAuditLog(event: any) {
    return auditQueue.add('log', event, {
      removeOnComplete: true,
      removeOnFail: 1000
    });
  },

  async getQueueMetrics() {
    return {
      signals: await signalQueue.getJobCounts('waiting', 'active', 'delayed'),
      executions: await executionQueue.getJobCounts('waiting', 'active', 'delayed'),
    };
  }
};


console.log('[QueueManager] 🛠️  Durable BullMQ clusters initialized.');
