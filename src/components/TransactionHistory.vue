<script setup lang="ts">
import { 
  ArrowDownUp, 
  FileClock,
  ChevronRight,
  Minus,
  ExternalLink,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Info,
  Settings2,
  Plus
} from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { ref } from 'vue';
import { activePositions, closePosition, openOrders, cancelOrder } from '../store/tradeStore';
import PerformanceDashboard from './PerformanceDashboard.vue';

const activeTab = ref(0);

const formatDate = (date: any) => {
    if (!date) return '-';
    if (typeof date === 'string') return date;
    const d = new Date(date);
    return d.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};
</script>

<template>
  <div class="bg-[#0b0e11]/60 backdrop-blur-2xl flex-1 flex flex-col min-h-0 sm:border sm:border-white/5 sm:rounded-[16px] overflow-hidden font-sans shadow-2xl">
    
    <!-- Header Tabs -->
    <div class="flex items-center justify-between px-4 h-[48px] border-b border-white/5 shrink-0 bg-[#161a1e]/30 backdrop-blur-md">
      <div class="flex items-center gap-2 h-full overflow-x-auto no-scrollbar">
        <button 
          @click="activeTab = 0"
          :class="cn(
            'px-4 h-[32px] rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden flex items-center',
            activeTab === 0 ? 'bg-white/10 text-[#F0B90B] shadow-inner' : 'text-[#848e9c] hover:text-[#EAECEF] hover:bg-white/5'
          )"
        >
          Positions
          <span class="ml-2 text-[10px] opacity-40">({{ activePositions.length }})</span>
          <div v-show="activeTab === 0" class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F0B90B] shadow-[0_0_10px_#F0B90B]"></div>
        </button>
        <button 
          @click="activeTab = 1"
          :class="cn(
            'px-4 h-[32px] rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden flex items-center',
            activeTab === 1 ? 'bg-white/10 text-[#F0B90B] shadow-inner' : 'text-[#848e9c] hover:text-[#EAECEF] hover:bg-white/5'
          )"
        >
          Open Orders
          <span class="ml-2 text-[10px] opacity-40">({{ openOrders.length }})</span>
          <div v-show="activeTab === 1" class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F0B90B] shadow-[0_0_10px_#F0B90B]"></div>
        </button>
        <button 
          @click="activeTab = 2"
          :class="cn(
            'px-4 h-[32px] rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden flex items-center',
            activeTab === 2 ? 'bg-white/10 text-[#F0B90B] shadow-inner' : 'text-[#848e9c] hover:text-[#EAECEF] hover:bg-white/5'
          )"
        >
          Performance
          <div v-show="activeTab === 2" class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F0B90B] shadow-[0_0_10px_#F0B90B]"></div>
        </button>
      </div>
      <div class="flex items-center gap-4 text-[#848e9c]">
        <button class="p-1.5 hover:bg-white/5 rounded-md transition-colors"><ArrowDownUp class="w-4 h-4" /></button>
        <button class="p-1.5 hover:bg-white/5 rounded-md transition-colors"><FileClock class="w-4 h-4" /></button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar bg-transparent">
      
      <!-- Positions Tab -->
      <div v-if="activeTab === 0" class="flex flex-col">
        <div v-if="activePositions.length === 0" class="flex flex-col items-center justify-center py-20 text-[#848e9c] gap-3">
          <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
            <MoreHorizontal class="w-6 h-6 opacity-20" />
          </div>
          <span class="text-xs font-medium uppercase tracking-widest opacity-40">No Active Positions</span>
        </div>

        <div class="divide-y divide-white/5" v-else>
          <div 
            v-for="pos in activePositions" 
            :key="pos.id"
            class="flex flex-col p-4 sm:p-5 hover:bg-white/[0.02] transition-colors relative group"
          >
            <!-- Badge Status -->
            <div class="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0ecb81]/10 border border-[#0ecb81]/20 shadow-[0_0_10px_rgba(14,203,129,0.1)]">
                <div class="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse"></div>
                <span class="text-[9px] sm:text-[10px] font-bold text-[#0ecb81] uppercase tracking-tighter">Live</span>
            </div>

            <!-- Top Header -->
            <div class="flex items-center gap-3 mb-4 sm:mb-6">
              <div :class="cn('w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg', pos.type === 'LONG' ? 'bg-[#0ecb81]/20 text-[#0ecb81]' : 'bg-[#f6465d]/20 text-[#f6465d]')">
                <TrendingUp v-if="pos.type === 'LONG'" class="w-4 h-4 sm:w-5 sm:h-5" />
                <TrendingDown v-else class="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                    <h3 class="text-[#EAECEF] font-black text-sm sm:text-base tracking-tight">{{ pos.pair }}</h3>
                    <span :class="cn('text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded', pos.type === 'LONG' ? 'bg-[#0ecb81] text-[#0b0e11]' : 'bg-[#f6465d] text-white')">
                        {{ pos.leverage }}
                    </span>
                </div>
                <div class="text-[9px] sm:text-[10px] text-[#848e9c] font-medium uppercase tracking-widest mt-0.5">Isolated • Cross Margin</div>
              </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div class="flex flex-col gap-1 sm:gap-1.5">
                <span class="text-[10px] sm:text-[11px] text-[#848e9c] font-bold uppercase tracking-wider flex items-center gap-1">PNL <Info class="w-3 h-3 opacity-30" /></span>
                <div class="flex flex-col">
                    <span :class="cn('text-sm sm:text-lg font-mono font-bold leading-none', pos.liveDelta >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                      {{ pos.liveDelta > 0 ? '+' : '' }}{{ pos.liveDelta.toFixed(2) }} <span class="text-[10px] uppercase">USDT</span>
                    </span>
                    <span :class="cn('text-[10px] sm:text-xs font-mono font-medium mt-1', pos.liveDeltaPercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                      ({{ pos.liveDeltaPercent >= 0 ? '+' : '' }}{{ pos.liveDeltaPercent.toFixed(2) }}%)
                    </span>
                </div>
              </div>

              <div class="flex flex-col gap-1 sm:gap-1.5">
                <span class="text-[10px] sm:text-[11px] text-[#848e9c] font-bold uppercase tracking-wider">Size / Value</span>
                <div class="flex flex-col">
                    <span class="text-xs sm:text-sm font-mono text-[#EAECEF] font-bold leading-none">{{ pos.size.toFixed(4) }} BTC</span>
                    <span class="text-[10px] font-mono text-[#848e9c] mt-1">≈ {{ (pos.size * (pos.mark || pos.entry)).toFixed(2) }} USDT</span>
                </div>
              </div>

              <div class="flex flex-col gap-1 sm:gap-1.5">
                <span class="text-[10px] sm:text-[11px] text-[#848e9c] font-bold uppercase tracking-wider">Entry / Mark</span>
                <div class="flex flex-col">
                    <span class="text-xs sm:text-sm font-mono text-[#EAECEF] font-bold leading-none">{{ pos.entry.toFixed(2) }}</span>
                    <span class="text-[10px] font-mono text-[#F0B90B] mt-1">{{ (pos.mark || pos.entry).toFixed(2) }}</span>
                </div>
              </div>

              <div class="flex flex-col gap-1 sm:gap-1.5">
                <span class="text-[10px] sm:text-[11px] text-[#848e9c] font-bold uppercase tracking-wider">Liq. Price</span>
                <div class="flex flex-col">
                    <span class="text-xs sm:text-sm font-mono text-[#fcd535] font-bold leading-none">{{ (pos.entry * (pos.type === 'LONG' ? 0.85 : 1.15)).toFixed(2) }}</span>
                    <div class="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                        <div class="h-full bg-[#fcd535]" :style="`width: ${Math.max(10, 100 - (Math.abs((pos.mark || pos.entry) - pos.entry) / pos.entry * 500))}%`"></div>
                    </div>
                </div>
              </div>
            </div>

            <!-- PNL Visual Bar -->
            <div class="mt-4 sm:mt-6 w-full h-1 sm:h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                <div :class="cn('h-full transition-all duration-1000', pos.liveDelta >= 0 ? 'bg-[#0ecb81] shadow-[0_0_10px_#0ecb81]' : 'bg-[#f6465d] shadow-[0_0_10px_#f6465d]')" :style="`width: ${Math.min(100, Math.abs(pos.liveDeltaPercent))}%`"></div>
            </div>

            <!-- Footer Actions -->
            <div class="flex items-center justify-between mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/5">
                <div class="flex items-center gap-3 sm:gap-4">
                    <button class="text-[10px] sm:text-[11px] text-[#848e9c] hover:text-[#EAECEF] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors">
                        <Settings2 class="w-3 sm:w-3.5 h-3 sm:h-3.5" /> <span class="hidden xs:inline">TP/SL</span>
                    </button>
                    <button class="text-[10px] sm:text-[11px] text-[#848e9c] hover:text-[#EAECEF] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors">
                        <Plus class="w-3 sm:w-3.5 h-3 sm:h-3.5" /> <span class="hidden xs:inline">Margin</span>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button @click="closePosition(pos.id)" class="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg bg-[#2b3139] hover:bg-[#323a43] text-white text-[11px] sm:text-[12px] font-bold transition-all active:scale-95">Close</button>
                    <button class="p-1 sm:p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><MoreHorizontal class="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Open Orders Tab -->
      <div v-else-if="activeTab === 1" class="flex flex-col h-full overflow-hidden">
        <div v-if="openOrders.length === 0" class="flex flex-col items-center justify-center py-20 text-[#848e9c] gap-3">
          <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
            <MoreHorizontal class="w-6 h-6 opacity-20" />
          </div>
          <span class="text-xs font-medium uppercase tracking-widest opacity-40">No Open Orders</span>
        </div>
        
        <!-- Desktop Table View -->
        <div v-else class="hidden sm:block flex-1 overflow-auto">
            <table class="w-full text-left border-collapse min-w-[600px]">
                <thead class="bg-[#161a1e]/20 text-[10px] text-[#848e9c] font-bold uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                        <th class="px-5 py-3">Date</th>
                        <th class="px-5 py-3">Pair</th>
                        <th class="px-5 py-3">Type/Side</th>
                        <th class="px-5 py-3">Price / Trigger</th>
                        <th class="px-5 py-3">Amount</th>
                        <th class="px-5 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-white/5 font-mono text-[12px]">
                    <tr v-for="order in openOrders" :key="order.id" class="hover:bg-white/[0.02] transition-colors">
                        <td class="px-5 py-4 text-[#848e9c]">{{ formatDate(order.date || Date.now()) }}</td>
                        <td class="px-5 py-4 text-[#EAECEF] font-bold">{{ order.pair }}</td>
                        <td class="px-5 py-4">
                            <div class="flex flex-col gap-0.5">
                                <div class="flex items-center gap-1.5">
                                  <span class="text-[#EAECEF]">{{ order.type }}</span>
                                  <span v-if="order.iceberg" class="px-1 py-0.5 bg-[#2b3139] text-[#848e9c] text-[8px] font-black rounded border border-white/5">ICEBERG</span>
                                </div>
                                <span :class="order.side === 'Buy' ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ order.side }}</span>
                            </div>
                        </td>
                        <td class="px-5 py-4 text-[#EAECEF]">
                            <div class="flex flex-col gap-0.5">
                                <span v-if="order.type === 'LIMIT'">{{ order.price.toFixed(2) }}</span>
                                <span v-if="order.stopPrice" class="text-[10px] text-[#fcd535] font-bold">Trigger: {{ order.stopPrice.toFixed(2) }}</span>
                                <span v-if="order.callbackRate" class="text-[10px] text-[#fcd535] font-bold">Callback: {{ order.callbackRate }}%</span>
                            </div>
                        </td>
                        <td class="px-5 py-4">
                            <div class="flex flex-col gap-1">
                                <span class="text-[#EAECEF]">{{ order.amount.toFixed(4) }}</span>
                            </div>
                        </td>
                        <td class="px-5 py-4 text-right">
                            <button @click="cancelOrder(order.id)" class="text-[#f6465d] hover:bg-[#f6465d]/10 px-3 py-1 rounded-md transition-colors font-bold uppercase text-[10px]">Cancel</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Mobile Card View -->
        <div v-if="openOrders.length > 0" class="sm:hidden flex-1 overflow-auto divide-y divide-white/5">
            <div v-for="order in openOrders" :key="order.id" class="p-4 flex flex-col gap-3">
                <div class="flex justify-between items-center">
                    <div class="flex flex-col">
                        <span class="text-white font-black text-sm">{{ order.pair }}</span>
                        <span class="text-[10px] text-[#848e9c] font-mono">{{ formatDate(order.date || Date.now()) }}</span>
                    </div>
                    <button @click="cancelOrder(order.id)" class="text-[10px] font-bold uppercase text-[#f6465d] bg-[#f6465d]/10 px-2.5 py-1 rounded">Cancel</button>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <div class="flex flex-col">
                        <span class="text-[9px] text-[#848e9c] uppercase font-bold tracking-wider">Side/Type</span>
                        <span :class="cn('text-[11px] font-bold', order.side === 'Buy' ? 'text-[#0ecb81]' : 'text-[#f6465d]')">{{ order.side }} {{ order.type }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[9px] text-[#848e9c] uppercase font-bold tracking-wider">Price</span>
                        <span class="text-[11px] font-mono text-white">{{ (order.price || order.stopPrice || 0).toFixed(2) }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[9px] text-[#848e9c] uppercase font-bold tracking-wider">Amount</span>
                        <span class="text-[11px] font-mono text-white">{{ order.amount.toFixed(4) }}</span>
                    </div>
                </div>
                <div v-if="order.stopPrice" class="text-[9px] text-[#fcd535] font-bold uppercase">Trigger Condition: {{ order.stopPrice }}</div>
            </div>
        </div>
      </div>

      <!-- Performance Tab -->
      <div v-else-if="activeTab === 2" class="flex-1 overflow-hidden">
        <PerformanceDashboard />
      </div>

    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>


