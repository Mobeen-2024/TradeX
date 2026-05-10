import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { isRedisMock } from './redis.ts';
import { EventEmitter } from 'events';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Local Ephemeral Queue for offline development
class LocalQueue extends EventEmitter {
  constructor(public name: string) {
    super();
  }
  async add(jobName: string, data: any, options: any = {}) {
    // console.log(`[QueueManager:Local] Job added to ${this.name}: ${jobName}`);
    const job = { id: `local-${Math.random().toString(36).substr(2, 9)}`, name: jobName, data, opts: options };
    // Emit for local workers to consume
    setImmediate(() => this.emit('job', job));
    return job;
  }
  async getJobCounts() {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}

let connection: IORedis | null = null;
export let signalQueue: any = null;
export let executionQueue: any = null;
export let auditQueue: any = null;
export let isDurable = false;

/**
 * Initialize the Queue Layer
 */
export function initQueueManager() {
  if (isRedisMock()) {
    console.log('[QueueManager] ⚡ Redis unavailable. Enabling Ephemeral Local Queue Mode.');
    isDurable = false;
    signalQueue = new LocalQueue('signals');
    executionQueue = new LocalQueue('executions');
    auditQueue = new LocalQueue('audit');
  } else {
    try {
      console.log('[QueueManager] 🛠️  Redis detected. Initializing Durable BullMQ clusters.');
      connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
      
      connection.on('error', (err: any) => {
        if (process.env.NODE_ENV !== 'production' && err.code === 'ECONNREFUSED') return;
        console.error('[QueueManager] Redis Connection Error:', err.message);
      });

      signalQueue = new Queue('signals', { connection });
      executionQueue = new Queue('executions', { connection });
      auditQueue = new Queue('audit', { connection });
      isDurable = true;
    } catch (e) {
      console.warn('[QueueManager] Failed to init BullMQ, falling back to Local Mode:', (e as any).message);
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
        console.error(`[QueueManager] ${q.name} Error: ${msg}`);
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
