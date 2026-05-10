import { redis, KEYS, getPositions } from '../lib/redis.ts';

const CHECKPOINT_INTERVAL = 5000; // 5 seconds

/**
 * Runtime Snapshot Worker
 * 
 * Performs periodic checkpoints of the entire system state (strategies, nodes, risk)
 * to ensure deterministic recovery after a crash.
 */
class RuntimeSnapshotWorker {
  private timer: any = null;

  constructor() {
    this.start();
  }

  private async start() {
    console.log('[RuntimeSnapshot] [INFO] 💾 Checkpointing engine active (5s interval).');
    this.timer = setInterval(() => this.checkpoint(), CHECKPOINT_INTERVAL);
  }

  private async checkpoint() {
    try {
      // 1. Get active algorithm workers
      const workersRaw = await redis.get('tradex:workers');
      if (!workersRaw) return;
      const workers = JSON.parse(workersRaw);

      // 2. Get live positions
      const positions = await getPositions();

      // 3. Iterate through active strategies to snapshot state
      for (const [workerId, worker] of Object.entries(workers) as [string, any][]) {
        if (worker.status !== 'running') continue;

        const strategyId = worker.id;
        const strategyPositions = positions.filter(p => p.strategyId === strategyId || p.accountId === worker.config?.accountId);
        
        // Recover node-level states mirrored in Redis
        const nodeStates = await redis.hgetall(`tradex:runtime:nodes:${strategyId}`);
        
        // Recover account risk metrics
        const accountId = worker.config?.accountId || 'default';
        const riskRaw = await redis.hget('tradex:risk_profiles', accountId);
        const riskState = riskRaw ? JSON.parse(riskRaw) : {};

        const snapshot = {
          strategyId,
          type: worker.type,
          status: worker.status,
          activeTrades: strategyPositions.length,
          lastExecution: Date.now(),
          nodeStates,
          riskState,
          config: worker.config
        };

        // 4. Persist snapshots to Redis for hot-recovery
        const pipeline = redis.pipeline();
        
        // Generic lookup hash
        pipeline.hset(KEYS.runtimeSnapshots, strategyId, JSON.stringify(snapshot));
        
        // Specific individual keys as per institutional requirements
        pipeline.set(KEYS.runtimeStrategy(strategyId), JSON.stringify(snapshot));
        
        await pipeline.exec();
      }
      
    } catch (e) {
      console.error('[RuntimeSnapshot] ❌ Checkpoint failed:', e);
    }
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
  }
}

export const runtimeSnapshotWorker = new RuntimeSnapshotWorker();
