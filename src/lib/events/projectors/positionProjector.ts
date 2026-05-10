import { redis, KEYS } from '../../redis.ts';
import { LedgerEvent } from '../eventStore.ts';
import { eventBus } from '../eventBus.ts';

/**
 * Position Projector
 * 
 * Subscribes to the event stream and updates the 'tradex:positions' 
 * state hash. This ensures that the state is a deterministic 
 * projection of the event ledger.
 */
export class PositionProjector {
  private lastId: string = '0-0';

  constructor() {
    this.start();
  }

  private async start() {
    console.log('[Projector:Position] 📽️  Projection Engine Active.');
    
    // Recovery: Catch up from the last known state if needed
    // In a real system, we'd store 'lastId' in Redis
    
    this.poll();
  }

  private async poll() {
    try {
      // READ from Ledger Stream using XREAD (blocking)
      const results = await redis.xRead({ key: 'tradex:ledger:events', id: this.lastId }, { BLOCK: 5000, COUNT: 10 });
      
      if (results) {
        for (const stream of results) {
          for (const message of stream.messages) {
            const event: LedgerEvent = {
              id: message.id,
              eventType: message.message.type,
              source: message.message.source,
              severity: message.message.severity as any,
              payload: JSON.parse(message.message.payload),
              strategyId: message.message.strategyId,
              timestamp: parseInt(message.message.timestamp),
              version: parseInt(message.message.version),
              causationId: message.message.causationId,
              correlationId: message.message.correlationId
            };

            await this.apply(event);
            this.lastId = message.id;
          }
        }
      }
    } catch (e) {
      // If stream doesn't exist yet, wait
    }
    
    setTimeout(() => this.poll(), 100);
  }

  private async apply(event: LedgerEvent) {
    const { eventType, payload } = event;

    switch (eventType) {
      case 'position.opened': {
        const pos = payload;
        await redis.hset(KEYS.positions, pos.id, JSON.stringify({
          ...pos,
          projectedAt: Date.now(),
          ledgerId: event.id
        }));
        console.log(`[Projector:Position] 🆕 Position Projected: ${pos.id}`);
        break;
      }

      case 'position.closed': {
        const { id } = payload;
        await redis.hdel(KEYS.positions, id);
        console.log(`[Projector:Position] 🛑 Position Removed: ${id}`);
        break;
      }

      case 'position.updated': {
        const { id, updates } = payload;
        const raw = await redis.hget(KEYS.positions, id);
        if (raw) {
          const current = JSON.parse(raw);
          await redis.hset(KEYS.positions, id, JSON.stringify({
            ...current,
            ...updates,
            projectedAt: Date.now(),
            ledgerId: event.id
          }));
        }
        break;
      }
    }
  }
}

export const positionProjector = new PositionProjector();
