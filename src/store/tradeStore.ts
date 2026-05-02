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
export const selectedPrice = ref<number | null>(null);
export const marketData = ref({
    change24h: '+1,240.50 +1.99%',
    high24h: '64,500.00',
    low24h: '61,800.00',
    volBtc24h: '42,512.14',
    volUsdt24h: '2.68B'
});

export const openOrders = ref<any[]>([]);

if (typeof window !== 'undefined') {
    fetch('/api/positions')
        .then(res => res.json())
        .then(data => {
            if (data.positions) activePositions.value = data.positions;
            if (data.openOrders) openOrders.value = data.openOrders;
        })
        .catch(() => {});
}

export const orderBook = ref<{
    bids: [number, number][];
    asks: [number, number][];
}>({ bids: [], asks: [] });

let ws: WebSocket;
export const sharedWs = ref<WebSocket | null>(null);

function connectWs() {
  if (typeof window !== 'undefined') {
    // Binance combined stream for ticker and 20-level depth
    const wsUrl = 'wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/btcusdt@depth20@100ms';
    ws = new WebSocket(wsUrl);
    sharedWs.value = ws;

    ws.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const stream = payload.stream;
        const data = payload.data;

        if (stream === 'btcusdt@ticker') {
            previousPrice.value = currentPrice.value;
            currentPrice.value = parseFloat(data.c);
            
            marketData.value = {
                change24h: `${parseFloat(data.p).toFixed(2)} ${data.P}%`,
                high24h: parseFloat(data.h).toFixed(2),
                low24h: parseFloat(data.l).toFixed(2),
                volBtc24h: parseFloat(data.v).toFixed(2),
                volUsdt24h: (parseFloat(data.q) / 1000000).toFixed(2) + 'M'
            };
        } else if (stream === 'btcusdt@depth20@100ms') {
            orderBook.value = {
                bids: data.b.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
                asks: data.a.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])])
            };
        }
      } catch(e) {
        console.error('WS Error:', e);
      }
    });

    ws.addEventListener('close', () => {
      console.log('WS Closed, reconnecting...');
      setTimeout(connectWs, 3000);
    });
    
    ws.addEventListener('error', (err) => {
        console.error('WS Error:', err);
    });
  }
}

connectWs();

export const placeOrder = async (order: {
  pair: string;
  side: 'Buy' | 'Sell';
  type: string;
  quantity: number;
  price?: number;
  stopPrice?: number;
  callbackRate?: number;
  activationPrice?: number;
  leverage: string;
  cost: number;
}) => {
  try {
      const response = await fetch('/api/place_order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              ...order,
              amount: order.quantity, // map to server expectation
          })
      });
      const data = await response.json();
      if (data.success) {
          if (data.position) {
              activePositions.value.push(data.position);
          } else if (data.order) {
              openOrders.value.push(data.order);
          }
      }
  } catch (err) {
      console.warn('PlaceOrder failed:', err);
  }
};

// Maintain addPosition for compatibility or refactor components
export const addPosition = (pos: any) => placeOrder({
    ...pos,
    side: pos.type === 'LONG' ? 'Buy' : 'Sell',
    type: 'Market',
    quantity: pos.size
});

export const closePosition = async (id: string) => {
  try {
      await fetch(`/api/close_position/${id}`, { method: 'POST' });
  } catch (err) {}
  activePositions.value = activePositions.value.filter(p => p.id !== id);
};

export const cancelOrder = async (id: string) => {
    // In real app, call API
    openOrders.value = openOrders.value.filter(o => o.id !== id);
};
