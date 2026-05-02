import { ref, watch } from 'vue';
import { addNotification } from './alertStore';

export const activePositions = ref<{
  id: string;
  pair: string;
  type: 'LONG' | 'SHORT';
  leverage: string;
  size: number;
  cost: number;
  entry: number;
  mark?: number;
  liveDelta?: number;
  liveDeltaPercent?: number;
  protocolLimits?: [string, string];
  pnl?: number;
  pnlPercent?: number;
  tp?: number;
  sl?: number;
  time?: number;
}[]>([]);

export const closedTrades = ref<any[]>([]);

export const currentPrice = ref(36000.00);
export const previousPrice = ref(36000.00);
export const selectedPrice = ref<number | null>(null);
export const sharedSlPrice = ref<number | null>(null);
export const isRiskModeActive = ref(false);
export const marketData = ref({
    change24h: '+1,240.50 +1.99%',
    high24h: '64,500.00',
    low24h: '61,800.00',
    volBtc24h: '42,512.14',
    volUsdt24h: '2.68B'
});

export const openOrders = ref<any[]>([]);
export const alerts = ref<{ id: string; price: number; side: 'above' | 'below'; triggered: boolean }[]>([]);
export const isLiveMode = ref(false);
export const availableUsdt = ref(9840.79);
export const availableBtc = ref(0.4521);
export const quickTradeMode = ref(false);
export const quickTradePreferences = ref({
    defaultRisk: 100, // USDT
    defaultLeverage: 10,
    oneTapMode: false
});

if (typeof window !== 'undefined') {
    const savedMode = localStorage.getItem('tradex_live_mode');
    isLiveMode.value = savedMode === 'true';

    const savedQT = localStorage.getItem('tradex_qt_prefs');
    if (savedQT) quickTradePreferences.value = JSON.parse(savedQT);
    
    const savedUsdt = localStorage.getItem('tradex_available_usdt');
    if (savedUsdt) availableUsdt.value = parseFloat(savedUsdt);
    
    const savedBtc = localStorage.getItem('tradex_available_btc');
    if (savedBtc) availableBtc.value = parseFloat(savedBtc);
}

watch(quickTradePreferences, (val) => {
    localStorage.setItem('tradex_qt_prefs', JSON.stringify(val));
}, { deep: true });

watch(availableUsdt, (val) => localStorage.setItem('tradex_available_usdt', val.toString()));
watch(availableBtc, (val) => localStorage.setItem('tradex_available_btc', val.toString()));

export const createAlert = (price: number) => {
    const side = price > currentPrice.value ? 'above' : 'below';
    alerts.value.push({
        id: Math.random().toString(36).substring(7),
        price,
        side,
        triggered: false
    });
};

export const removeAlert = (id: string) => {
    alerts.value = alerts.value.filter(a => a.id !== id);
};

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
  takeProfitPrice?: number;
  stopLossPrice?: number;
}) => {
  const id = Math.random().toString(36).substr(2, 9);
  const isMarket = order.type === 'MARKET' || order.type === 'STOP_MARKET' || order.type === 'TRAILING_STOP_MARKET';

  try {
      const endpoint = isLiveMode.value ? '/api/live/place_order' : '/api/place_order';
      const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...order, amount: order.quantity, isLive: isLiveMode.value })
      });
      const data = await response.json();
      if (data.success) {
          if (data.position) {
              activePositions.value.push(data.position);
              addNotification({
                  type: 'success',
                  title: 'Order Filled',
                  message: `${order.side} ${order.quantity} ${order.pair} @ ${order.price || currentPrice.value}`
              });
          } else if (data.order) {
              openOrders.value.push(data.order);
              addNotification({
                  type: 'info',
                  title: 'Order Placed',
                  message: `${order.type} ${order.side} ${order.quantity} ${order.pair}`
              });
          }
      }
      return data;
  } catch (err) {
      // Mock Simulation for local demo
      if (isMarket) {
          activePositions.value.push({
              id,
              pair: order.pair,
              type: order.side === 'Buy' ? 'LONG' : 'SHORT',
              size: order.quantity,
              entry: order.price || currentPrice.value,
              leverage: order.leverage.replace('Spot', '1x').replace('Cross_', ''),
              cost: order.cost,
              tp: order.takeProfitPrice,
              sl: order.stopLossPrice,
              time: Date.now(),
              pnl: 0,
              pnlPercent: 0,
              liveDelta: 0,
              liveDeltaPercent: 0,
              mark: order.price || currentPrice.value
          });
          addNotification({
              type: 'success',
              title: 'Order Filled',
              message: `${order.side} ${order.quantity} ${order.pair} @ ${order.price || currentPrice.value}`
          });
      } else {
          openOrders.value.unshift({
              id,
              pair: order.pair,
              side: order.side,
              type: order.type,
              price: order.price || currentPrice.value,
              amount: order.quantity,
              total: (order.price || currentPrice.value) * order.quantity,
              time: new Date().toLocaleTimeString(),
              status: 'Open',
              tp: order.takeProfitPrice,
              sl: order.stopLossPrice
          });
          addNotification({
              type: 'info',
              title: 'Order Placed',
              message: `${order.type} ${order.side} ${order.quantity} ${order.pair}`
          });
      }
      return { success: true };
  }
};

// Maintain addPosition for compatibility or refactor components
export const addPosition = (pos: any) => placeOrder({
    ...pos,
    side: pos.type === 'LONG' ? 'Buy' : 'Sell',
    type: 'MARKET',
    quantity: pos.size,
    leverage: pos.leverage.includes('x') ? `Cross_${pos.leverage}` : pos.leverage,
    takeProfitPrice: pos.tp,
    stopLossPrice: pos.sl
});

export const closePosition = async (id: string) => {
  const pos = activePositions.value.find(p => p.id === id);
  if (pos) {
      const pnl = pos.type === 'LONG' 
          ? (currentPrice.value - pos.entry) * pos.size 
          : (pos.entry - currentPrice.value) * pos.size;
      
      closedTrades.value.push({
          ...pos,
          closePrice: currentPrice.value,
          realizedPnl: pnl,
          closeTime: Date.now()
      });
      addNotification({
          type: pnl >= 0 ? 'success' : 'warning',
          title: 'Position Closed',
          message: `${pos.pair} ${pos.type} closed. P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`
      });
  }
  
  try {
      await fetch(`/api/close_position/${id}`, { method: 'POST' });
  } catch (err) {}
  activePositions.value = activePositions.value.filter(p => p.id !== id);
};

export const cancelOrder = async (id: string) => {
    const order = openOrders.value.find(o => o.id === id);
    if (order) {
        addNotification({
            type: 'info',
            title: 'Order Cancelled',
            message: `${order.type} ${order.side} ${order.pair} removed.`
        });
    }
    // In real app, call API
    openOrders.value = openOrders.value.filter(o => o.id !== id);
};

// Mock History Generator for Demo
export const generateMockHistory = () => {
    if (closedTrades.value.length > 0) return;
    
    const count = 15;
    const startPrice = 35000;
    const trades = [];
    
    for (let i = 0; i < count; i++) {
        const win = Math.random() > 0.4;
        const pnl = win ? (Math.random() * 500 + 100) : -(Math.random() * 300 + 50);
        trades.push({
            id: `mock-${i}`,
            pair: 'BTC/USDT',
            type: Math.random() > 0.5 ? 'LONG' : 'SHORT',
            size: 0.1,
            entry: startPrice + (i * 100),
            closePrice: startPrice + (i * 100) + (pnl / 0.1),
            realizedPnl: pnl,
            closeTime: Date.now() - (count - i) * 3600000,
            leverage: '20x'
        });
    }
    closedTrades.value = trades;
};

// Auto-populate for first run
if (typeof window !== 'undefined') {
    setTimeout(generateMockHistory, 1000);
}

// Monitor alerts
watch(currentPrice, (newPrice) => {
    alerts.value.forEach(alert => {
        if (alert.triggered) return;
        const hit = alert.side === 'above' ? newPrice >= alert.price : newPrice <= alert.price;
        if (hit) {
            alert.triggered = true;
            addNotification({
                type: 'warning',
                title: 'Price Target Hit',
                message: `${alert.side === 'above' ? 'UPWARD' : 'DOWNWARD'} cross on ${alert.price}`
            });
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                    new Notification('TradeX Alert', { body: `BTC hit ${alert.price}` });
                } else {
                    Notification.requestPermission();
                }
            }
        }
    });
});
