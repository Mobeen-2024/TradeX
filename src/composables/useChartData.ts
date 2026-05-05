import { ref, onUnmounted } from 'vue';
import { Time, CandlestickData } from 'lightweight-charts';
import { currentPrice } from '../store/tradeStore';
import { useReconnectingWebSocket } from './useReconnectingWebSocket';

export function useChartData() {
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

    const fetchKlines = async (symbol: string, interval: string) => {
        const currentGen = ++generation;
        const binanceInterval = interval === '1s' ? '1s' : interval.toLowerCase();
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=500`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            // Prevent stale data from overwriting if a newer request has started
            if (currentGen !== generation) return { candlestick: [], volume: [] };

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
            return { candlestick, volume };
        } catch (error) {
            console.error('Error fetching klines:', error);
            return { candlestick: [], volume: [] };
        }
    };

    const subscribeKline = (symbol: string, interval: string, onUpdate: (update: any, k: any) => void) => {
        klineWs?.disconnect();
        
        const currentGen = generation;
        const binanceInterval = interval.toLowerCase();
        const lowSymbol = symbol.toLowerCase();
        const url = `wss://stream.binance.com:9443/ws/${lowSymbol}@kline_${binanceInterval}`;
        
        let rafId: number | null = null;
        let pendingUpdate: any = null;
        let pendingK: any = null;

        const flushUpdate = () => {
            if (!pendingUpdate || currentGen !== generation) {
                rafId = null;
                return;
            }
            
            // Update local state
            const lastIdx = allCandles.value.findIndex(c => c.time === pendingUpdate.time);
            if (lastIdx !== -1) {
                allCandles.value[lastIdx] = pendingUpdate;
            } else {
                allCandles.value.push(pendingUpdate);
                if (allCandles.value.length > 1000) allCandles.value.shift();
            }

            lastPriceData.value = {
                ...pendingUpdate,
                volume: parseFloat(pendingK.v),
                isUp: pendingUpdate.close >= pendingUpdate.open
            };

            onUpdate(pendingUpdate, pendingK);
            
            pendingUpdate = null;
            pendingK = null;
            rafId = null;
        };

        klineWs = useReconnectingWebSocket(() => url, {
            onMessage: (data) => {
                const k = data.k;
                if (!k || currentGen !== generation) return;

                pendingUpdate = {
                    time: (k.t / 1000) as Time,
                    open: parseFloat(k.o),
                    high: parseFloat(k.h),
                    low: parseFloat(k.l),
                    close: parseFloat(k.c)
                };
                pendingK = k;

                if (!rafId) {
                    rafId = requestAnimationFrame(flushUpdate);
                }
            }
        });

        klineWs.connect();
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            klineWs?.disconnect();
        };
    };

    const subscribeTrades = (symbol: string, onTrade: (trade: any) => void) => {
        tradesWs?.disconnect();
        
        const currentGen = generation;
        const lowSymbol = symbol.toLowerCase();
        const url = `wss://stream.binance.com:9443/ws/${lowSymbol}@aggTrade`;
        
        tradesWs = useReconnectingWebSocket(() => url, {
            onMessage: (data) => {
                if (currentGen !== generation) return;
                onTrade({
                    p: parseFloat(data.p),
                    q: parseFloat(data.q),
                    m: data.m,
                    t: data.T
                });
            }
        });

        tradesWs.connect();
        return () => tradesWs?.disconnect();
    };

    onUnmounted(() => {
        klineWs?.disconnect();
        tradesWs?.disconnect();
    });

    return {
        allCandles,
        lastPriceData,
        fetchKlines,
        subscribeKline,
        subscribeTrades
    };
}
