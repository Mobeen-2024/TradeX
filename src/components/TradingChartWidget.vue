<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import { currentPrice } from '../store/tradeStore';

const chartContainer = ref<HTMLElement | null>(null);
let chart: IChartApi | null = null;
let candlestickSeries: ISeriesApi<'Candlestick'> | null = null;

const initChart = () => {
  if (!chartContainer.value) return;

  chart = createChart(chartContainer.value, {
    layout: {
      background: { type: ColorType.Solid, color: '#0b0e11' },
      textColor: '#848e9c',
    },
    grid: {
      vertLines: { color: '#1e2329' },
      horzLines: { color: '#1e2329' },
    },
    width: chartContainer.value.clientWidth,
    height: chartContainer.value.clientHeight,
    timeScale: {
      borderColor: '#1e2329',
      timeVisible: true,
      secondsVisible: false,
    },
    rightPriceScale: {
      borderColor: '#1e2329',
    },
  });

  candlestickSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#0ecb81',
    downColor: '#f6465d',
    borderVisible: false,
    wickUpColor: '#0ecb81',
    wickDownColor: '#f6465d',
  });

  // Initial mock data
  const data = [];
  let time = Math.floor(Date.now() / 1000) - 100 * 60;
  let price = 36000;
  for (let i = 0; i < 100; i++) {
    const open = price;
    const close = open + (Math.random() - 0.5) * 100;
    const high = Math.max(open, close) + Math.random() * 50;
    const low = Math.min(open, close) - Math.random() * 50;
    data.push({ time, open, high, low, close });
    time += 60;
    price = close;
  }
  candlestickSeries.setData(data);

  const handleResize = () => {
    if (chart && chartContainer.value) {
      chart.applyOptions({ 
        width: chartContainer.value.clientWidth, 
        height: chartContainer.value.clientHeight 
      });
    }
  };

  window.addEventListener('resize', handleResize);

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (chart) {
      chart.remove();
      chart = null;
    }
  });
};

onMounted(() => {
  initChart();
});

// Update chart with live price
watch(currentPrice, (newPrice) => {
  if (candlestickSeries) {
    const lastBar = (candlestickSeries as any)._private__data._private__bars[candlestickSeries.data().length - 1];
    const time = Math.floor(Date.now() / 60000) * 60; // 1m bars
    
    candlestickSeries.update({
      time: time as any,
      open: lastBar?.close || newPrice,
      high: Math.max(lastBar?.high || newPrice, newPrice),
      low: Math.min(lastBar?.low || newPrice, newPrice),
      close: newPrice,
    });
  }
});
</script>

<template>
  <div class="relative w-full h-full min-h-[450px] lg:min-h-0 rounded-2xl border border-white/5 bg-[#0b0e11] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 hover:border-white/10 hover:shadow-[0_8px_32px_-8px_rgba(240,185,11,0.15)]">
    
    <!-- Top Toolbar -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-[#1e2329] text-xs text-[#848e9c] shrink-0 z-20 bg-[#0b0e11]">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-3 font-medium">
          <span class="hover:text-white cursor-pointer transition-colors hidden sm:block">Time</span>
          <span class="hover:text-white cursor-pointer transition-colors">1s</span>
          <span class="hover:text-white cursor-pointer transition-colors">15m</span>
          <span class="hover:text-white cursor-pointer transition-colors">1H</span>
          <span class="hover:text-white cursor-pointer transition-colors">4H</span>
          <span class="text-[#F0B90B] font-semibold cursor-pointer">1D</span>
          <span class="hover:text-white cursor-pointer transition-colors">1W</span>
        </div>
      </div>
      <div class="flex items-center gap-3 font-medium">
        <span class="text-[#F0B90B] font-semibold cursor-pointer">TradingView</span>
      </div>
    </div>
    
    <!-- Chart Container -->
    <div ref="chartContainer" class="flex-1 w-full relative z-10"></div>
    
  </div>
</template>

<style scoped>
:deep(.tv-lightweight-charts) {
  z-index: 10;
}
</style>
