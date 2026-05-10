import { redis } from '../redis.ts';
import type { SystemEvent, EventSeverity } from './eventBus.ts';

const LEDGER_KEY = 'tradex:ledger:events';
const MAX_LEDGER_SIZE = 100000; // Large history for forensic audits

export interface LedgerEvent extends SystemEvent {
  id: string; // Redis Stream ID (timestamp-counter)
  version: number;
  causationId?: string; // What caused this?
  correlationId?: string; // The root trigger (e.g. signal)
}

/**
 * Event Store (The Ledger)
 * 
 * Provides an immutable, append-only history of every state change
 * in the platform. Supports range queries for replay and audits.
 */
class EventStore {
  
  /**
   * Append a new event to the ledger
   */
  async append(event: SystemEvent, causationId?: string, correlationId?: string): Promise<string> {
    const timestamp = event.timestamp || Date.now();
    
    // We use a simplified versioning for now, in a real system this would be 
    // tracked per Aggregate (e.g. per Position or per Account)
    const version = 1; 

    try {
      const id = await redis.xAdd(LEDGER_KEY, '*', {
        type: event.eventType,
        source: event.source,
        severity: event.severity,
        payload: JSON.stringify(event.payload),
        strategyId: event.strategyId || '',
        timestamp: timestamp.toString(),
        version: version.toString(),
        causationId: causationId || '',
        correlationId: correlationId || ''
      }, {
        TRIM: {
          strategy: 'MAXLEN',
          strategyModifier: '~',
          threshold: MAX_LEDGER_SIZE
        }
      });

      return id;
    } catch (e) {
      console.error('[EventStore] Failed to append to ledger:', e);
      throw e;
    }
  }

  /**
   * Read events for replay
   */
  async getRange(start: string = '-', end: string = '+', count?: number): Promise<LedgerEvent[]> {
    try {
      const results = await redis.xRange(LEDGER_KEY, start, end, count ? { COUNT: count } : undefined);
      
      return results.map(r => ({
        id: r.id,
        eventType: r.message.type,
        source: r.message.source,
        severity: r.message.severity as EventSeverity,
        payload: JSON.parse(r.message.payload),
        strategyId: r.message.strategyId,
        timestamp: parseInt(r.message.timestamp),
        version: parseInt(r.message.version),
        causationId: r.message.causationId,
        correlationId: r.message.correlationId
      }));
    } catch (e) {
      console.error('[EventStore] Failed to read from ledger:', e);
      return [];
    }
  }

  /**
   * Get the last event ID for bookmarking
   */
  async getLastId(): Promise<string | null> {
    const info = await redis.xInfoStream(LEDGER_KEY).catch(() => null);
    return info?.lastGeneratedId || null;
  }
}

export const eventStore = new EventStore();
