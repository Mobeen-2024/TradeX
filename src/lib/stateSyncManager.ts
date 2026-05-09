import { redis, KEYS } from './redis.ts';
import { randomUUID } from 'crypto';

export interface RuntimeLog {
  id: string;
  strategyId: string;
  level: 'INFO' | 'EXEC' | 'ERROR' | 'WARN';
  message: string;
  nodeId?: string;
  data?: any;
  timestamp: number;
}

/**
 * Production-Grade State Synchronization Manager
 * 
 * Handles mirroring of the sub-millisecond AI runtime state into Redis
 * to ensure sub-second recovery after service failure.
 */
export const stateSyncManager = {
  /**
   * Hot-swaps the strategy config and metadata in Redis
   */
  async snapshotStrategy(strategy: any) {
    try {
      await redis.hset('tradex:runtime:strategies', strategy.id, JSON.stringify({
        ...strategy,
        updatedAt: Date.now()
      }));
    } catch (e) {
      console.error('[SyncManager] Failed to snapshot strategy:', strategy.id, e);
    }
  },

  /**
   * Mirrors specific node execution states (e.g. for long-running nodes)
   */
  async snapshotNodeState(strategyId: string, nodeId: string, state: any) {
    try {
      await redis.hset(`tradex:runtime:nodes:${strategyId}`, nodeId, JSON.stringify(state));
    } catch (e) {
      console.error('[SyncManager] Failed to snapshot node state:', strategyId, nodeId, e);
    }
  },

  /**
   * Pushes a runtime log to a Redis list for async persistence worker
   */
  async queueLog(strategyId: string, level: RuntimeLog['level'], message: string, nodeId?: string, data?: any) {
    try {
      const log: RuntimeLog = {
        id: randomUUID().split('-')[0],
        strategyId,
        level,
        message,
        nodeId,
        data,
        timestamp: Date.now()
      };
      await redis.lpush('tradex:runtime:logs', JSON.stringify(log));
      
      // Keep only last 1000 logs in Redis hot-list per strategy to prevent memory bloat
      // Note: PostgreSQL handles the full history
      await redis.ltrim('tradex:runtime:logs', 0, 5000); 
    } catch (e) {
      console.error('[SyncManager] Failed to queue log:', message, e);
    }
  },

  /**
   * Updates the global portfolio metrics snapshot
   */
  async snapshotMetrics(metrics: any) {
    try {
      await redis.hset(KEYS.globalState, 'metrics', JSON.stringify(metrics));
    } catch (e) {
      console.error('[SyncManager] Failed to snapshot metrics:', e);
    }
  },

  /**
   * Records a new advisory (AI intervention)
   */
  async snapshotAdvisory(advisory: any) {
    try {
      await redis.lpush(`tradex:runtime:advisories:${advisory.strategyId}`, JSON.stringify(advisory));
    } catch (e) {
      console.error('[SyncManager] Failed to snapshot advisory:', e);
    }
  }
};
