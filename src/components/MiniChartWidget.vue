<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';
import { currentPrice } from '../store/tradeStore';

const props = defineProps<{
  symbol: string;
}>();

const chartContainer = ref<HTMLElement | null>(null);
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<"Candlestick"> | null = null;

const initChart = () => {
    if (!chartContainer.value) return;

    chart = createChart(chartContainer.value, {
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
    try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${props.symbol.replace('/','')}&interval=1m&limit=60`);
        const data = await response.json();
        const candles = data.map((d: any) => ({
            time: (d[0] / 1000) as Time,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
        }));
        candleSeries?.setData(candles);
        chart?.timeScale().fitContent();
    } catch (e) {}
};

onMounted(() => {
    initChart();
    const handleResize = () => {
        if (chart && chartContainer.value) {
            chart.applyOptions({
                width: chartContainer.value.clientWidth,
                height: chartContainer.value.clientHeight
            });
        }
    };
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    if (chart) chart.remove();
});

watch(currentPrice, (newPrice) => {
    // Just a visual update of the last candle if needed, but for mini chart we can just poll or rely on parent
});
</script>

<template>
  <div class="w-full h-full relative">
    <div ref="chartContainer" class="w-full h-full"></div>
    <div class="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0b0e11] via-transparent to-transparent opacity-40"></div>
  </div>
</template>
