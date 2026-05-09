import { ref } from 'vue';

export type EventType = 
  | 'signal:created' 
  | 'strategy:started' 
  | 'strategy:paused' 
  | 'position:opened' 
  | 'risk:triggered' 
  | 'macro:executed' 
  | 'ai:analysis-complete'
  | 'system:error';

export interface TradeEvent {
  type: EventType;
  timestamp: number;
  data: any;
  source: string;
}

// Internal listeners
type Listener = (event: TradeEvent) => void;
const listeners = new Map<EventType, Set<Listener>>();

/**
 * Real-time Event Bus for Unified Communication
 */
export const eventBus = {
  /**
   * Publish an event to the bus
   */
  publish(type: EventType, data: any, source: string = 'system') {
    const event: TradeEvent = {
      type,
      timestamp: Date.now(),
      data,
      source
    };

    // Trigger local listeners
    if (listeners.has(type)) {
      listeners.get(type)?.forEach(cb => cb(event));
    }

    // Also trigger '*' (all) listeners
    if (listeners.has('*' as any)) {
      listeners.get('*' as any)?.forEach(cb => cb(event));
    }

    // Log to console in dev mode
    if (import.meta.env.DEV) {
       console.log(`[EventBus] ${type}`, event);
    }
  },

  /**
   * Subscribe to a specific event
   */
  subscribe(type: EventType | '*', callback: Listener) {
    if (!listeners.has(type as any)) {
      listeners.set(type as any, new Set());
    }
    listeners.get(type as any)?.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.get(type as any)?.delete(callback);
    };
  }
};

// Global reactive event log for UI visualization
export const recentEvents = ref<TradeEvent[]>([]);

eventBus.subscribe('*', (event) => {
  recentEvents.value.unshift(event);
  if (recentEvents.value.length > 100) {
    recentEvents.value.pop();
  }
});
