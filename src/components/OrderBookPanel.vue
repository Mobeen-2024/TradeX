<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { ArrowUp, ArrowDown } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { orderBook, currentPrice, previousPrice, selectedPrice } from '../store/tradeStore';

const viewMode = ref<'orderbook' | 'depth'>('orderbook');
const depthCanvas = ref<HTMLCanvasElement | null>(null);

const currentTime = ref('');
let timer: any;

const orderBookAsks = computed(() => orderBook.value.asks.slice(0, 15).map(a => ({ price: a[0], amount: a[1] })));
const orderBookBids = computed(() => orderBook.value.bids.slice(0, 15).map(b => ({ price: b[0], amount: b[1] })));

const marketSentiment = computed(() => {
  const totalBids = orderBookBids.value.reduce((acc, b) => acc + b.amount, 0);
  const totalAsks = orderBookAsks.value.reduce((acc, a) => acc + a.amount, 0);
  if (totalBids + totalAsks === 0) return 50;
  return (totalBids / (totalBids + totalAsks)) * 100;
});

const priceChangeClass = ref('');
watch(currentPrice, (newPrice, oldPrice) => {
    if (newPrice > oldPrice) {
      priceChangeClass.value = 'animate-price-up';
    } else if (newPrice < oldPrice) {
      priceChangeClass.value = 'animate-price-down';
    }
    setTimeout(() => { priceChangeClass.value = ''; }, 300);
});

const drawDepthChart = () => {
    if (!depthCanvas.value) return;
    const ctx = depthCanvas.value.getContext('2d');
    if (!ctx) return;

    const w = depthCanvas.value.width;
    const h = depthCanvas.value.height;
    ctx.clearRect(0, 0, w, h);

    const bids = orderBook.value.bids;
    const asks = orderBook.value.asks;
    if (bids.length === 0 || asks.length === 0) return;

    const minPrice = bids[bids.length - 1][0];
    const maxPrice = asks[asks.length - 1][0];
    const range = maxPrice - minPrice;

    const getX = (p: number) => ((p - minPrice) / range) * w;

    let bidVol = 0;
    const bidPoints = bids.map(b => {
        bidVol += b[1];
        return { x: getX(b[0]), y: bidVol };
    });

    let askVol = 0;
    const askPoints = asks.map(a => {
        askVol += a[1];
        return { x: getX(a[0]), y: askVol };
    });

    const maxVol = Math.max(bidVol, askVol);
    const getY = (v: number) => h - (v / maxVol) * h * 0.8;

    ctx.beginPath();
    ctx.moveTo(0, h);
    bidPoints.forEach(p => ctx.lineTo(p.x, getY(p.y)));
    ctx.lineTo(getX(bids[0][0]), h);
    ctx.fillStyle = 'rgba(14, 203, 129, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#0ecb81';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w, h);
    askPoints.forEach(p => ctx.lineTo(p.x, getY(p.y)));
    ctx.lineTo(getX(asks[0][0]), h);
    ctx.fillStyle = 'rgba(246, 70, 93, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#f6465d';
    ctx.stroke();
};

watch([orderBook, viewMode], () => {
    if (viewMode.value === 'depth') {
        nextTick(drawDepthChart);
    }
}, { deep: true });

onMounted(() => {
  const updateTime = () => {
    const d = new Date();
    currentTime.value = d.toLocaleTimeString('en-US', { hour12: false });
  };
  updateTime();
  timer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});

// Virtual Scrolling
const ROW_HEIGHT = 20; 
const OVERSCAN = 3;    

const obContainer = ref<HTMLDivElement | null>(null);
const scrollTop = ref(0);
const containerHeight = ref(300);

const onObScroll = () => {
  scrollTop.value = obContainer.value?.scrollTop ?? 0;
};

const allAsks = computed(() => orderBook.value.asks.map(a => ({ price: a[0], amount: a[1] })));
const allBids = computed(() => orderBook.value.bids.map(b => ({ price: b[0], amount: b[1] })));

const virtualAsks = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN);
  const end = start + Math.ceil(containerHeight.value / ROW_HEIGHT) + OVERSCAN * 2;
  return allAsks.value.slice(start, end);
});

const virtualBids = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN);
  const end = start + Math.ceil(containerHeight.value / ROW_HEIGHT) + OVERSCAN * 2;
  return allBids.value.slice(start, end);
});

const askPaddingTop = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN) * ROW_HEIGHT);
const askPaddingBottom = computed(() => Math.max(0, allAsks.value.length - virtualAsks.value.length) * ROW_HEIGHT - askPaddingTop.value);
const bidPaddingTop = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN) * ROW_HEIGHT);
const bidPaddingBottom = computed(() => Math.max(0, allBids.value.length - virtualBids.value.length) * ROW_HEIGHT - bidPaddingTop.value);

const maxObVisualAmount = computed(() => {
  const allAmounts = [...allAsks.value, ...allBids.value].map(r => r.amount);
  return Math.max(...allAmounts, 0.001);
});

onMounted(() => {
  if (obContainer.value) {
    containerHeight.value = obContainer.value.clientHeight;
    const ro = new ResizeObserver(entries => {
      containerHeight.value = entries[0].contentRect.height;
    });
    ro.observe(obContainer.value);
    onUnmounted(() => ro.disconnect());
  }
});
</script>

<template>
  <div class="relative bg-[#0b0e11]/60 backdrop-blur-2xl border border-white/5 rounded-xl flex flex-col overflow-hidden flex-1 gpu-glass">
    <!-- Ambient Tinting -->
    <div class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-emerald-500/5 to-transparent z-0"></div>
    
      <!-- View Mode Toggle -->
      <div class="relative z-10 flex items-center justify-between px-1 sm:px-2 py-1.5 sm:py-2 border-b border-[#1e2329] bg-[#161a1e]/30">
        <div class="flex items-center gap-1 sm:gap-2">
          <button 
            @click="viewMode = 'orderbook'"
            :class="cn('px-2 py-1 text-[9px] sm:text-[10px] font-bold uppercase rounded transition-all', viewMode === 'orderbook' ? 'bg-[#2b3139] text-[#F0B90B] shadow-sm' : 'text-[#848e9c] hover:text-[#EAECEF]')"
          >
            Order Book
          </button>
          <button 
            @click="viewMode = 'depth'"
            :class="cn('px-2 py-1 text-[9px] sm:text-[10px] font-bold uppercase rounded transition-all', viewMode === 'depth' ? 'bg-[#2b3139] text-[#F0B90B] shadow-sm' : 'text-[#848e9c] hover:text-[#EAECEF]')"
          >
            Depth Chart
          </button>
        </div>
        <div class="text-[#848e9c] text-[9px] sm:text-[10px] font-mono mr-1">
          {{ currentTime }}
        </div>
      </div>

      <div v-if="viewMode === 'orderbook'" class="flex-1 flex flex-col overflow-hidden p-1 sm:p-2">
        <!-- Table Headers -->
        <div class="flex justify-between px-1 mb-1 text-[#848e9c] text-[9px] sm:text-[10px] uppercase font-bold sticky top-0 bg-[#0b0e11] z-30">
          <span>Price(USDT)</span>
          <span>Amount(BTC)</span>
        </div>

        <!-- Virtual Order Book Container -->
        <div 
          ref="obContainer" 
          class="flex-1 overflow-y-auto no-scrollbar relative font-mono tracking-tight"
          @scroll.passive="onObScroll"
        >
          <!-- Asks (spacers + slice) -->
          <div :style="{ paddingTop: askPaddingTop + 'px', paddingBottom: askPaddingBottom + 'px' }">
            <div
              v-for="ask in virtualAsks"
              :key="ask.price"
              class="flex justify-between px-1 py-[2px] cursor-pointer relative group hover:bg-[#1e2329]/80 transition-colors duration-150"
              style="height: 20px;"
              @click="selectedPrice = ask.price"
            >
              <!-- Volume bar background -->
              <div 
                class="absolute inset-y-0 right-0 bg-gradient-to-l from-[#f6465d]/20 to-transparent group-hover:from-[#f6465d]/30 z-0 transition-all duration-300 ease-out"
                :style="{ width: `${(ask.amount / maxObVisualAmount) * 100}%` }"
              />
              <span class="text-[#f6465d] text-[11px] sm:text-[12px] relative z-10">{{ ask.price.toFixed(2) }}</span>
              <span class="text-[#EAECEF] text-[11px] sm:text-[12px] relative z-10">{{ ask.amount.toFixed(4) }}</span>
            </div>
          </div>

          <!-- Middle: Market Price (sticky) -->
          <div class="sticky top-0 z-20 py-1 sm:py-2 border-y border-[#1e2329] my-0.5 text-center bg-[#0b0e11]/90 backdrop-blur-md transition-all duration-300 gpu-glass" :class="priceChangeClass">
            <div class="flex flex-col items-center justify-center py-0.5 sm:py-1">
              <div class="flex items-center gap-1 sm:gap-2">
                <span :class="cn('font-bold text-base sm:text-xl transition-colors duration-300 flex items-center', currentPrice >= previousPrice ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                  {{ currentPrice.toFixed(2) }} 
                  <ArrowUp v-if="currentPrice >= previousPrice" class="w-3 h-3 sm:w-5 sm:h-5 ml-1" />
                  <ArrowDown v-else class="w-3 h-3 sm:w-5 sm:h-5 ml-1" />
                </span>
              </div>
            </div>
          </div>

          <!-- Bids (spacers + slice) -->
          <div :style="{ paddingTop: bidPaddingTop + 'px', paddingBottom: bidPaddingBottom + 'px' }">
            <div
              v-for="bid in virtualBids"
              :key="bid.price"
              class="flex justify-between px-1 py-[2px] cursor-pointer relative group hover:bg-[#1e2329]/80 transition-colors duration-150"
              style="height: 20px;"
              @click="selectedPrice = bid.price"
            >
              <!-- Volume bar background -->
              <div 
                class="absolute inset-y-0 right-0 bg-gradient-to-l from-[#0ecb81]/20 to-transparent group-hover:from-[#0ecb81]/30 z-0 transition-all duration-300 ease-out"
                :style="{ width: `${(bid.amount / maxObVisualAmount) * 100}%` }"
              />
              <span class="text-[#0ecb81] text-[11px] sm:text-[12px] relative z-10">{{ bid.price.toFixed(2) }}</span>
              <span class="text-[#EAECEF] text-[11px] sm:text-[12px] relative z-10">{{ bid.amount.toFixed(4) }}</span>
            </div>
          </div>
        </div>
        
        <!-- Sentiment Bar -->
        <div class="px-2 py-1.5 border-t border-[#1e2329] bg-[#0b0e11] shrink-0">
            <div class="flex justify-between text-[9px] font-bold uppercase tracking-wider mb-1">
                <span class="text-[#0ecb81]">{{ marketSentiment.toFixed(1) }}% Buy</span>
                <span class="text-[#f6465d]">{{ (100 - marketSentiment).toFixed(1) }}% Sell</span>
            </div>
            <div class="h-1.5 w-full bg-[#1e2329] rounded-full overflow-hidden flex">
                <div class="h-full bg-[#0ecb81] transition-all duration-500 ease-out" :style="`width: ${marketSentiment}%`"></div>
                <div class="h-full bg-[#f6465d] transition-all duration-500 ease-out" :style="`width: ${100 - marketSentiment}%`"></div>
            </div>
        </div>
      </div>

      <!-- Depth Chart View -->
      <div v-else class="flex-1 flex flex-col min-h-[250px] relative p-2 bg-[#0b0e11]">
          <canvas ref="depthCanvas" class="w-full h-full" width="400" height="300"></canvas>
          <div class="absolute top-2 left-2 text-[9px] text-[#848e9c] font-mono">LIQUIDITY DEPTH</div>
      </div>
    </div>
</template>
