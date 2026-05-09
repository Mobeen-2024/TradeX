<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { currentPrice, activePositions, openOrders } from '../store/tradeStore';
import ActivePositions from '../components/ActivePositions.vue';
import OrderPanel from '../components/OrderPanel.vue';
import TradingChartWidget from '../components/TradingChartWidget.vue';
import { cn } from '../lib/utils';
import { Bitcoin, Activity, TrendingUp, TrendingDown, Info, ShieldAlert, BarChart2, Clock, CheckCircle2, AlertTriangle, Settings, Maximize2, Zap, X } from 'lucide-vue-next';
import { wsManager } from '../lib/wsManager';

const isConnected = wsManager.isConnected;
const isLoading = ref(true);

// Dynamic 24h stats logic
const stats24h = computed(() => {
  const price = currentPrice.value;
  // Use price to drive variations in high/low for a more alive feel
  const volatilityFactor = (Math.sin(Date.now() / 5000) * 0.001); 
  const baseHigh = price * (1.02 + volatilityFactor);
  const baseLow = price * (0.97 - volatilityFactor);
  const changePerc = +1.99 + (volatilityFactor * 100);
  
  return {
    high: baseHigh,
    low: baseLow,
    volume: 14523.45 + (price * 0.001),
    volumeUsdt: 14523.45 * price,
    changePerc: parseFloat(changePerc.toFixed(2)),
    changeAbs: price * (changePerc / 100)
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
      <header class="shrink-0 relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.4)] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-500 hover:bg-white/[0.05] min-h-[70px]">
        
        <div class="flex items-center gap-6 z-10 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <!-- Pair Identity with Pulsing Glow -->
          <div class="flex items-center gap-4 group cursor-pointer">
            <div class="relative w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e2329] to-[#0b0e11] border border-white/15 shadow-[0_0_20px_rgba(240,185,11,0.1)] group-hover:border-[#F0B90B]/50 transition-all duration-300">
              <div class="absolute inset-0 bg-[#F0B90B]/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Bitcoin class="w-7 h-7 text-[#F0B90B] drop-shadow-[0_0_8px_rgba(240,185,11,0.5)]" />
              <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0ecb81] rounded-full border-2 border-[#0b0e11] flex items-center justify-center shadow-lg">
                 <CheckCircle2 class="w-3 h-3 text-white" />
              </div>
            </div>
            <div class="flex flex-col">
              <div class="flex items-end gap-2">
                <h1 class="text-3xl font-black text-white tracking-tighter leading-none group-hover:text-[#F0B90B] transition-colors">BTC<span class="text-[#848e9c] font-semibold text-xl">/USDT</span></h1>
              </div>
              <div class="flex items-center gap-2 mt-1.5">
                <span class="text-[10px] text-white/90 font-bold uppercase tracking-widest bg-[#F0B90B]/20 border border-[#F0B90B]/30 px-2 py-0.5 rounded-full">Bitcoin</span>
                <span class="text-[10px] text-[#848e9c] font-medium flex items-center gap-1">
                  <Activity class="w-3 h-3 text-[#0ecb81]" />
                  Market Open
                </span>
              </div>
            </div>
          </div>

          <!-- Vertical Divider with Gradient -->
          <div class="h-12 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent hidden lg:block mx-2"></div>

          <!-- Interactive Stats Grid -->
          <div class="flex items-center gap-8 lg:gap-10 flex-nowrap">
            <!-- Dynamic Price with Flash Effect -->
            <div class="flex flex-col items-start gap-1">
              <div :class="cn('text-3xl font-mono font-black tracking-tighter leading-none transition-colors duration-200', stats24h.changePerc >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                {{ formatNum(currentPrice) }}
              </div>
              <div class="flex items-center gap-1.5">
                <div :class="cn('text-[11px] font-mono font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1', stats24h.changePerc >= 0 ? 'bg-[#0ecb81]/20 text-[#0ecb81]' : 'bg-[#f6465d]/20 text-[#f6465d]')">
                  <TrendingUp v-if="stats24h.changePerc >= 0" class="w-3 h-3" />
                  <TrendingDown v-else class="w-3 h-3" />
                  <span>{{ stats24h.changePerc >= 0 ? '+' : '' }}{{ stats24h.changePerc }}%</span>
                </div>
                <span class="text-[10px] font-mono text-[#848e9c] font-bold tracking-tight">
                  Vol: {{ formatNum(stats24h.volume, 0) }}
                </span>
              </div>
            </div>

            <!-- Enhanced Stats Section -->
            <div class="flex gap-8 lg:gap-12 whitespace-nowrap hidden md:flex items-center">
              <div class="flex flex-col gap-1.5">
                <span class="text-[10px] text-[#848e9c] font-bold uppercase tracking-[0.2em] opacity-60">24h High</span>
                <span class="text-[14px] font-mono text-white font-black drop-shadow-sm">{{ formatNum(stats24h.high) }}</span>
              </div>
              <div class="flex flex-col gap-1.5">
                <span class="text-[10px] text-[#848e9c] font-bold uppercase tracking-[0.2em] opacity-60">24h Low</span>
                <span class="text-[14px] font-mono text-white font-black drop-shadow-sm">{{ formatNum(stats24h.low) }}</span>
              </div>
              <div class="flex flex-col gap-1.5 group/stat">
                <span class="text-[10px] text-[#848e9c] font-bold uppercase tracking-[0.2em] opacity-60 group-hover/stat:text-[#F0B90B] transition-colors">Market Cap</span>
                <span class="text-[14px] font-mono text-[#EAECEF] font-black tracking-tight">$1.24T</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Professional Utility Actions -->
        <div class="flex items-center gap-4 z-10 shrink-0">
           <!-- Connection Status with Latency -->
           <div class="flex items-center gap-3 bg-black/40 border border-white/10 px-4 py-2 rounded-2xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] hover:border-white/20 transition-all cursor-help" title="Websocket Connection Strength">
              <div class="flex flex-col items-end">
                <span class="text-[9px] font-black text-[#848e9c] uppercase tracking-widest leading-none mb-1">Latency</span>
                <span :class="cn('text-[11px] font-mono font-bold leading-none', isConnected ? 'text-[#0ecb81]' : 'text-[#f6465d]')">{{ isConnected ? '12ms' : 'Offline' }}</span>
              </div>
              <div class="relative flex items-center justify-center">
                <div :class="cn('w-3 h-3 rounded-full shadow-[0_0_12px]', isConnected ? 'bg-[#0ecb81] shadow-[#0ecb81]' : 'bg-[#f6465d] shadow-[#f6465d]')"></div>
                <div v-if="isConnected" class="absolute inset-0 bg-[#0ecb81] rounded-full animate-ping opacity-20"></div>
              </div>
           </div>
           
           <!-- Control Buttons -->
           <div class="flex items-center gap-2">
             <button @click="emit('open-settings')" class="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 hover:border-[#F0B90B]/50 hover:bg-[#F0B90B]/10 flex items-center justify-center transition-all group/btn shadow-lg">
                <Settings class="w-5 h-5 text-[#848e9c] group-hover/btn:text-[#F0B90B] group-hover/btn:rotate-90 transition-all duration-500" />
             </button>
             <button class="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 flex items-center justify-center transition-all group/btn shadow-lg hidden sm:flex">
                <Maximize2 class="w-5 h-5 text-[#848e9c] group-hover/btn:text-white transition-colors" />
             </button>
           </div>
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
      <div class="shrink-0 rounded-3xl bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.4)] flex flex-col z-10 overflow-hidden group pl-0 pb-0 lg:h-[220px] min-h-[200px] transition-all duration-500 hover:border-white/20">
         
         <!-- Premium Tab Header -->
         <div class="flex items-center gap-8 px-6 pt-4 pb-0 border-b border-white/10 relative z-10 bg-black/30 backdrop-blur-md">
           <button 
             @click="activeBottomTab = 'positions'"
             class="relative pb-4 text-[13px] font-black uppercase tracking-[0.1em] transition-all duration-300 outline-none flex items-center gap-2"
             :class="activeBottomTab === 'positions' ? 'text-white' : 'text-[#848e9c] hover:text-[#EAECEF]'"
           >
             <Activity class="w-4 h-4" />
             Active Positions
             <span class="ml-2 bg-[#0ecb81]/20 text-[#0ecb81] px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm border border-[#0ecb81]/30">{{ activePositions.length }}</span>
             <div v-if="activeBottomTab === 'positions'" class="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent rounded-t-full shadow-[0_-4px_12px_#F0B90B]"></div>
           </button>
           
           <button 
             @click="activeBottomTab = 'orders'"
             class="relative pb-4 text-[13px] font-black uppercase tracking-[0.1em] transition-all duration-300 outline-none flex items-center gap-2"
             :class="activeBottomTab === 'orders' ? 'text-white' : 'text-[#848e9c] hover:text-[#EAECEF]'"
           >
             <Clock class="w-4 h-4" />
             Open Orders
             <span class="ml-2 bg-white/10 text-white/80 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm border border-white/10">{{ openOrders.length }}</span>
             <div v-if="activeBottomTab === 'orders'" class="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent rounded-t-full shadow-[0_-4px_12px_#F0B90B]"></div>
           </button>

           <button 
             @click="activeBottomTab = 'history'"
             class="relative pb-4 text-[13px] font-black uppercase tracking-[0.1em] transition-all duration-300 outline-none hidden sm:flex items-center gap-2"
             :class="activeBottomTab === 'history' ? 'text-white' : 'text-[#848e9c] hover:text-[#EAECEF]'"
           >
             <Zap class="w-4 h-4" />
             Trade History
             <div v-if="activeBottomTab === 'history'" class="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent rounded-t-full shadow-[0_-4px_12px_#F0B90B]"></div>
           </button>
         </div>

         <!-- Enhanced Tab Content -->
         <div class="flex-1 overflow-hidden relative bg-black/10">
            
            <transition
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="opacity-0 translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-200 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2"
              mode="out-in"
            >
              <div :key="activeBottomTab" class="w-full h-full p-4">
                <div v-if="activeBottomTab === 'positions'" class="h-full overflow-y-auto no-scrollbar">
                  <ActivePositions class="w-full !border-0 !bg-transparent !shadow-none !rounded-none" />
                </div>

                <div v-else-if="activeBottomTab === 'orders'" class="h-full flex flex-col items-center justify-center text-center">
                   <template v-if="openOrders.length === 0">
                     <div class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-5 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Clock class="w-8 h-8 text-[#474d57] group-hover:text-white transition-colors" />
                     </div>
                     <h3 class="text-white text-lg font-black mb-1 uppercase tracking-wider">No Active Orders</h3>
                     <p class="text-[#848e9c] text-sm max-w-[300px] font-medium leading-relaxed">Your order book is currently empty. Start trading to see your pending orders here.</p>
                   </template>
                   <template v-else>
                      <!-- Simple table list for orders -->
                      <div class="w-full overflow-x-auto">
                        <table class="w-full text-left border-separate border-spacing-y-2">
                          <thead>
                            <tr class="text-[10px] text-[#848e9c] font-black uppercase tracking-[0.2em]">
                              <th class="px-4 pb-2">Pair</th>
                              <th class="px-4 pb-2">Type</th>
                              <th class="px-4 pb-2">Side</th>
                              <th class="px-4 pb-2 text-right">Price</th>
                              <th class="px-4 pb-2 text-right">Amount</th>
                              <th class="px-4 pb-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="order in openOrders" :key="order.id" class="bg-white/5 hover:bg-white/10 transition-colors rounded-xl overflow-hidden group/row">
                              <td class="px-4 py-3 text-sm font-bold text-white rounded-l-xl">BTC/USDT</td>
                              <td class="px-4 py-3 text-[11px] text-[#848e9c] font-bold uppercase">{{ order.type }}</td>
                              <td class="px-4 py-3">
                                <span :class="cn('px-2 py-0.5 rounded text-[10px] font-black uppercase', order.side === 'Buy' ? 'bg-[#0ecb81]/20 text-[#0ecb81]' : 'bg-[#f6465d]/20 text-[#f6465d]')">{{ order.side }}</span>
                              </td>
                              <td class="px-4 py-3 text-right font-mono text-sm font-bold text-white">{{ formatNum(order.price) }}</td>
                              <td class="px-4 py-3 text-right font-mono text-sm font-bold text-white">{{ order.amount }}</td>
                              <td class="px-4 py-3 text-right rounded-r-xl">
                                <button class="text-[#f6465d] hover:bg-[#f6465d]/10 p-1.5 rounded-lg transition-colors">
                                  <X class="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                   </template>
                </div>

                <div v-else-if="activeBottomTab === 'history'" class="h-full flex items-center justify-center text-[#474d57] text-sm italic font-medium">
                   <div class="flex flex-col items-center gap-4 group-hover:text-white/40 transition-colors duration-500">
                      <Activity class="w-12 h-12 opacity-30 animate-pulse" />
                      <span class="tracking-widest uppercase text-xs">Accessing Secure Archive...</span>
                   </div>
                </div>
              </div>
            </transition>

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
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
}
</style>
