<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { currentPrice, activePositions, openOrders } from '../store/tradeStore';
import ActivePositions from '../components/ActivePositions.vue';
import OrderPanel from '../components/OrderPanel.vue';
import TradingChartWidget from '../components/TradingChartWidget.vue';
import { cn } from '../lib/utils';
import { Bitcoin, Activity, TrendingUp, TrendingDown, Info, ShieldAlert, BarChart2, Clock, CheckCircle2, AlertTriangle, Settings, Maximize2, Zap } from 'lucide-vue-next';
import { wsManager } from '../lib/wsManager';

const isConnected = wsManager.isConnected;
const isLoading = ref(true);

// Mock 24h stats since store doesn't provide them all natively
const stats24h = computed(() => {
  const price = currentPrice.value;
  return {
    high: price * 1.02,
    low: price * 0.97,
    volume: 14523.45,
    volumeUsdt: 14523.45 * price,
    changePerc: +1.99,
    changeAbs: price * 0.0199
  };
});

onMounted(() => {
  // Simulate loading state for layout initialization
  setTimeout(() => {
    isLoading.value = false;
  }, 800);
});

const formatNum = (num: number, decimals: number = 2) => num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const emit = defineEmits(['open-settings']);

// Tabs for bottom section
const activeBottomTab = ref<'positions' | 'orders' | 'history'>('positions');
</script>

<template>
  <div class="flex flex-col h-full bg-[#030712] relative overflow-hidden font-sans">
    
    <!-- Liquid Glassmorphism Ambient Background -->
    <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[#0ecb81]/15 to-transparent blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-gradient-to-tl from-[#F0B90B]/15 to-transparent blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
    <div class="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-gradient-to-bl from-[#627EEA]/10 to-transparent blur-[100px] rounded-full pointer-events-none mix-blend-screen"></div>

    <!-- Main Loader -->
    <div v-if="isLoading" class="absolute inset-0 z-50 flex items-center justify-center bg-[#030712]/80 backdrop-blur-xl">
      <div class="flex flex-col items-center gap-4">
        <div class="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#F0B90B] animate-spin"></div>
        <div class="text-[#848e9c] text-sm font-medium tracking-widest uppercase animate-pulse">Initializing Terminal</div>
      </div>
    </div>

    <!-- Content Wrapper -->
    <div class="flex flex-col h-full p-2 sm:p-3 xl:p-4 gap-3 xl:gap-4 z-10">
      
      <!-- Top Header Bar (Market Info) -->
      <header class="shrink-0 relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-500 hover:bg-white/[0.04] min-h-[56px]">
        
        <div class="flex items-center gap-6 z-10 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <!-- Pair Identity -->
          <div class="flex items-center gap-4 group cursor-pointer">
            <div class="relative w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1e2329] to-[#0b0e11] border border-white/10 shadow-inner group-hover:border-[#F0B90B]/40 transition-colors duration-300">
              <Bitcoin class="w-6 h-6 text-[#F0B90B]" />
              <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0ecb81] rounded-full border-2 border-[#0b0e11] flex items-center justify-center">
                 <CheckCircle2 class="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <div class="flex flex-col">
              <div class="flex items-end gap-2">
                <h1 class="text-2xl font-black text-white tracking-tight leading-none">BTC<span class="text-[#848e9c] font-medium text-lg">/USDT</span></h1>
              </div>
              <span class="text-xs text-[#848e9c] flex items-center gap-1 mt-1 font-medium bg-white/5 w-max px-2 py-0.5 rounded text-nowrap">
                <BarChart2 class="w-3 h-3 text-[#F0B90B]" />
                Bitcoin
              </span>
            </div>
          </div>

          <!-- Divider -->
          <div class="h-10 w-px bg-white/10 hidden lg:block"></div>

          <!-- Stats Grid -->
          <div class="flex items-center gap-6 lg:gap-8 flex-nowrap">
            <!-- Price Focus -->
            <div class="flex flex-col items-start gap-1">
              <div :class="cn('text-2xl font-mono font-bold tracking-tight leading-none', stats24h.changePerc >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                {{ formatNum(currentPrice) }}
              </div>
              <div class="text-[11px] font-mono text-white flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded shadow-sm">
                <span>{{ stats24h.changePerc >= 0 ? '+' : '' }}{{ formatNum(stats24h.changeAbs) }}</span>
                <span>({{ stats24h.changePerc > 0 ? '+' : '' }}{{ stats24h.changePerc }}%)</span>
              </div>
            </div>

            <!-- Contextual Stats -->
            <div class="flex gap-6 lg:gap-8 whitespace-nowrap hidden md:flex">
              <div class="flex flex-col gap-1">
                <span class="text-[10px] text-[#848e9c] font-semibold uppercase tracking-wider">24h High</span>
                <span class="text-[13px] font-mono text-[#EAECEF] font-medium">{{ formatNum(stats24h.high) }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-[10px] text-[#848e9c] font-semibold uppercase tracking-wider">24h Low</span>
                <span class="text-[13px] font-mono text-[#EAECEF] font-medium">{{ formatNum(stats24h.low) }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-[10px] text-[#848e9c] font-semibold uppercase tracking-wider">24h Vol(BTC)</span>
                <span class="text-[13px] font-mono text-[#EAECEF] font-medium">{{ formatNum(stats24h.volume, 0) }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-[10px] text-[#848e9c] font-semibold uppercase tracking-wider">24h Vol(USDT)</span>
                <span class="text-[13px] font-mono text-[#EAECEF] font-medium">{{ formatNum(stats24h.volumeUsdt, 0) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Utility Right Actions -->
        <div class="flex items-center gap-3 z-10 shrink-0">
           <!-- Network latency -->
           <div class="flex items-center gap-2 bg-black/20 border border-white/5 px-3 py-1.5 rounded-full shadow-inner">
              <div :class="cn('w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px]', isConnected ? 'bg-[#0ecb81] shadow-[#0ecb81]' : 'bg-[#f6465d] shadow-[#f6465d]')"></div>
              <span class="text-[10px] font-bold text-[#848e9c] uppercase tracking-wide">{{ isConnected ? '12ms' : 'Offline' }}</span>
           </div>
           
           <!-- Settings/Maximise -->
           <button @click="emit('open-settings')" class="w-8 h-8 rounded-full bg-white/5 border border-white/5 hover:border-[#F0B90B]/50 hover:bg-white/10 flex items-center justify-center transition-all">
              <Settings class="w-4 h-4 text-[#848e9c] hover:text-white transition-colors" />
           </button>
           <button class="w-8 h-8 rounded-full bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 flex items-center justify-center transition-all hidden sm:flex">
              <Maximize2 class="w-4 h-4 text-[#848e9c] hover:text-white transition-colors" />
           </button>
        </div>
      </header>

      <!-- Main Middle Zone (Chart + Order Panel) -->
      <div class="flex flex-col lg:flex-row flex-1 gap-3 xl:gap-4 min-h-0 z-10">
        
        <!-- Chart Area -->
        <div class="flex-1 flex flex-col rounded-2xl bg-[#0b0e11]/40 backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
          <div class="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.5)] z-0"></div>
          
          <!-- Liquid Border Top Glow -->
          <div class="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F0B90B]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

          <TradingChartWidget 
            symbol="BTCUSDT" 
            interval="1m" 
            :isSynced="true" 
            panelId="main-trade-chart"
            class="w-full h-full border-0 !shadow-none !m-0 !rounded-none !bg-transparent shrink z-10" 
          />
        </div>

        <!-- Order Station (OrderBook + Inputs) -->
        <div class="lg:w-[600px] xl:w-[680px] shrink-0 flex flex-col rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group lg:h-[543px] pt-[3px]">
           <!-- Internal Container to hold the OrderPanel which has its own height expectations -->
           <div class="w-full h-full p-1 sm:p-2">
             <OrderPanel class="h-full !gap-2" />
           </div>
        </div>

      </div>

      <!-- Bottom Zone (Positions & History) -->
      <div class="shrink-0 rounded-2xl bg-white/[0.02] backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col z-10 overflow-hidden group pl-0 pb-0 lg:h-[150px] min-h-[150px]">
         
         <!-- Tab Header -->
         <div class="flex items-center gap-6 px-4 pt-3 pb-0 border-b border-white/5 relative z-10 bg-black/20">
           <button 
             @click="activeBottomTab = 'positions'"
             class="relative pb-3 text-[13px] font-bold uppercase tracking-wider transition-colors duration-300 outline-none"
             :class="activeBottomTab === 'positions' ? 'text-white' : 'text-[#848e9c] hover:text-[#EAECEF]'"
           >
             Active Positions
             <span class="ml-1.5 bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{{ activePositions.length }}</span>
             <div v-if="activeBottomTab === 'positions'" class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F0B90B] rounded-t-full shadow-[0_-2px_8px_#F0B90B]"></div>
           </button>
           
           <button 
             @click="activeBottomTab = 'orders'"
             class="relative pb-3 text-[13px] font-bold uppercase tracking-wider transition-colors duration-300 outline-none"
             :class="activeBottomTab === 'orders' ? 'text-white' : 'text-[#848e9c] hover:text-[#EAECEF]'"
           >
             Open Orders
             <span class="ml-1.5 bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{{ openOrders.length }}</span>
             <div v-if="activeBottomTab === 'orders'" class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F0B90B] rounded-t-full shadow-[0_-2px_8px_#F0B90B]"></div>
           </button>

           <button 
             @click="activeBottomTab = 'history'"
             class="relative pb-3 text-[13px] font-bold uppercase tracking-wider transition-colors duration-300 outline-none hidden sm:block"
             :class="activeBottomTab === 'history' ? 'text-white' : 'text-[#848e9c] hover:text-[#EAECEF]'"
           >
             Trade History
             <div v-if="activeBottomTab === 'history'" class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F0B90B] rounded-t-full shadow-[0_-2px_8px_#F0B90B]"></div>
           </button>
         </div>

         <!-- Tab Content -->
         <div class="flex-1 overflow-hidden relative">
           
           <div v-show="activeBottomTab === 'positions'" class="absolute inset-0 overflow-y-auto no-scrollbar">
             <!-- ActivePositions component is originally tailored to be a standalone card, so we wrap it to fit liquid style -->
             <!-- We apply negative margins if ActivePositions has built-in padding we want to override, but usually passing classes works -->
             <ActivePositions class="w-full !border-0 !bg-transparent !shadow-none !rounded-none !p-2" />
           </div>

           <div v-show="activeBottomTab === 'orders'" class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <template v-if="openOrders.length === 0">
                <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                   <Clock class="w-6 h-6 text-[#474d57]" />
                </div>
                <h3 class="text-white text-sm font-semibold mb-1">No Open Orders</h3>
                <p class="text-[#848e9c] text-xs max-w-[250px]">You currently have no active pending orders in the market.</p>
              </template>
              <template v-else>
                 <div class="w-full h-full bg-red-500/10 flex items-center justify-center text-red-400">
                    Replace with OpenOrdersTable component when available.
                 </div>
              </template>
           </div>

           <div v-show="activeBottomTab === 'history'" class="absolute inset-0 flex items-center justify-center text-[#474d57] text-sm">
              <div class="flex flex-col items-center gap-2">
                 <Activity class="w-8 h-8 opacity-50" />
                 <span>End of History</span>
              </div>
           </div>

         </div>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');

.font-sans {
  font-family: 'Inter', sans-serif;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Glassmorphism Utilities */
.gpu-glass {
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  will-change: transform, opacity;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0-[.05]);
}
</style>
