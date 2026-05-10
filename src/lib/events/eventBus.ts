import { redis } from '../redis.ts';
import { EventEmitter } from 'events';

export type EventSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export type EventType = 
  | 'system.boot' 
  | 'system.halt'
  | 'strategy.started' 
  | 'strategy.stopped' 
  | 'strategy.rebalanced'
  | 'signal.received' 
  | 'signal.dropped'
  | 'risk.approved' 
  | 'risk.rejected'
  | 'execution.route' 
  | 'execution.retry' 
  | 'execution.filled' 
  | 'execution.failed'
  | 'ai.intent' 
  | 'ai.warning' 
  | 'ai.decision';

export interface SystemEvent {
  eventType: EventType | string; // Allow string for flexibility but prefer EventType
  source: string;
  severity: EventSeverity;
  payload: any;
  strategyId?: string;
  timestamp?: number;
}

const STREAM_KEY = 'tradex:events';
const MAX_STREAM_LENGTH = 10000; // Keep last 10k events in Redis

import { eventStore } from './eventStore.ts';

// ... (types kept same)

class EventBus extends EventEmitter {
  private useRedis = true;

  constructor() {
    super();
    this.checkRedis();
  }

  private checkRedis() {
    if ((redis as any).isMock || !redis.isOpen) {
      this.useRedis = false;
      console.log('[EventBus] Redis not available. Running in Local Mode.');
    }
  }

  /**
   * Publish an event to the platform's audit trail and event ledger.
   */
  async publish(event: SystemEvent, causationId?: string, correlationId?: string) {
    const timestamp = event.timestamp || Date.now();
    const eventData = {
      ...event,
      timestamp,
    };

    // Emit locally for real-time subscribers (UI, etc.)
    this.emit('event', eventData);

    // ── DURABLE SINK ───────────────────────────────────────────
    // 1. Push to the Immutable Ledger (Event Sourcing Source of Truth)
    let ledgerId = '';
    if (this.useRedis) {
      try {
        ledgerId = await eventStore.append(event, causationId, correlationId);
      } catch (e) {
        console.error('[EventBus] Ledger append failed:', e);
      }
    }

    // 2. Push to the Audit Pipeline (PostgreSQL via BullMQ)
    import('../queueManager.ts').then(({ queueManager }) => {
      queueManager.addAuditLog({ 
        ...eventData, 
        ledgerId,
        payload: JSON.stringify(event.payload) 
      }).catch(err => {
        console.error('[EventBus] Audit queue push failed:', err.message);
      });
    });

    return ledgerId;
  }

  /**
   * Utility for easy publishing
   */
  emitEvent(type: EventType | string, source: string, severity: EventSeverity, payload: any, strategyId?: string) {
    return this.publish({ eventType: type, source, severity, payload, strategyId });
  }
}

export const eventBus = new EventBus();
