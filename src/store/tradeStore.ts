import { ref, watch } from 'vue';
import { addNotification } from './alertStore';
import { apiClient } from '../lib/apiClient';
import { wsManager } from '../lib/wsManager';
import { globalSymbol } from './workspaceStore';

export const selectedSymbol = ref('BTCUSDT');
export const chartInterval = ref('15m');
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

export const currentPrice = ref(75000.00);
export const previousPrice = ref(75000.00);
export const selectedPrice = ref<number | null>(null);
export const sharedSlPrice = ref<number | null>(null);
export const isRiskModeActive = ref(false);
export const marketData = ref({
    change24h: '0.00 0.00%',
    high24h: '0.00',
    low24h: '0.00',
    volBtc24h: '0.00',
    volUsdt24h: '0.00'
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

export const orderBook = ref<{
    bids: [number, number][];
    asks: [number, number][];
}>({ bids: [], asks: [] });

// ── Institutional Stream Handlers ───────────────────────────
if (typeof window !== 'undefined') {
    // 1. Initial Snapshot
    wsManager.subscribe('app@snapshot', (data) => {
        console.log('[TradeStore] Snapshot received');
        if (data.positions) activePositions.value = data.positions;
        if (data.openOrders) openOrders.value = data.openOrders;
        if (data.globalState?.price) {
            currentPrice.value = parseFloat(data.globalState.price);
        }
    });

    // 2. Real-time Ticker
    let currentTickerStream = 'btcusdt@ticker';
    let currentDepthStream = 'btcusdt@depth20@100ms';

    const setupStreams = (symbol: string) => {
        const lowerSymbol = symbol.toLowerCase();
        
        // Unsubscribe old
        if (currentTickerStream) wsManager.unsubscribe(currentTickerStream, tickerHandler);
        if (currentDepthStream) wsManager.unsubscribe(currentDepthStream, depthHandler);

        currentTickerStream = `${lowerSymbol}@ticker`;
        currentDepthStream = `${lowerSymbol}@depth20@100ms`;

        // Subscribe new
        wsManager.subscribe(currentTickerStream, tickerHandler);
        wsManager.subscribe(currentDepthStream, depthHandler);
    };

    const tickerHandler = (data: any) => {
        previousPrice.value = currentPrice.value;
        currentPrice.value = parseFloat(data.c || data.price);
        
        if (data.p) {
            marketData.value = {
                change24h: `${parseFloat(data.p).toFixed(2)} ${data.P}%`,
                high24h: parseFloat(data.h).toFixed(2),
                low24h: parseFloat(data.l).toFixed(2),
                volBtc24h: parseFloat(data.v).toFixed(2),
                volUsdt24h: (parseFloat(data.q) / 1000000).toFixed(2) + 'M'
            };
        }
    };

    const depthHandler = (data: any) => {
        if (data.b && data.a) {
            orderBook.value = {
                bids: data.b.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
                asks: data.a.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])])
            };
        }
    };
    
    // Initial setup
    setupStreams(globalSymbol.value);

    // Watch for global symbol changes
    watch(globalSymbol, (newSym) => {
        setupStreams(newSym);
    });


    // 4. Live Position Updates
    wsManager.subscribe('app@positions', (positions: any[]) => {
        activePositions.value = positions;
    });

    // 5. Real-time Order & Position Execution
    wsManager.subscribe('app@position_opened', (data: any) => {
        if (data.position) {
            // Add to active positions if not exists
            if (!activePositions.value.find(p => p.id === data.position.id)) {
                activePositions.value.push(data.position);
            }
            // Deduct cost from available balance
            if (data.position.type === 'SHORT') {
                 const lev = typeof data.position.leverage === 'number' ? data.position.leverage : 1;
                 const btcCost = data.position.size / lev;
                 availableBtc.value -= btcCost;
            } else {
                 if (data.position.cost) {
                     availableUsdt.value -= parseFloat(data.position.cost);
                 } else if (data.position.size && data.position.entry && data.position.leverage) {
                     const lev = typeof data.position.leverage === 'number' ? data.position.leverage : 1;
                     const cost = (data.position.size * data.position.entry) / lev;
                     availableUsdt.value -= cost;
                 }
            }
        }
    });

    wsManager.subscribe('app@order_placed', (data: any) => {
        if (data.order) {
            // Add to open orders if not exists
            if (!openOrders.value.find(o => o.id === data.order.id)) {
                openOrders.value.push(data.order);
            }
            // Deduct cost from available balance
            if (data.order.side === 'Sell') {
                 const lev = typeof data.order.leverage === 'number' ? data.order.leverage : 1;
                 const quantity = data.order.quantity || data.order.amount;
                 if (quantity) {
                     availableBtc.value -= quantity / lev;
                 }
            } else {
                 if (data.order.cost) {
                     availableUsdt.value -= parseFloat(data.order.cost);
                 } else if (data.order.quantity && data.order.price && data.order.leverage) {
                     const lev = typeof data.order.leverage === 'number' ? data.order.leverage : 1;
                     const reqPrice = data.order.type === 'Stop Market' || data.order.type === 'Trailing Stop' ? data.order.activationPrice || data.order.price || currentPrice.value : data.order.price;
                     const cost = (data.order.quantity * reqPrice) / lev;
                     availableUsdt.value -= cost;
                 }
            }
        }
    });
}

export const placeOrder = async (order: {
  pair: string;
  side: 'Buy' | 'Sell';
  type: string;
  quantity: number;
  price?: number;
  accountIds?: string[];
  sorConfig?: {
    strategy: 'market' | 'iceberg' | 'twap';
    icebergSlices?: number;
    twapWindowMs?: number;
  };
  stopPrice?: number;
  callbackRate?: number;
  activationPrice?: number;
  leverage: string;
  cost: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  iceberg?: boolean;
}) => {
  try {
      // All orders now go through the centralized backend
      const response = await apiClient.post<any>('/place_order', { 
          ...order, 
          amount: order.quantity
      });

      if (response.success && response.data) {
          const data = response.data;
          // Note: Backend now emits 'position_opened' or 'order_placed' via WS
          // but we still return data for UI confirmation if needed.
          addNotification({
              type: 'success',
              title: 'Order Submitted',
              message: `${order.side} ${order.quantity} ${order.pair} sent to execution engine.`
          });
          return data;
      }
      throw new Error(response.error || 'Execution failed');
  } catch (err) {
      addNotification({
          type: 'error',
          title: 'Order Failed',
          message: (err as Error).message
      });
      return { success: false, error: (err as Error).message };
  }
};

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
  try {
      await apiClient.post(`/close_position/${id}`, {});
      addNotification({
          type: 'info',
          title: 'Closing Position',
          message: `Request to close position ${id} submitted.`
      });
  } catch (err) {
      addNotification({
          type: 'error',
          title: 'Close Failed',
          message: 'Failed to submit close request.'
      });
  }
};

export const cancelOrder = async (id: string) => {
    try {
        // In real app, call API to cancel
        // For now, we'll just filter locally until Phase 2
        openOrders.value = openOrders.value.filter(o => o.id !== id);
        addNotification({
            type: 'info',
            title: 'Order Cancelled',
            message: `Order ${id} removed.`
        });
    } catch (err) {}
};

// History is now managed by the backend, but we can keep the mock generator for demo visuals if empty
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
