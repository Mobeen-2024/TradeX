import { ref, onUnmounted } from 'vue';
import { Time, CandlestickData } from 'lightweight-charts';
import { currentPrice } from '../store/tradeStore';

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
    
    let currentWs: WebSocket | null = null;

    const fetchKlines = async (symbol: string, interval: string) => {
        const binanceInterval = interval === '1s' ? '1s' : interval.toLowerCase();
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=500`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
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
        if (currentWs) currentWs.close();
        
        const binanceInterval = interval.toLowerCase();
        const lowSymbol = symbol.toLowerCase();
        currentWs = new WebSocket(`wss://stream.binance.com:9443/ws/${lowSymbol}@kline_${binanceInterval}`);
        
        currentWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const k = data.k;
            if (!k) return;

            const update = {
                time: (k.t / 1000) as Time,
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c)
            };

            // Update local state
            const lastIdx = allCandles.value.findIndex(c => c.time === update.time);
            if (lastIdx !== -1) {
                allCandles.value[lastIdx] = update;
            } else {
                allCandles.value.push(update);
                if (allCandles.value.length > 1000) allCandles.value.shift();
            }

            lastPriceData.value = {
                ...update,
                volume: parseFloat(k.v),
                isUp: update.close >= update.open
            };

            onUpdate(update, k);
        };
    };

    onUnmounted(() => {
        if (currentWs) currentWs.close();
    });

    return {
        allCandles,
        lastPriceData,
        fetchKlines,
        subscribeKline
    };
}
