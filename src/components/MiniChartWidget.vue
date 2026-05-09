<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';
import { currentPrice } from '../store/tradeStore';

const props = defineProps<{
  symbol: string;
}>();

const chartContainer = ref<HTMLElement | null>(null);
const isLoading = ref(true);
const hasError = ref(false);
const allLocalCandles = ref<CandlestickData[]>([]);

let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<"Candlestick"> | null = null;

const initChart = () => {
    if (!chartContainer.value) return;

    chart = createChart(chartContainer.value, {
        width: chartContainer.value.clientWidth,
        height: chartContainer.value.clientHeight,
        layout: {
            background: { color: 'transparent' },
            textColor: '#474d57',
            fontSize: 10,
        },
        grid: {
            vertLines: { visible: false },
            horzLines: { visible: false },
        },
        crosshair: {
            mode: 2,
        },
        timeScale: {
            visible: false,
        },
        rightPriceScale: {
            visible: false,
        },
        handleScroll: false,
        handleScale: false,
    });

    candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#0ecb81',
        downColor: '#f6465d',
        borderVisible: false,
        wickUpColor: '#0ecb81',
        wickDownColor: '#f6465d',
    });

    fetchData();
};

const fetchData = async () => {
    isLoading.value = true;
    hasError.value = false;
    try {
        const symbolClean = props.symbol.replace(/[^A-Za-z0-9]/g, '');
        const response = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${symbolClean}&interval=1m&limit=60`);
        if (!response.ok) throw new Error('Fetch failed');
        const data = await response.json();
        if (!chart) return;
        const candles = data.map((d: any) => ({
            time: (d[0] / 1000) as Time,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
        }));
        allLocalCandles.value = candles;
        candleSeries?.setData(candles);
        chart?.timeScale().fitContent();
        isLoading.value = false;
    } catch (e) {
        isLoading.value = false;
        console.warn(`[MiniChart] Failed to load data for ${props.symbol}, using fallback:`, e);
        if (!chart) return;
        const candles: any[] = [];
        const now = Math.floor(Date.now() / 1000);
        let p = 50000;
        for(let i = 60; i >= 0; i--) {
            const time = (now - i * 60) as Time;
            const open = p;
            const change = (Math.random() - 0.5) * 10;
            p += change;
            const high = Math.max(open, p) + Math.random() * 5;
            const low = Math.min(open, p) - Math.random() * 5;
            candles.push({ time, open, high, low, close: p });
        }
        allLocalCandles.value = candles;
        candleSeries?.setData(candles);
        chart?.timeScale().fitContent();
    }
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    initChart();
    if (chartContainer.value) {
        resizeObserver = new ResizeObserver((entries) => {
            if (chart && entries[0].contentRect) {
                chart.applyOptions({
                    width: entries[0].contentRect.width,
                    height: entries[0].contentRect.height
                });
            }
        });
        resizeObserver.observe(chartContainer.value);
    }
});

onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if (chart) {
        chart.remove();
        chart = null;
    }
});

watch(currentPrice, (newPrice) => {
    if (!candleSeries || !allLocalCandles.value.length || !chart) return;
    const last = allLocalCandles.value[allLocalCandles.value.length - 1];
    const updated = { 
        ...last, 
        close: newPrice, 
        high: Math.max(last.high, newPrice), 
        low: Math.min(last.low, newPrice) 
    };
    candleSeries.update(updated);
});

watch(() => props.symbol, async () => {
    await fetchData();
}, { flush: 'sync' });
</script>

<template>
  <div class="w-full h-full relative">
    <div ref="chartContainer" class="w-full h-full" :class="{ 'opacity-0': isLoading }"></div>
    
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
      <div class="w-4 h-4 border-2 border-[#F0B90B]/30 border-t-[#F0B90B] rounded-full animate-spin" />
    </div>
    
    <div v-if="hasError" class="absolute inset-0 flex items-center justify-center text-[#f6465d] text-[10px] font-bold">
      FAILED TO LOAD
    </div>
    
    <div class="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0b0e11] via-transparent to-transparent opacity-40"></div>
  </div>
</template>
