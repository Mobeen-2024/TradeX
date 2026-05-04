import { ref } from 'vue';
import { wsManager } from '../lib/wsManager';

export interface CBStatus {
  name: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export const circuitBreakers = ref<CBStatus[]>([
  { name: 'exchange_rest', state: 'CLOSED' },
  { name: 'exchange_ws', state: 'CLOSED' },
  { name: 'questdb', state: 'CLOSED' }
]);

export function initSystemStore() {
  // Listen for real-time circuit breaker updates
  wsManager.subscribe('app@circuit_breaker', (data) => {
    const breaker = circuitBreakers.value.find(b => b.name === data.name);
    if (breaker) {
      breaker.state = data.state;
    }
  });

  // Fetch initial state
  fetch('/api/circuit-breakers')
    .then(res => res.json())
    .then(data => {
      if (data.breakers) {
        circuitBreakers.value = data.breakers;
      }
    })
    .catch(err => console.error('[SystemStore] Failed to fetch CB status:', err));
}
