import { workerManager, StrategyType } from '../workerManager.ts';
import { heartbeatMonitor } from './heartbeatMonitor.ts';
import { redis, KEYS, getGlobalState } from '../redis.ts';
import { queueManager } from '../queueManager.ts';
import { eventBus } from '../events/eventBus.ts';
import { circuitBreakers } from '../circuitBreaker.ts';
import { WorkerSupervisor } from './workerSupervisor.ts';

const RECONCILIATION_INTERVAL = 5000; // 5 seconds
const SCALE_OUT_THRESHOLD = 50; // signals in queue

/**
 * Root Runtime Supervisor
 * 
 * Orchestrates child supervisors (Fault Domains) using an Erlang-style tree.
 * 
 * Tree Hierarchy:
 * Runtime Supervisor (Root)
 *     ├── Market Supervisor (volatility_agent, sentiment_agent)
    │      └── Policy: One-for-One
 *     └── Execution Supervisor (ai_analytics, macro_agent)
 *         └── Policy: One-for-One
 */
class RuntimeOrchestrator {
  private timer: any = null;
  private isProcessing = false;
  
  // Child Supervisors
  public marketSupervisor: WorkerSupervisor;
  public executionSupervisor: WorkerSupervisor;

  constructor() {
    this.marketSupervisor = new WorkerSupervisor({
      name: 'Market_Supervisor',
      policy: 'one_for_one'
    });

    this.executionSupervisor = new WorkerSupervisor({
      name: 'Execution_Supervisor',
      policy: 'one_for_one'
    });

    this.start();
  }

  private start() {
    console.log('[Orchestrator] [INFO] ☸️  Root Runtime Supervisor active (Supervision Tree Mode).');
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
      const actualWorkers = workerManager.list();
      const unhealthyIds = await heartbeatMonitor.getUnhealthyWorkers();
      const metrics = await queueManager.getQueueMetrics();
      
      const health = await heartbeatMonitor.getHealthSnapshot(new Set());

      // ── 2. SELF-HEALING (Supervised Recovery) ──────────────────
      for (const workerId of unhealthyIds) {
        const entry = actualWorkers.find(w => w.id === workerId);
        if (entry && entry.status === 'running') {
          console.warn(`[Orchestrator] [WARN] 🚨 Unhealthy worker detected: ${workerId} (${entry.type}). Handing off to supervisor.`);
          
          // Route to appropriate supervisor
          if (entry.type === 'volatility_agent' || entry.type === 'sentiment_agent') {
            await this.marketSupervisor.handleChildFailure(workerId, entry.type, entry.config);
          } else if (entry.type === 'ai_analytics' || entry.type === 'macro_agent') {
            await this.executionSupervisor.handleChildFailure(workerId, entry.type, entry.config);
          } else {
            // Default recovery for unassigned workers
            await this.simpleRestart(workerId, entry.type as StrategyType, entry.config);
          }
        }
      }

      // ── 3. DYNAMIC SCALING ───────────────────────────────────────
      if (metrics.signals.waiting > SCALE_OUT_THRESHOLD) {
        console.warn(`[Orchestrator] [WARN] 📈 High queue pressure detected (${metrics.signals.waiting}). Scaling execution layer...`);
        const analyticsCount = actualWorkers.filter(w => w.type === 'ai_analytics').length;
        if (analyticsCount < 5) {
          await this.executionSupervisor.spawnChild('ai_analytics', { symbol: 'btcusdt' });
        }
      }

      // ── 4. OPS CENTER METRICS ───────────────────────────────────
      const blackboard = await getGlobalState();
      const restartCounts = {
        ...this.marketSupervisor.getRestartCounts(),
        ...this.executionSupervisor.getRestartCounts()
      };
      
      const memoryUsage = process.memoryUsage();
      const memoryPressure = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      // ── 5. VISUALIZATION STREAM ──────────────────────────────
      workerManager.broadcast({
        type: 'runtime_health_update',
        health,
        metrics,
        timestamp: Date.now(),
        ops: {
          restartCounts,
          memoryPressure,
          blackboardSummary: {
            price: blackboard.price || '0',
            activePositions: (await redis.hlen(KEYS.positions)) || 0,
            circuitBreakers: Object.keys(circuitBreakers).length
          },
          uptime: process.uptime(),
          eventThroughput: 0 // Placeholder: To be implemented via EventBus tracking
        },
        tree: {
          market: this.marketSupervisor.getChildren(),
          execution: this.executionSupervisor.getChildren()
        }
      });
      
    } catch (e) {
      console.error('[Orchestrator] [ERROR] ❌ Reconciliation loop error:', e);
    } finally {
      this.isProcessing = false;
    }
  }

  private async simpleRestart(workerId: string, type: StrategyType, config: any) {
    console.warn(`[Orchestrator] [WARN] ♻️  Simple restart for unmanaged worker: ${workerId}`);
    try {
      await workerManager.stop(workerId);
    } catch {}
    await workerManager.start(type, config);
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
    this.marketSupervisor.stopAll();
    this.executionSupervisor.stopAll();
  }
}

export const runtimeOrchestrator = new RuntimeOrchestrator();
