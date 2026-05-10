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

class EventBus extends EventEmitter {
  private useRedis = true;

  constructor() {
    super();
    this.checkRedis();
  }

  private checkRedis() {
    // If redis is in mock mode or disconnected, we stay in local EventEmitter mode
    if ((redis as any).isMock || !redis.isOpen) {
      this.useRedis = false;
      console.log('[EventBus] Redis not available. Running in Local Mode.');
    }
  }

  /**
   * Publish an event to the platform's audit trail.
   */
  async publish(event: SystemEvent) {
    const timestamp = event.timestamp || Date.now();
    const eventData = {
      ...event,
      timestamp,
      payload: JSON.stringify(event.payload)
    };

    // Emit locally for real-time subscribers (UI, etc.)
    this.emit('event', eventData);

    // ── DURABLE SINK ───────────────────────────────────────────
    // Push to BullMQ for persistent ingestion to PostgreSQL
    import('../queueManager.ts').then(({ queueManager }) => {
      queueManager.addAuditLog(eventData).catch(err => {
        console.error('[EventBus] Durable queue push failed:', err.message);
      });
    });

    if (this.useRedis) {
      try {
        // XADD key MAXLEN ~ 10000 * eventType source severity payload strategyId timestamp
        await redis.xAdd(STREAM_KEY, '*', {
          type: event.eventType,
          source: event.source,
          severity: event.severity,
          payload: eventData.payload,
          strategyId: event.strategyId || '',
          timestamp: timestamp.toString()
        }, {
          TRIM: {
            strategy: 'MAXLEN',
            strategyModifier: '~',
            threshold: MAX_STREAM_LENGTH
          }
        });
      } catch (e) {
        console.error('[EventBus] Redis publish failed, falling back to local only:', e);
        this.useRedis = false;
      }
    }
  }

  /**
   * Utility for easy publishing
   */
  emitEvent(type: EventType, source: string, severity: EventSeverity, payload: any, strategyId?: string) {
    return this.publish({ eventType: type, source, severity, payload, strategyId });
  }
}

export const eventBus = new EventBus();
