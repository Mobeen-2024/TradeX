import { parentPort, workerData } from 'worker_threads';
import { eventBus, EventType, EventSeverity } from '../events/eventBus.ts';
import { heartbeatMonitor } from '../supervisor/heartbeatMonitor.ts';
import { blackboard } from './blackboard.ts';

/**
 * Base Agent Framework
 * 
 * All specialized agents (Sentiment, Volatility, etc.) should extend this.
 * It standardizes how agents talk to the system and each other.
 */
export abstract class BaseAgent {
  protected agentId: string;
  protected agentName: string;
  protected running: boolean = false;
  protected intervalMs: number = 5000;
  protected hbInterval?: NodeJS.Timeout;
  protected errorCount: number = 0;
  protected lastTaskDuration: number = 0;

  constructor(agentName: string) {
    this.agentName = agentName;
    // Use workerData ID if provided, otherwise generate
    this.agentId = (workerData as any)?.id || `agent_${agentName}_${Date.now()}`;
    
    this.setupMessageHandlers();
  }

  /**
   * Main agent logic loop - implemented by specific agents.
   */
  protected abstract task(): Promise<void>;

  /**
   * Start the agent
   */
  public async start() {
    if (this.running) return;
    this.running = true;
    
    this.log(`🚀 Agent ${this.agentName} starting...`, 'INFO');
    this.startHeartbeat();

    while (this.running) {
      const startTime = Date.now();
      try {
        await this.task();
        // Decay error count on success
        if (this.errorCount > 0) this.errorCount--;
      } catch (err: any) {
        this.errorCount++;
        this.log(`Error in agent task: ${err.message}`, 'ERROR');
      }
      this.lastTaskDuration = Date.now() - startTime;
      await new Promise(res => setTimeout(res, this.intervalMs));
    }
  }

  /**
   * Graceful stop
   */
  public async stop() {
    this.running = false;
    if (this.hbInterval) clearInterval(this.hbInterval);
    await heartbeatMonitor.clearHeartbeat(this.agentId);
    this.log(`🛑 Agent ${this.agentName} stopped.`, 'INFO');
  }

  /**
   * Helper to write findings to the global blackboard
   */
  protected async updateBlackboard(symbol: string, belief: any) {
    await blackboard.setBelief(symbol, this.agentName, belief);
  }

  /**
   * Helper to emit system-wide events
   */
  protected emit(type: EventType, severity: EventSeverity, payload: any, strategyId?: string) {
    eventBus.emitEvent(type, `agent:${this.agentName}`, severity, payload, strategyId);
  }

  /**
   * Internal logging
   */
  protected log(message: string, severity: EventSeverity = 'INFO') {
    console.log(`[Agent:${this.agentName}] ${message}`);
    // Also push to parent thread if available
    parentPort?.postMessage({
      type: 'log',
      worker: this.agentName,
      message
    });
  }

  private startHeartbeat() {
    this.hbInterval = setInterval(async () => {
      await heartbeatMonitor.checkIn(this.agentId, {
        type: `agent_${this.agentName}`,
        status: 'RUNNING',
        cpu: process.cpuUsage().user / 1000000,
        memory: process.memoryUsage().heapUsed / 1024 / 1024,
        errorCount: this.errorCount,
        latencyMs: this.lastTaskDuration
      });
    }, 2000);
  }

  private setupMessageHandlers() {
    parentPort?.on('message', async (msg) => {
      if (msg.type === 'stop') {
        await this.stop();
      } else if (msg.type === 'update_config') {
        this.onConfigUpdate(msg.config);
      }
    });
  }

  /**
   * Overridable config update handler
   */
  protected onConfigUpdate(config: any) {
    if (config.intervalMs) this.intervalMs = config.intervalMs;
    this.log(`Config updated: ${JSON.stringify(config)}`);
  }
}
