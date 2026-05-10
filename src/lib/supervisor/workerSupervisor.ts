import { StrategyType, workerManager } from '../workerManager.ts';
import { eventBus } from '../events/eventBus.ts';

export type SupervisionPolicy = 'one_for_one' | 'one_for_all' | 'rest_for_one';

export interface SupervisorConfig {
  name: string;
  policy: SupervisionPolicy;
  restartLimit?: number;
  restartWindowMs?: number;
}

/**
 * WorkerSupervisor (Erlang/OTP inspired)
 * 
 * Manages a logical group of workers (Fault Domain).
 * If a worker in this group fails, the supervisor handles the restart
 * based on the defined policy.
 */
export class WorkerSupervisor {
  public name: string;
  public policy: SupervisionPolicy;
  private children: Set<string> = new Set(); // workerIds
  private restartLimit: number;
  private restartWindowMs: number;
  private failureHistory: Map<string, number[]> = new Map(); // workerId -> timestamps of failures
  private restartCounts: Map<string, number> = new Map(); // workerId -> total restarts

  constructor(config: SupervisorConfig) {
    this.name = config.name;
    this.policy = config.policy || 'one_for_one';
    this.restartLimit = config.restartLimit || 5;
    this.restartWindowMs = config.restartWindowMs || 60000;
    
    console.log(`[Supervisor:${this.name}] [INFO] Supervision Tree Node Active (Policy: ${this.policy})`);
  }

  /**
   * Register an existing worker under this supervisor
   */
  public addChild(workerId: string) {
    this.children.add(workerId);
    console.log(`[Supervisor:${this.name}] [INFO] Adopting child worker: ${workerId}`);
  }

  /**
   * Start and adopt a new worker
   */
  public async spawnChild(type: StrategyType, config: Record<string, any>, initialState: any = null): Promise<string> {
    const workerId = await workerManager.start(type, config, initialState);
    this.addChild(workerId);
    return workerId;
  }

  /**
   * Handle a child failure
   */
  public async handleChildFailure(workerId: string, type: StrategyType, config: any) {
    if (!this.children.has(workerId)) return;

    console.warn(`[Supervisor:${this.name}] [WARN] Child failure detected: ${workerId} (${type})`);
    
    const now = Date.now();
    const history = this.failureHistory.get(workerId) || [];
    const recentFailures = history.filter(ts => now - ts < this.restartWindowMs);
    
    if (recentFailures.length >= this.restartLimit) {
      console.error(`[Supervisor:${this.name}] [ERROR] CRITICAL: Child ${workerId} reached restart limit. Quarantining.`);
      eventBus.emitEvent('supervisor.quarantine', this.name, 'CRITICAL', { workerId, type, name: this.name });
      return;
    }

    recentFailures.push(now);
    this.failureHistory.set(workerId, recentFailures);
    
    // Increment total restarts
    const total = (this.restartCounts.get(workerId) || 0) + 1;
    this.restartCounts.set(workerId, total);

    // Policy Execution
    switch (this.policy) {
      case 'one_for_one':
        await this.restartWorker(workerId, type, config);
        break;
      
      case 'one_for_all':
        console.warn(`[Supervisor:${this.name}] [WARN] Policy 'one_for_all' triggered. Restarting ALL children.`);
        await this.restartAll();
        break;

      default:
        await this.restartWorker(workerId, type, config);
    }
  }

  private async restartWorker(workerId: string, type: StrategyType, config: any) {
    console.log(`[Supervisor:${this.name}] [INFO] Restarting child ${workerId}...`);
    // Note: In a real system, we'd recover the state from a snapshot here
    this.children.delete(workerId);
    const newId = await this.spawnChild(type, config);
    return newId;
  }

  public async restartAll() {
    const currentChildren = Array.from(this.children);
    // We would need to know the types and configs here. 
    // For now, this is a structural skeleton.
    console.log(`[Supervisor:${this.name}] [INFO] Batch restart of ${currentChildren.length} children initiated.`);
  }

  public async stopAll() {
    for (const id of this.children) {
      await workerManager.stop(id);
    }
    this.children.clear();
  }

  public getChildren() {
    return Array.from(this.children);
  }

  public getRestartCounts() {
    return Object.fromEntries(this.restartCounts);
  }
}
