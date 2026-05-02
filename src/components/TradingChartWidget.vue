<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { currentPrice, previousPrice } from '../store/tradeStore';
import { Maximize2, Camera, Settings2, BarChart3, TrendingUp as LineChartIcon, CandlestickChart, Info } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const candles = ref<Candle[]>([]);
const selectedInterval = ref('1D');
const chartType = ref<'candle' | 'line' | 'bar'>('candle');
const visibleCandleCount = ref(80);
const scrollOffset = ref(0); // From the end

// Mouse Interaction
const mouseX = ref<number | null>(null);
const mouseY = ref<number | null>(null);
const isHovering = ref(false);
const hoveredCandle = ref<Candle | null>(null);

// Indicators
const showEma20 = ref(true);
const showEma50 = ref(true);
const showVolume = ref(true);

const intervals = ['1s', '15m', '1H', '4H', '1D', '1W'];

// Generate mock data looking somewhat similar to the chart
const generateMockData = (interval: string) => {
  const data: Candle[] = [];
  let price = 65000 + Math.random() * 5000;
  let time = Date.now() - 300 * 24 * 60 * 60 * 1000;
  const intervalMs = getIntervalMs(interval);

  for (let i = 0; i < 300; i++) {
    const open = price;
    const volatility = price * (interval === '1s' ? 0.001 : 0.02);
    const change = (Math.random() - 0.5) * volatility;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * (volatility / 2);
    const low = Math.min(open, close) - Math.random() * (volatility / 2);
    const volume = Math.random() * 1000 + 200;

    data.push({ time, open, high, low, close, volume });
    price = close;
    time += intervalMs;
  }
  candles.value = data;
};

const getIntervalMs = (interval: string) => {
  switch (interval) {
    case '1s': return 1000;
    case '15m': return 15 * 60 * 1000;
    case '1H': return 60 * 60 * 1000;
    case '4H': return 4 * 60 * 60 * 1000;
    case '1D': return 24 * 60 * 60 * 1000;
    case '1W': return 7 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
};

const calculateEMA = (data: Candle[], period: number) => {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  let emaArr: number[] = [];
  let prevEma = data.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
        emaArr.push(NaN);
        continue;
    }
    const currentEma = (data[i].close - prevEma) * k + prevEma;
    emaArr.push(currentEma);
    prevEma = currentEma;
  }
  return emaArr;
};

const ema20 = computed(() => calculateEMA(candles.value, 20));
const ema50 = computed(() => calculateEMA(candles.value, 50));

const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

const formatDate = (time: number) => {
    const date = new Date(time);
    if (selectedInterval.value === '1D' || selectedInterval.value === '1W') {
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
    
    // Slice data based on zoom/pan
    const total = candles.value.length;
    const end = Math.max(visibleCandleCount.value, total - scrollOffset.value);
    const start = Math.max(0, end - visibleCandleCount.value);
    const visibleData = candles.value.slice(start, end);
    const visibleEma20 = ema20.value.slice(start, end);
    const visibleEma50 = ema50.value.slice(start, end);

    // Find Min and Max
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;
    
    visibleData.forEach(c => {
        if (c.low < minPrice) minPrice = c.low;
        if (c.high > maxPrice) maxPrice = c.high;
        if (c.volume > maxVolume) maxVolume = c.volume;
    });
    
    // Include visible EMAs in scale
    if (showEma20.value) {
        visibleEma20.forEach(v => {
            if (!isNaN(v)) {
                if (v < minPrice) minPrice = v;
                if (v > maxPrice) maxPrice = v;
            }
        });
    }
    
    const pricePadding = (maxPrice - minPrice) * 0.15;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const priceRange = maxPrice - minPrice;
    
    const getY = (p: number) => padding.top + chartHeight - ((p - minPrice) / priceRange) * chartHeight;
    const candleWidth = chartWidth / visibleData.length;
    
    // Draw Axis Grid
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(132, 142, 156, 0.1)';
    ctx.lineWidth = 1;

    const numTicks = 8;
    for(let i = 0; i <= numTicks; i++) {
        const price = minPrice + (priceRange / numTicks) * i;
        const y = padding.top + chartHeight - (chartHeight / numTicks) * i;

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        ctx.fillStyle = '#848e9c';
        ctx.fillText(formatNumber(price), padding.left + chartWidth + 10, y);
    }
    
    // Draw Volume Histogram
    if (showVolume.value) {
        const volHeight = chartHeight * 0.2;
        visibleData.forEach((c, i) => {
            const h = (c.volume / maxVolume) * volHeight;
            const x = padding.left + i * candleWidth;
            ctx.fillStyle = c.close >= c.open ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)';
            ctx.fillRect(x + 1, padding.top + chartHeight - h, candleWidth - 2, h);
        });
    }

    // Draw Candles / Lines
    if (chartType.value === 'candle' || chartType.value === 'bar') {
        visibleData.forEach((candle, i) => {
            const x = padding.left + i * candleWidth + candleWidth / 2;
            const openY = getY(candle.open);
            const closeY = getY(candle.close);
            const highY = getY(candle.high);
            const lowY = getY(candle.low);
            const bullish = candle.close >= candle.open;
            const color = bullish ? '#0ecb81' : '#f6465d';
            
            if (chartType.value === 'candle') {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, highY);
                ctx.lineTo(x, lowY);
                ctx.stroke();
                
                ctx.fillStyle = color;
                const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
                const yStart = Math.min(openY, closeY);
                ctx.fillRect(x - (candleWidth * 0.4), yStart, candleWidth * 0.8, bodyHeight);
            } else {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x, highY);
                ctx.lineTo(x, lowY);
                ctx.moveTo(x - candleWidth * 0.3, openY);
                ctx.lineTo(x, openY);
                ctx.moveTo(x, closeY);
                ctx.lineTo(x + candleWidth * 0.3, closeY);
                ctx.stroke();
            }
        });
    } else if (chartType.value === 'line') {
        ctx.beginPath();
        ctx.strokeStyle = '#F0B90B';
        ctx.lineWidth = 2;
        visibleData.forEach((c, i) => {
            const x = padding.left + i * candleWidth + candleWidth / 2;
            const y = getY(c.close);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // Area under line
        ctx.lineTo(padding.left + (visibleData.length - 1) * candleWidth + candleWidth / 2, padding.top + chartHeight);
        ctx.lineTo(padding.left + candleWidth / 2, padding.top + chartHeight);
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
        gradient.addColorStop(0, 'rgba(240, 185, 11, 0.2)');
        gradient.addColorStop(1, 'rgba(240, 185, 11, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    // Draw EMA Lines
    const drawEma = (data: number[], color: string) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        let first = true;
        data.forEach((val, i) => {
            if (isNaN(val)) return;
            const x = padding.left + i * candleWidth + candleWidth / 2;
            const y = getY(val);
            if (first) { ctx.moveTo(x, y); first = false; }
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    };

    if (showEma20.value) drawEma(visibleEma20, '#4e7cf3');
    if (showEma50.value) drawEma(visibleEma50, '#ff70ca');

    // Crosshair
    if (isHovering.value && mouseX.value !== null && mouseY.value !== null) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(132, 142, 156, 0.5)';
        ctx.lineWidth = 1;

        // Vert Line
        ctx.beginPath();
        ctx.moveTo(mouseX.value, padding.top);
        ctx.lineTo(mouseX.value, padding.top + chartHeight);
        ctx.stroke();

        // Horiz Line
        ctx.beginPath();
        ctx.moveTo(padding.left, mouseY.value);
        ctx.lineTo(padding.left + chartWidth, mouseY.value);
        ctx.stroke();
        ctx.setLineDash([]);

        // Axis labels for crosshair
        const priceAtMouse = minPrice + (1 - (mouseY.value - padding.top) / chartHeight) * priceRange;
        
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        // Horizontal line
        ctx.moveTo(padding.left, mouseY.value);
        ctx.lineTo(padding.left + chartWidth, mouseY.value);
        // Vertical line
        ctx.moveTo(mouseX.value, padding.top);
        ctx.lineTo(mouseX.value, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Price Label
        ctx.fillStyle = '#1e2329';
        ctx.fillRect(padding.left + chartWidth + 5, mouseY.value - 10, 70, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(formatNumber(priceAtMouse), padding.left + chartWidth + 10, mouseY.value + 4);

        // Find candle at mouse
        const idx = Math.floor((mouseX.value - padding.left) / candleWidth);
        if (idx >= 0 && idx < visibleData.length) {
            hoveredCandle.value = visibleData[idx];
            const candleX = padding.left + idx * candleWidth + candleWidth / 2;
            ctx.fillStyle = '#1e2329';
            ctx.fillRect(candleX - 30, padding.top + chartHeight + 5, 60, 20);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(formatDate(hoveredCandle.value.time), candleX, padding.top + chartHeight + 15);
            ctx.textAlign = 'left';
        }
    } else {
        hoveredCandle.value = visibleData[visibleData.length - 1];
    }

    // Current Price line
    const lastPrice = candles.value[candles.value.length - 1].close;
    const currentPriceY = getY(lastPrice);
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = lastPrice >= candles.value[candles.value.length - 1].open ? '#0ecb81' : '#f6465d';
    ctx.beginPath();
    ctx.moveTo(padding.left, currentPriceY);
    ctx.lineTo(padding.left + chartWidth, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);
};

const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.value) return;
    const rect = containerRef.value.getBoundingClientRect();
    mouseX.value = e.clientX - rect.left;
    mouseY.value = e.clientY - rect.top;
    isHovering.value = true;
    requestAnimationFrame(drawChart);
};

const handleMouseLeave = () => {
    isHovering.value = false;
    mouseX.value = null;
    mouseY.value = null;
    requestAnimationFrame(drawChart);
};

const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const delta = e.deltaY > 0 ? 1 : -1;
    visibleCandleCount.value = Math.max(20, Math.min(200, visibleCandleCount.value + delta * 5));
    requestAnimationFrame(drawChart);
};

let isDragging = false;
let startX = 0;
let startOffset = 0;

const handleMouseDown = (e: MouseEvent) => {
    isDragging = true;
    startX = e.clientX;
    startOffset = scrollOffset.value;
};

const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const candlesMoved = Math.round(dx / (containerRef.value?.clientWidth || 100) * visibleCandleCount.value);
    scrollOffset.value = Math.max(0, Math.min(candles.value.length - visibleCandleCount.value, startOffset + candlesMoved));
    requestAnimationFrame(drawChart);
};

const handleGlobalMouseUp = () => {
    isDragging = false;
};

onMounted(() => {
  generateMockData(selectedInterval.value);
  
  if (containerRef.value) {
      resizeObserver = new ResizeObserver(() => requestAnimationFrame(drawChart));
      resizeObserver.observe(containerRef.value);
  }
  
  window.addEventListener('mousemove', handleGlobalMouseMove);
  window.addEventListener('mouseup', handleGlobalMouseUp);
  
  // Real-time tick simulation
  const interval = setInterval(() => {
      if (candles.value.length > 0) {
          const lastCandle = candles.value[candles.value.length - 1];
          const tick = (Math.random() - 0.5) * 50;
          lastCandle.close += tick;
          lastCandle.high = Math.max(lastCandle.high, lastCandle.close);
          lastCandle.low = Math.min(lastCandle.low, lastCandle.close);
          requestAnimationFrame(drawChart);
      }
  }, 1000);
  
  onUnmounted(() => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
  });
});

watch(selectedInterval, (newVal) => {
    generateMockData(newVal);
    requestAnimationFrame(drawChart);
});

watch(chartType, () => requestAnimationFrame(drawChart));
</script>

<template>
  <div class="group relative flex flex-col w-full h-full min-h-[450px] lg:min-h-0 rounded-2xl border border-white/5 bg-[#0b0e11] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 hover:border-white/10">
    
    <!-- Top Toolbar -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-[#1e2329] text-xs text-[#848e9c] shrink-0 bg-[#161a1e]/50 backdrop-blur-md z-30">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5 p-1 bg-[#0b0e11] rounded-lg border border-white/5">
          <button 
            v-for="int in intervals" 
            :key="int"
            @click="selectedInterval = int"
            :class="cn('px-2.5 py-1 rounded-md transition-all font-semibold', selectedInterval === int ? 'bg-[#F0B90B] text-[#0b0e11] shadow-lg' : 'hover:text-white hover:bg-white/5')"
          >
            {{ int }}
          </button>
        </div>

        <div class="h-4 w-[1px] bg-white/10"></div>

        <div class="flex items-center gap-1 p-1 bg-[#0b0e11] rounded-lg border border-white/5">
          <button @click="chartType = 'candle'" :class="cn('p-1.5 rounded-md', chartType === 'candle' ? 'bg-white/10 text-[#F0B90B]' : 'hover:text-white')">
            <CandlestickChart class="w-4 h-4" />
          </button>
          <button @click="chartType = 'line'" :class="cn('p-1.5 rounded-md', chartType === 'line' ? 'bg-white/10 text-[#F0B90B]' : 'hover:text-white')">
            <LineChartIcon class="w-4 h-4" />
          </button>
          <button @click="chartType = 'bar'" :class="cn('p-1.5 rounded-md', chartType === 'bar' ? 'bg-white/10 text-[#F0B90B]' : 'hover:text-white')">
            <BarChart3 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 mr-2">
            <button @click="showEma20 = !showEma20" :class="cn('text-[10px] px-1.5 py-0.5 rounded border transition-colors', showEma20 ? 'border-[#4e7cf3] text-[#4e7cf3] bg-[#4e7cf3]/10' : 'border-white/5 opacity-40')">EMA 20</button>
            <button @click="showEma50 = !showEma50" :class="cn('text-[10px] px-1.5 py-0.5 rounded border transition-colors', showEma50 ? 'border-[#ff70ca] text-[#ff70ca] bg-[#ff70ca]/10' : 'border-white/5 opacity-40')">EMA 50</button>
        </div>
        <button class="p-1.5 hover:bg-white/5 rounded-md transition-colors"><Camera class="w-4 h-4" /></button>
        <button class="p-1.5 hover:bg-white/5 rounded-md transition-colors"><Maximize2 class="w-4 h-4" /></button>
        <button class="p-1.5 hover:bg-white/5 rounded-md transition-colors"><Settings2 class="w-4 h-4" /></button>
      </div>
    </div>
    
    <!-- Stats Overlay -->
    <div v-if="hoveredCandle" class="absolute top-14 left-4 z-20 flex flex-wrap items-center gap-4 text-[11px] font-mono pointer-events-none bg-[#0b0e11]/60 backdrop-blur-md p-2 rounded-lg border border-white/5 shadow-xl">
        <div class="flex items-center gap-1.5">
            <span class="text-[#848e9c]">O</span>
            <span :class="hoveredCandle.close >= hoveredCandle.open ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ formatNumber(hoveredCandle.open) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
            <span class="text-[#848e9c]">H</span>
            <span :class="hoveredCandle.close >= hoveredCandle.open ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ formatNumber(hoveredCandle.high) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
            <span class="text-[#848e9c]">L</span>
            <span :class="hoveredCandle.close >= hoveredCandle.open ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ formatNumber(hoveredCandle.low) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
            <span class="text-[#848e9c]">C</span>
            <span :class="hoveredCandle.close >= hoveredCandle.open ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ formatNumber(hoveredCandle.close) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
            <span class="text-[#848e9c]">V</span>
            <span class="text-[#EAECEF]">{{ formatNumber(hoveredCandle.volume) }}</span>
        </div>
    </div>

    <!-- Chart Container -->
    <div 
        ref="containerRef" 
        class="flex-1 w-full relative z-10 cursor-crosshair select-none"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
        @wheel="handleWheel"
        @mousedown="handleMouseDown"
    >
      <canvas ref="canvasRef" style="width: 100%; height: 100%; display: block;"></canvas>

      <!-- Zoom/Pan Help -->
      <div class="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div class="flex items-center gap-2 text-[10px] text-[#848e9c] bg-[#1e2329]/50 backdrop-blur-sm px-2 py-1 rounded border border-white/5">
              <Info class="w-3 h-3" />
              <span>Scroll to Zoom • Drag to Pan</span>
          </div>
      </div>
    </div>
    
  </div>
</template>

<style scoped>
canvas {
    touch-action: none;
}
</style>




