import { workerManager, StrategyType } from '../workerManager.ts';
import { heartbeatMonitor } from './heartbeatMonitor.ts';
import { redis, KEYS } from '../redis.ts';
import { queueManager } from '../queueManager.ts';

const RECONCILIATION_INTERVAL = 5000; // 5 seconds
const SCALE_OUT_THRESHOLD = 50; // signals in queue

/**
 * Runtime Supervisor Orchestrator
 * 
 * A Kubernetes-style control loop that ensures the platform's execution state
 * matches the desired configuration. Handles self-healing and zombie detection.
 */
class RuntimeOrchestrator {
  private timer: any = null;
  private isProcessing = false;

  constructor() {
    this.start();
  }

  private start() {
    console.log('[Orchestrator] ☸️  Distributed Supervisor active (Control Loop: 5s).');
    this.timer = setInterval(() => this.reconcile(), RECONCILIATION_INTERVAL);
  }

  /**
   * The Reconciliation Loop: Observe -> Diff -> Act
   */
  private async reconcile() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // ── 1. OBSERVE ───────────────────────────────────────────
      // Get current running instances and their health status
      const actualWorkers = workerManager.list();
      const unhealthyIds = await heartbeatMonitor.getUnhealthyWorkers();
      const metrics = await queueManager.getQueueMetrics();

      // ── 2. DIFF & ACT (Self-Healing) ──────────────────────────
      for (const workerId of unhealthyIds) {
        // A worker that stopped heartbeating but is still in our 'running' list is a zombie
        const entry = actualWorkers.find(w => w.id === workerId);
        if (entry && entry.status === 'running') {
          console.warn(`[Orchestrator] 🚨 Zombie detected: ${workerId} (${entry.type}). Restarting...`);
          await this.restartWorker(workerId, entry.type as StrategyType);
        }
      }

      // ── 3. SCALE & REBALANCE (Dynamic HPA) ────────────────────
      if (metrics.signals.waiting > SCALE_OUT_THRESHOLD) {
        console.warn(`[Orchestrator] 📈 High signal load: ${metrics.signals.waiting}. Auto-scaling...`);
        // Example: If signals pile up, ensure we have an extra analytics instance
        const analyticsCount = actualWorkers.filter(w => w.type === 'ai_analytics').length;
        if (analyticsCount < 3) {
          console.log(`[Orchestrator] 🚀 Scaling: Adding ai_analytics instance...`);
          await workerManager.start('ai_analytics', { symbol: 'btcusdt' });
        }
      }

      // ── 4. VISUALIZATION STREAM ──────────────────────────────
      // Emit full health snapshot for the Runtime Graph
      const health = await heartbeatMonitor.getHealthSnapshot();
      workerManager.broadcast({
        type: 'runtime_health_update',
        health,
        metrics,
        timestamp: Date.now()
      });
      
    } catch (e) {
      console.error('[Orchestrator] ❌ Reconciliation loop error:', e);
    } finally {
      this.isProcessing = false;
    }
  }


  /**
   * Cull and Respawn protocol
   */
  private async restartWorker(workerId: string, type: StrategyType) {
    try {
      // 1. Get last known config for this worker from Redis registry
      const workersRaw = await redis.get(KEYS.workerRegistry);
      if (!workersRaw) return;
      const workers = JSON.parse(workersRaw);
      const metadata = workers[workerId];

      if (metadata) {
        // 2. Hard kill the worker thread
        try {
          await workerManager.stop(workerId);
        } catch (e) {
          // Worker might already be dead/exited
        }

        // 3. Clear stale health state
        await heartbeatMonitor.clearHeartbeat(workerId);

        // 4. Fetch last snapshot for state recovery
        const snapshotRaw = await redis.hget(KEYS.runtimeSnapshots, workerId);
        const snapshot = snapshotRaw ? JSON.parse(snapshotRaw) : null;

        console.warn(`[Orchestrator] ♻️  Respawning zombie ${workerId} (${type}). Recovery state: ${snapshot ? 'AVAILABLE' : 'NONE'}`);
        await workerManager.start(type, metadata.config, snapshot);
      }
    } catch (e) {
      console.error(`[Orchestrator] Failed to restart ${workerId}:`, e);
    }
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
  }
}

export const runtimeOrchestrator = new RuntimeOrchestrator();
