import { ref } from 'vue';

export const activePositions = ref<{
  id: string;
  pair: string;
  type: 'LONG' | 'SHORT';
  leverage: string;
  liveDelta: number;
  liveDeltaPercent: number;
  size: number;
  cost: number;
  entry: number;
  mark: number;
  protocolLimits: [string, string];
}[]>([]);

export const currentPrice = ref(36000.00);
export const previousPrice = ref(36000.00);
export const marketData = ref({
    change24h: '+1,240.50 +1.99%',
    high24h: '64,500.00',
    low24h: '61,800.00',
    volBtc24h: '42,512.14',
    volUsdt24h: '2.68B'
});

if (typeof window !== 'undefined') {
    fetch('/api/positions')
        .then(res => res.json())
        .then(data => {
            if (data.positions) {
                activePositions.value = data.positions;
            }
        })
        .catch(() => {});
}

let ws: WebSocket;
export const sharedWs = ref<WebSocket | null>(null);

function connectWs() {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/trading`;
    ws = new WebSocket(wsUrl);
    sharedWs.value = ws;

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'trade') {
            if (data.price) {
                previousPrice.value = currentPrice.value;
                currentPrice.value = data.price;
            }
            if (data.positions) {
                activePositions.value = data.positions;
            }
        } else if (data.type === 'position_opened') {
            const exists = activePositions.value.find(p => p.id === data.position.id);
            if (!exists) activePositions.value.push(data.position);
        }
      } catch(e) {}
    });

    ws.addEventListener('close', () => {
      setTimeout(connectWs, 1000);
    });
  }
}

connectWs();

export const addPosition = async (position: {
  pair: string;
  type: 'LONG' | 'SHORT';
  leverage: string;
  size: number;
  cost: number;
  entry: number;
}) => {
  try {
      const response = await fetch('/api/place_order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              ...position,
              amount: position.size,
              price: position.entry,
              side: position.type === 'LONG' ? 'Buy' : 'Sell'
          })
      });
      const data = await response.json();
      if (data.success && data.position) {
          activePositions.value.push(data.position);
      }
  } catch (err) {
      console.warn('Fallback: adding locally');
      activePositions.value.push({
        id: Math.random().toString(36).substr(2, 9),
        pair: position.pair,
        type: position.type,
        leverage: position.leverage,
        size: position.size,
        cost: position.cost,
        entry: position.entry,
        mark: position.entry,
        liveDelta: 0,
        liveDeltaPercent: 0,
        protocolLimits: ['-', '-'],
      });
  }
};

export const closePosition = async (id: string) => {
  try {
      await fetch(`/api/close_position/${id}`, { method: 'POST' });
  } catch (err) {}
  activePositions.value = activePositions.value.filter(p => p.id !== id);
};
