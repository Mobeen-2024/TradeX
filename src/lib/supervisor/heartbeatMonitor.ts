import { redis, KEYS } from '../redis.ts';

export type WorkerHealthState = 'HEALTHY' | 'DEGRADED' | 'STALLING' | 'UNRESPONSIVE' | 'QUARANTINED';

export interface Heartbeat {
  workerId: string;
  type: string;
  status: string;
  cpu: number;
  memory: number;
  errorCount: number;
  latencyMs: number;
  timestamp: number;
  nodeId?: string;
  state?: WorkerHealthState;
}

const HEARTBEAT_HASH = KEYS.workerHeartbeats;
const STALE_THRESHOLD_MS = 5000;
const STALL_THRESHOLD_MS = 2000;

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
        cpu: 0,
        memory: 0,
        errorCount: 0,
        latencyMs: 0,
        ...data
      };
      await redis.hset(HEARTBEAT_HASH, workerId, JSON.stringify(payload));
    } catch (e) {
      console.error('[Heartbeat] Failed check-in for:', workerId, e);
    }
  },

  /**
   * Derives health state based on multi-factor metrics
   */
  classifyHealth(hb: Heartbeat, isQuarantined: boolean): WorkerHealthState {
    if (isQuarantined) return 'QUARANTINED';
    
    const now = Date.now();
    const age = now - hb.timestamp;

    if (age > STALE_THRESHOLD_MS) return 'UNRESPONSIVE';
    if (age > STALL_THRESHOLD_MS) return 'STALLING';
    
    // Performance-based degradation
    if (hb.cpu > 90) return 'DEGRADED'; // CPU Saturation
    if (hb.errorCount > 10) return 'DEGRADED'; // High Error Rate
    if (hb.latencyMs > 500) return 'DEGRADED'; // Throughput bottleneck

    return 'HEALTHY';
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
   * Get full health snapshot with classified states
   */
  async getHealthSnapshot(quarantinedIds: Set<string> = new Set()): Promise<Record<string, Heartbeat>> {
    const all = await redis.hgetall(HEARTBEAT_HASH);
    const result: Record<string, Heartbeat> = {};
    for (const [id, raw] of Object.entries(all)) {
      const hb = JSON.parse(raw as string);
      hb.state = this.classifyHealth(hb, quarantinedIds.has(id));
      result[id] = hb;
    }
    return result;
  }
};
