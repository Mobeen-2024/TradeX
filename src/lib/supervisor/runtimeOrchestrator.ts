import { workerManager, StrategyType } from '../workerManager.ts';
import { heartbeatMonitor } from './heartbeatMonitor.ts';
import { redis, KEYS } from '../redis.ts';
import { queueManager } from '../queueManager.ts';

const RECONCILIATION_INTERVAL = 5000; // 5 seconds
const SCALE_OUT_THRESHOLD = 50; // signals in queue

interface FailureMetrics {
  attempts: number;
  lastFailure: number;
  quarantined: boolean;
}

/**
 * Runtime Supervisor Orchestrator
 * 
 * A Kubernetes-style control loop that ensures the platform's execution state
 * matches the desired configuration. Handles self-healing and zombie detection.
 * Includes 'Circuit Breaker' protection to prevent infinite restart loops.
 */
class RuntimeOrchestrator {
  private timer: any = null;
  private isProcessing = false;
  private failureRegistry = new Map<string, FailureMetrics>();

  // Protection Constants
  private readonly RESTART_LIMIT = 5;
  private readonly RESTART_WINDOW_MS = 60000; // 1 minute
  private readonly QUARANTINE_COOLDOWN_MS = 300000; // 5 minutes

  constructor() {
    this.start();
  }

  private start() {
    console.log('[Orchestrator] ☸️  Distributed Supervisor active (Loop: 5s, Protection: ON).');
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
   * Cull and Respawn protocol with Circuit Breaker protection.
   */
  private async restartWorker(workerId: string, type: StrategyType) {
    try {
      // 1. Get last known config for this worker
      const workersRaw = await redis.get(KEYS.workerRegistry);
      if (!workersRaw) return;
      const workers = JSON.parse(workersRaw);
      const metadata = workers[workerId];

      if (!metadata) return;

      // 2. Identify the logical worker (Signature) to track its history
      const config = metadata.config || {};
      const signature = `${type}:${config.symbol || 'global'}`;
      
      const now = Date.now();
      const metrics = this.failureRegistry.get(signature) || { attempts: 0, lastFailure: 0, quarantined: false };

      // 3. Check for Quarantine
      if (metrics.quarantined) {
        if (now - metrics.lastFailure > this.QUARANTINE_COOLDOWN_MS) {
          console.log(`[Orchestrator] 🧊 Quarantine expired for ${signature}. Retrying...`);
          metrics.quarantined = false;
          metrics.attempts = 0;
        } else {
          console.warn(`[Orchestrator] 🛡️  Quarantine Active: Skipping restart for ${signature}.`);
          return;
        }
      }

      // 4. Track Failures within Window
      if (now - metrics.lastFailure < this.RESTART_WINDOW_MS) {
        metrics.attempts++;
      } else {
        metrics.attempts = 1; // Reset window
      }
      metrics.lastFailure = now;

      // 5. Threshold Protection (Circuit Breaker)
      if (metrics.attempts >= this.RESTART_LIMIT) {
        metrics.quarantined = true;
        this.failureRegistry.set(signature, metrics);
        
        const errorMsg = `CRITICAL: Worker ${signature} quarantined after ${metrics.attempts} failures in 60s. Infinite loop suspected.`;
        console.error(`[Orchestrator] ⛔ ${errorMsg}`);
        
        // Emit institutional event for UI alerting
        const { eventBus } = await import('../events/eventBus.ts');
        eventBus.emitEvent('ai.warning', 'supervisor', 'CRITICAL', {
          msg: errorMsg,
          signature,
          attempts: metrics.attempts
        });
        return;
      }

      this.failureRegistry.set(signature, metrics);

      // 6. Hard kill the worker thread
      try {
        await workerManager.stop(workerId);
      } catch (e) {
        // Already dead
      }

      // 7. Clear stale health state
      await heartbeatMonitor.clearHeartbeat(workerId);

      // 8. Fetch last snapshot for state recovery
      const snapshotRaw = await redis.hget(KEYS.runtimeSnapshots, workerId);
      const snapshot = snapshotRaw ? JSON.parse(snapshotRaw) : null;

      console.warn(`[Orchestrator] ♻️  Respawning zombie ${workerId} (${type}). Attempts: ${metrics.attempts}/${this.RESTART_LIMIT}`);
      await workerManager.start(type, config, snapshot);

    } catch (e) {
      console.error(`[Orchestrator] Failed to restart ${workerId}:`, e);
    }
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
  }
}

export const runtimeOrchestrator = new RuntimeOrchestrator();
