import { db } from '../lib/db.ts';
import { eventBus, SystemEvent } from '../lib/events/eventBus.ts';

const BATCH_SIZE = 50;
const FLUSH_INTERVAL = 5000; // 5 seconds

class EventArchiver {
  private buffer: any[] = [];
  private flushTimer: any = null;

  constructor() {
    this.start();
  }

  private start() {
    console.log('[EventArchiver] [INFO] Background sink active.');
    
    // Listen to the event bus
    eventBus.on('event', (event: any) => {
      this.addToBuffer(event);
    });

    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
  }

  private addToBuffer(event: any) {
    this.buffer.push({
      eventType: event.eventType,
      source: event.source,
      severity: event.severity,
      payload: JSON.parse(event.payload),
      strategyId: event.strategyId || null,
      timestamp: new Date(event.timestamp)
    });

    if (this.buffer.length >= BATCH_SIZE) {
      this.flush();
    }
  }

  private async flush() {
    if (this.buffer.length === 0) return;

    const eventsToSave = [...this.buffer];
    this.buffer = [];

    try {
      // Use raw prisma for speed or just createMany
      // Note: SQLite doesn't support createMany in some versions, but standard Prisma does.
      // We'll loop to be safe for SQLite local dev or use createMany if supported.
      await (db as any).auditEvent.createMany({
        data: eventsToSave
      });
      
      if (eventsToSave.length > 0) {
        console.log(`[EventArchiver] [INFO] Archived ${eventsToSave.length} events to database.`);
      }
    } catch (e) {
      console.error('[EventArchiver] Flush failed. Returning events to buffer.', e);
      this.buffer.unshift(...eventsToSave);
    }
  }

  stop() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
  }
}

export const eventArchiver = new EventArchiver();
