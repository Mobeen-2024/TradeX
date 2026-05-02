<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const candles = ref<Candle[]>([]);

// Define average mock lines
const avgBuyPrice = 71266.49;
const avgSellPrice = 90633.05;

// Generate mock data looking somewhat similar to the chart
const generateMockData = () => {
  const data: Candle[] = [];
  let price = 110000;
  let time = new Date('2025-10-15T00:00:00Z').getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  // Create a trend: initial peak, steady drop, low bounce
  for (let i = 0; i < 150; i++) {
    const open = price;
    
    let change = 0;
    if (i < 20) change = (Math.random() - 0.4) * 3000; // Peak
    else if (i < 80) change = (Math.random() - 0.6) * 2000; // Drop
    else if (i < 120) change = (Math.random() - 0.5) * 1500; // Consolidate
    else if (i < 140) change = (Math.random() - 0.8) * 4000; // Dump
    else change = (Math.random() - 0.2) * 2500; // Bounce
    
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 2000;
    const low = Math.min(open, close) - Math.random() * 2000;
    
    data.push({ time, open, high, low, close });
    
    price = close;
    time += dayMs;
  }
  candles.value = data;
};

const currentCandle = computed(() => {
    if (candles.value.length === 0) return null;
    return candles.value[candles.value.length - 1];
});

const isBullish = (c: Candle) => c.close >= c.open;

const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

let resizeObserver: ResizeObserver | null = null;
let animationFrameId: number | null = null;

const drawChart = () => {
    if (!canvasRef.value || !containerRef.value) return;
    
    const canvas = canvasRef.value;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.value.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.fillStyle = '#0b0e11'; 
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    if (candles.value.length === 0) return;

    // Dimensions
    const padding = { top: 40, right: 80, bottom: 30, left: 10 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;
    
    // Find Min and Max with padding
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const candle of candles.value) {
        if (candle.low < minPrice) minPrice = candle.low;
        if (candle.high > maxPrice) maxPrice = candle.high;
    }
    
    const pricePadding = (maxPrice - minPrice) * 0.1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const priceRange = maxPrice - minPrice;
    
    const getY = (p: number) => padding.top + chartHeight - ((p - minPrice) / priceRange) * chartHeight;
    const candleWidth = chartWidth / candles.value.length;
    
    // Draw Axis Grid
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    const numTicks = 8;
    for(let i = 0; i <= numTicks; i++) {
        const price = minPrice + (priceRange / numTicks) * i;
        const y = padding.top + chartHeight - (chartHeight / numTicks) * i;

        ctx.fillStyle = '#848e9c';
        ctx.fillText(formatNumber(price), padding.left + chartWidth + 10, y);
    }
    
    // Draw Date Axis
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const numTimeTicks = 5;
    for(let i = 1; i < numTimeTicks; i++) {
        const index = Math.floor((candles.value.length / numTimeTicks) * i);
        const candle = candles.value[index];
        const x = padding.left + index * candleWidth + candleWidth / 2;

        const date = new Date(candle.time);
        const label = date.getMonth() === 0 && date.getDate() === 1 ? 
            date.getFullYear().toString() : 
            `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
            
        ctx.fillStyle = '#848e9c';
        ctx.fillText(label, x, padding.top + chartHeight + 10);
    }

    // Draw Candles
    const spacing = candleWidth * 0.2;
    const bodyWidth = candleWidth - spacing;
    
    for (let i = 0; i < candles.value.length; i++) {
        const candle = candles.value[i];
        
        const x = padding.left + i * candleWidth + candleWidth / 2;
        const openY = getY(candle.open);
        const closeY = getY(candle.close);
        const highY = getY(candle.high);
        const lowY = getY(candle.low);
        
        const bullish = candle.close >= candle.open;
        const color = bullish ? '#0ecb81' : '#f6465d';
        
        // Shadow
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();
        
        // Body
        ctx.fillStyle = color;
        const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
        const yStart = Math.min(openY, closeY);
        ctx.fillRect(x - bodyWidth / 2, yStart, Math.max(bodyWidth, 1), bodyHeight);
    }
    
    // Draw Current Price Line
    const lastCandle = candles.value[candles.value.length - 1];
    const currentPriceY = getY(lastCandle.close);
    const currentColor = isBullish(lastCandle) ? '#0ecb81' : '#f6465d';
    
    ctx.strokeStyle = currentColor;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentPriceY);
    ctx.lineTo(padding.left + chartWidth, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Current price rect
    ctx.fillStyle = currentColor;
    ctx.roundRect(padding.left + chartWidth + 5, currentPriceY - 12, 70, 24, 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatNumber(lastCandle.close), padding.left + chartWidth + 40, currentPriceY);
};

const handleResize = () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(drawChart);
};

onMounted(() => {
  generateMockData();
  
  if (containerRef.value) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.value);
  }
  
  handleResize();
  
  const interval = setInterval(() => {
      if (candles.value.length > 0) {
          const lastCandle = candles.value[candles.value.length - 1];
          const newClose = lastCandle.close + (Math.random() - 0.5) * 1000;
          lastCandle.close = newClose;
          if (newClose > lastCandle.high) lastCandle.high = newClose;
          if (newClose < lastCandle.low) lastCandle.low = newClose;
          handleResize();
      }
  }, 1000);
  
  onUnmounted(() => {
      clearInterval(interval);
  });
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <div class="group relative flex flex-col w-full h-full min-h-[450px] lg:min-h-0 rounded-2xl border border-white/5 bg-[#0b0e11] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 hover:border-white/10 hover:shadow-[0_8px_32px_-8px_rgba(240,185,11,0.15)]">
    
    <!-- Top Toolbar -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-[#1e2329] text-xs text-[#848e9c] shrink-0">
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
        <span class="text-[#F0B90B] font-semibold cursor-pointer">Original</span>
      </div>
    </div>
    
    <!-- Chart Container -->
    <div ref="containerRef" class="flex-1 w-full relative z-10">
      <!-- Stats Overlay (Removed to clean up UI) -->
      <div v-if="currentCandle" class="absolute top-2 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#848e9c] z-20 pointer-events-none hidden">
      </div>
        
      <canvas ref="canvasRef" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
    
  </div>
</template>



