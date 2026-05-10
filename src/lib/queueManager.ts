import { Queue } from 'bullmq';
import { EventEmitter } from 'events';
import { runtimeCapabilities } from './runtimeCapabilities.ts';
import { redis } from './redis.ts';

// Local Ephemeral Queue for offline development
class LocalQueue extends EventEmitter {
  constructor(public name: string) {
    super();
  }
  async add(jobName: string, data: any, options: any = {}) {
    const job = { 
      id: `local-${Math.random().toString(36).substr(2, 9)}`, 
      name: jobName, 
      data, 
      opts: options,
      timestamp: Date.now()
    };
    // Emit for local workers to consume
    setImmediate(() => this.emit('job', job));
    return job;
  }
  async getJobCounts() {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }
}

export let signalQueue: any = null;
export let executionQueue: any = null;
export let auditQueue: any = null;
export let isDurable = false;

/**
 * Initialize the Queue Layer
 * 
 * Bulletproof Gateway: BullMQ only starts if Redis is verified 'ready'.
 * Otherwise, falls back to a non-blocking Ephemeral Memory Queue.
 */
export function initQueueManager() {
  // CRITICAL: Double-check both capability and raw connection status
  const redisReady = runtimeCapabilities.durableQueues && (redis as any).status === 'ready';

  if (!redisReady) {
    console.warn(`[QueueManager] [WARN] Redis status: ${(redis as any).status || 'disconnected'} — Durable queues disabled.`);
    console.log('[QueueManager] [INFO] Initializing Local Ephemeral Memory Queues.');
    
    isDurable = false;
    signalQueue = new LocalQueue('signals');
    executionQueue = new LocalQueue('executions');
    auditQueue = new LocalQueue('audit');
  } else {
    try {
      console.log('[QueueManager] [INFO] 🚀 Redis Ready. Initializing BullMQ Cluster.');
      
      // Reuse the existing validated connection to prevent redundant handshake spam
      const connection = redis;

      signalQueue = new Queue('signals', { connection, defaultJobOptions: { removeOnComplete: true } });
      executionQueue = new Queue('executions', { connection, defaultJobOptions: { removeOnComplete: true } });
      auditQueue = new Queue('audit', { connection, defaultJobOptions: { removeOnComplete: true } });
      
      isDurable = true;
    } catch (e) {
      console.error('[QueueManager] [ERROR] Failed to start BullMQ cluster:', (e as any).message);
      isDurable = false;
      signalQueue = new LocalQueue('signals');
      executionQueue = new LocalQueue('executions');
      auditQueue = new LocalQueue('audit');
    }
  }

  // Error handling for queues
  [signalQueue, executionQueue, auditQueue].forEach((q) => {
    if (q && typeof q.on === 'function') {
      q.on('error', (err: any) => {
        const msg = err.message || '';
        if (process.env.NODE_ENV !== 'production' && (msg.includes('ECONNREFUSED') || msg.includes('closed'))) return;
        console.error(`[QueueManager] [ERROR] ${q.name} Queue Error: ${msg}`);
      });
    }
  });
}

/**
 * Institutional Queue Manager Proxy
 */
export const queueManager = {
  async addSignal(type: string, data: any, options = {}) {
    if (!signalQueue) initQueueManager();
    return signalQueue.add(type, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      ...options
    });
  },

  async addExecution(order: any, options = {}) {
    if (!executionQueue) initQueueManager();
    return executionQueue.add('execute', order, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 500 },
      ...options
    });
  },

  async addAuditLog(event: any) {
    if (!auditQueue) initQueueManager();
    return auditQueue.add('log', event, {
      removeOnComplete: true,
      removeOnFail: 1000
    });
  },

  async getQueueMetrics() {
    if (!signalQueue) initQueueManager();
    return {
      signals: await signalQueue.getJobCounts('waiting', 'active', 'delayed'),
      executions: await executionQueue.getJobCounts('waiting', 'active', 'delayed'),
    };
  }
};
