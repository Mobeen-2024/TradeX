import { db } from '../db.ts';
import type { EventType } from './eventBus.ts';

export interface ReconstructedState {
  strategyId: string;
  status: 'IDLE' | 'RUNNING' | 'HALTED' | 'UNKNOWN';
  signalsReceived: number;
  ordersRouted: number;
  ordersFilled: number;
  ordersRejected: number;
  totalNotionalFilled: number;
  lastEventTimestamp: Date | null;
  warnings: string[];
  recentDecisions: any[];
}

/**
 * State Replayer
 * 
 * Implements the core Event Sourcing 'Time Travel' logic.
 * Fetches events from the database and reduces them into a deterministic state.
 */
export class StateReplayer {
  
  /**
   * Reconstruct the state of a strategy at a specific point in time.
   */
  async reconstruct(strategyId: string, targetTime: Date = new Date()): Promise<ReconstructedState> {
    console.log(`[StateReplayer] 🕒 Reconstructing state for ${strategyId} up to ${targetTime.toISOString()}`);

    // 1. Fetch all events for this strategy ordered by time
    const events = await (db as any).auditEvent.findMany({
      where: {
        strategyId,
        timestamp: { lte: targetTime }
      },
      orderBy: { timestamp: 'asc' }
    });

    // 2. Initial State (The 'Zero' state)
    const state: ReconstructedState = {
      strategyId,
      status: 'UNKNOWN',
      signalsReceived: 0,
      ordersRouted: 0,
      ordersFilled: 0,
      ordersRejected: 0,
      totalNotionalFilled: 0,
      lastEventTimestamp: null,
      warnings: [],
      recentDecisions: []
    };

    // 3. Reduction Loop (The Event Sourcing Core)
    for (const event of events) {
      const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
      const type = event.eventType as EventType;

      state.lastEventTimestamp = event.timestamp;

      switch (type) {
        case 'strategy.started':
          state.status = 'RUNNING';
          break;
        
        case 'strategy.stopped':
          state.status = 'IDLE';
          break;

        case 'signal.received':
          state.signalsReceived++;
          break;

        case 'risk.approved':
          // Optional: handle pre-approval state if needed
          break;

        case 'risk.rejected':
          state.ordersRejected++;
          state.warnings.push(`Risk rejection: ${payload.reason || 'Unknown reason'}`);
          break;

        case 'execution.route':
          state.ordersRouted++;
          break;

        case 'execution.filled':
          state.ordersFilled++;
          if (payload.qty && payload.price) {
            state.totalNotionalFilled += payload.qty * payload.price;
          }
          break;

        case 'execution.failed':
          state.ordersRejected++;
          state.warnings.push(`Execution failure for order ${payload.parentId || 'unknown'}`);
          break;

        case 'ai.decision':
          state.recentDecisions.push({
            timestamp: event.timestamp,
            action: payload.action,
            reason: payload.reason
          });
          // Keep only last 5 decisions for state view
          if (state.recentDecisions.length > 5) state.recentDecisions.shift();
          break;

        case 'ai.warning':
          state.warnings.push(`AI Warning: ${payload.message || JSON.stringify(payload)}`);
          break;
      }
    }

    return state;
  }

  /**
   * Debugging: Compare current runtime state with replayed state to detect 'Amnesia' bugs.
   */
  async verifyIntegrity(strategyId: string, currentRuntimeState: any): Promise<{ match: boolean; diff: string[] }> {
    const replayed = await this.reconstruct(strategyId);
    const diff: string[] = [];

    // Simple integrity checks
    if (replayed.ordersFilled !== currentRuntimeState.ordersFilled) {
      diff.push(`Order mismatch: Replayed=${replayed.ordersFilled}, Runtime=${currentRuntimeState.ordersFilled}`);
    }

    return {
      match: diff.length === 0,
      diff
    };
  }
}

export const stateReplayer = new StateReplayer();
