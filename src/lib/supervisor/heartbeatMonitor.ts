import { redis } from '../redis.ts';

export interface Heartbeat {
  workerId: string;
  type: string;
  status: string;
  cpu: number;
  memory: number;
  timestamp: number;
  nodeId?: string;
}

const HEARTBEAT_HASH = 'tradex:runtime:heartbeats';
const STALE_THRESHOLD_MS = 3000;

/**
 * Heartbeat Monitor
 * 
 * Tracks the health of distributed workers and identifies stalls or crashes.
 */
export const heartbeatMonitor = {
  /**
   * Called by workers to check in periodically
   */
  async checkIn(workerId: string, data: Partial<Heartbeat>) {
    try {
      const payload = {
        workerId,
        timestamp: Date.now(),
        ...data
      };
      await redis.hset(HEARTBEAT_HASH, workerId, JSON.stringify(payload));
    } catch (e) {
      console.error('[Heartbeat] Failed check-in for:', workerId, e);
    }
  },

  /**
   * Scans all workers and returns IDs of those that are unresponsive
   */
  async getUnhealthyWorkers(): Promise<string[]> {
    try {
      const all = await redis.hgetall(HEARTBEAT_HASH);
      const now = Date.now();
      const unhealthy: string[] = [];

      for (const [workerId, raw] of Object.entries(all)) {
        const hb = JSON.parse(raw as string);
        if (now - hb.timestamp > STALE_THRESHOLD_MS) {
          unhealthy.push(workerId);
        }
      }
      return unhealthy;
    } catch (e) {
      console.error('[Heartbeat] Health scan failed:', e);
      return [];
    }
  },

  /**
   * Cleanly remove a worker (on graceful stop)
   */
  async clearHeartbeat(workerId: string) {
    await redis.hdel(HEARTBEAT_HASH, workerId);
  },

  /**
   * Get full health snapshot
   */
  async getHealthSnapshot(): Promise<Record<string, Heartbeat>> {
    const all = await redis.hgetall(HEARTBEAT_HASH);
    const result: Record<string, Heartbeat> = {};
    for (const [id, raw] of Object.entries(all)) {
      result[id] = JSON.parse(raw as string);
    }
    return result;
  }
};
