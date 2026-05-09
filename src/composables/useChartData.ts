import { ref, onUnmounted, computed } from 'vue';
import { Time, CandlestickData } from 'lightweight-charts';
import { currentPrice } from '../store/tradeStore';
import { useReconnectingWebSocket } from './useReconnectingWebSocket';

// --------------------------------------------------------
// 1. DETERMINISTIC STATE MACHINE
// --------------------------------------------------------
export type ChartState = 'IDLE' | 'FETCHING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE';

// --------------------------------------------------------
// 2. CONFIGURATION & CONSTANTS
// --------------------------------------------------------
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500; // Exponential backoff base
const BUFFER_FLUSH_INTERVAL_MS = 16; // ~60fps target for data batching

export function useChartData() {
    // Current deterministic state
    const currentState = ref<ChartState>('IDLE');
    
    // Error state holding deterministic messages
    const lastError = ref<string | null>(null);

    const allCandles = ref<CandlestickData[]>([]);
    const lastPriceData = ref({
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0,
        isUp: true
    });
    
    let klineWs: ReturnType<typeof useReconnectingWebSocket> | null = null;
    let tradesWs: ReturnType<typeof useReconnectingWebSocket> | null = null;
    let generation = 0;
    
    // --------------------------------------------------------
    // HIGH-FREQUENCY BUFFERING STRATEGY
    // --------------------------------------------------------
    let klineBuffer: { update: any, k: any } | null = null;
    let tradesBuffer: any[] = [];
    let flushRafId: number | null = null;
    let lastFlushTime = 0;

    let onKlineUpdateCb: ((update: any, k: any) => void) | null = null;
    let onTradeUpdateCb: ((trade: any) => void) | null = null;

    // Active timeouts for cleanup
    const activeTimeouts = new Set<ReturnType<typeof setTimeout>>();

    // --------------------------------------------------------
    // UTILS & CLEANUP
    // --------------------------------------------------------
    const registerTimeout = (fn: () => void, delay: number) => {
        const id = setTimeout(() => {
            fn();
            activeTimeouts.delete(id);
        }, delay);
        activeTimeouts.add(id);
        return id;
    };

    const cleanupTimeouts = () => {
        activeTimeouts.forEach(clearTimeout);
        activeTimeouts.clear();
    };

    const transitionTo = (newState: ChartState, errorMsg?: string) => {
        currentState.value = newState;
        if (errorMsg) lastError.value = errorMsg;
    };

    // --------------------------------------------------------
    // BUFFER PROCESSOR (THROTTLING / BATCHING)
    // --------------------------------------------------------
    const processBuffers = () => {
        const now = performance.now();
        // Throttle rapid updates to prevent UI freezing (Max ~60fps)
        if (now - lastFlushTime < BUFFER_FLUSH_INTERVAL_MS) {
            flushRafId = requestAnimationFrame(processBuffers);
            return;
        }

        // Process Kline (Latest state overwrite - Debounce pattern)
        if (klineBuffer && onKlineUpdateCb) {
            const { update, k } = klineBuffer;
            const lastIdx = allCandles.value.findIndex(c => c.time === update.time);
            if (lastIdx !== -1) {
                allCandles.value[lastIdx] = update;
            } else {
                allCandles.value.push(update);
                // Prevent memory leaks: keep max 1000 candles
                if (allCandles.value.length > 1000) allCandles.value.shift();
            }

            lastPriceData.value = {
                ...update,
                volume: parseFloat(k.v),
                isUp: update.close >= update.open
            };

            onKlineUpdateCb(update, k);
            klineBuffer = null;
        }

        // Process Trades (Batch execution pattern)
        if (tradesBuffer.length > 0 && onTradeUpdateCb) {
            tradesBuffer.forEach(trade => onTradeUpdateCb!(trade));
            tradesBuffer = [];
        } else if (tradesBuffer.length > 0) {
            tradesBuffer = []; // Prevent memory leaks if no cb attached
        }

        lastFlushTime = now;
        flushRafId = null;
    };

    // --------------------------------------------------------
    // CORE LOGIC FLOW
    // --------------------------------------------------------

    /**
     * Fetch historical klines with Exponential Backoff
     */
    const fetchKlines = async (symbol: string, interval: string) => {
        const currentGen = ++generation;
        const binanceInterval = interval === '1s' ? '1s' : interval.toLowerCase();
        const symbolClean = symbol.replace(/[^A-Za-z0-9]/g, '');
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbolClean}&interval=${binanceInterval}&limit=500`;
        
        let retryCount = 0;
        lastError.value = null;
        
        while (retryCount <= MAX_RETRIES) {
            transitionTo(retryCount > 0 ? 'PROCESSING' : 'FETCHING');
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const data = await response.json();
                
                // Prevent stale data from overwriting if a newer request has started
                if (currentGen !== generation) return { candlestick: [], volume: [] };

                transitionTo('PROCESSING');

                const candlestick: CandlestickData[] = [];
                const volume: any[] = [];
                
                data.forEach((d: any) => {
                    const time = (d[0] / 1000) as Time;
                    const open = parseFloat(d[1]);
                    const high = parseFloat(d[2]);
                    const low = parseFloat(d[3]);
                    const close = parseFloat(d[4]);
                    const vol = parseFloat(d[5]);
                    
                    candlestick.push({ time, open, high, low, close });
                    volume.push({
                        time,
                        value: vol,
                        color: close >= open ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)'
                    });
                });
                
                allCandles.value = candlestick;
                if (candlestick.length > 0) {
                    currentPrice.value = candlestick[candlestick.length - 1].close;
                }
                
                transitionTo('SUCCESS');
                return { candlestick, volume };

            } catch (error: any) {
                retryCount++;
                if (retryCount > MAX_RETRIES) {
                    transitionTo('FAILURE', 'Network timeout after multiple retries. Using mock fallback.');
                    console.error('[ChartLogic] Failed to fetch klines:', error);
                    return generateMockData(); // Graceful fallback
                }
                // Exponential backoff
                const backoffTime = BASE_BACKOFF_MS * Math.pow(2, retryCount - 1);
                console.warn(`[ChartLogic] Network fault, retrying in ${backoffTime}ms... (Attempt ${retryCount}/${MAX_RETRIES})`);
                await new Promise(resolve => registerTimeout(() => resolve(true), backoffTime));
            }
        }
        return generateMockData();
    };

    /**
     * Graceful fallback when network fails
     */
    const generateMockData = () => {
        const candlestick: CandlestickData[] = [];
        const volume: any[] = [];
        const now = Math.floor(Date.now() / 1000);
        let p = 75000;
        for(let i = 500; i >= 0; i--) {
            const time = (now - i * 900) as Time;
            const open = p;
            const change = (Math.random() - 0.5) * 100;
            p += change;
            const high = Math.max(open, p) + Math.random() * 50;
            const low = Math.min(open, p) - Math.random() * 50;
            candlestick.push({ time, open, high, low, close: p });
            volume.push({
                time,
                value: Math.random() * 10,
                color: p >= open ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)'
            });
        }
        allCandles.value = candlestick;
        currentPrice.value = p;
        return { candlestick, volume };
    };

    /**
     * Real-time Klines subscription with Buffering
     */
    const subscribeKline = (symbol: string, interval: string, onUpdate: (update: any, k: any) => void) => {
        klineWs?.disconnect();
        onKlineUpdateCb = onUpdate;
        
        const currentGen = generation;
        const binanceInterval = interval.toLowerCase();
        const lowSymbol = symbol.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
        const url = `wss://stream.binance.com:9443/ws/${lowSymbol}@kline_${binanceInterval}`;
        
        klineWs = useReconnectingWebSocket(() => url, {
            onMessage: (data) => {
                const k = data.k;
                if (!k || currentGen !== generation) return;

                // Overwrite the buffer with the latest kline tick (Debounce pattern)
                klineBuffer = {
                    update: {
                        time: (k.t / 1000) as Time,
                        open: parseFloat(k.o),
                        high: parseFloat(k.h),
                        low: parseFloat(k.l),
                        close: parseFloat(k.c)
                    },
                    k
                };

                if (!flushRafId) {
                    flushRafId = requestAnimationFrame(processBuffers);
                }
            }
        });

        klineWs.connect();
        
        return () => {
            onKlineUpdateCb = null;
            if (flushRafId) cancelAnimationFrame(flushRafId);
            klineWs?.disconnect();
        };
    };

    /**
     * Real-time Trades subscription with Buffering
     */
    const subscribeTrades = (symbol: string, onTrade: (trade: any) => void) => {
        tradesWs?.disconnect();
        onTradeUpdateCb = onTrade;
        
        const currentGen = generation;
        const lowSymbol = symbol.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
        const url = `wss://stream.binance.com:9443/ws/${lowSymbol}@aggTrade`;
        
        tradesWs = useReconnectingWebSocket(() => url, {
            onMessage: (data) => {
                if (currentGen !== generation) return;
                
                // Add to trade batch buffer
                tradesBuffer.push({
                    p: parseFloat(data.p),
                    q: parseFloat(data.q),
                    m: data.m,
                    t: data.T
                });

                // Hard limit to prevent extreme memory leaks under load
                if (tradesBuffer.length > 500) {
                    tradesBuffer.shift(); 
                }

                if (!flushRafId) {
                    flushRafId = requestAnimationFrame(processBuffers);
                }
            }
        });

        tradesWs.connect();
        
        return () => {
            onTradeUpdateCb = null;
            tradesWs?.disconnect();
        };
    };

    // --------------------------------------------------------
    // LIFECYCLE
    // --------------------------------------------------------
    onUnmounted(() => {
        cleanupTimeouts();
        if (flushRafId) cancelAnimationFrame(flushRafId);
        klineWs?.disconnect();
        tradesWs?.disconnect();
    });

    return {
        currentState,
        lastError,
        allCandles,
        lastPriceData,
        fetchKlines,
        subscribeKline,
        subscribeTrades
    };
}
