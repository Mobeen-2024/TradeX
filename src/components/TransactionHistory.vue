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
import { activePositions, closePosition } from '../store/tradeStore';

const activeTab = ref(0);

const mockOpenOrders = ref([
  { id: '1', pair: 'BTC/USDT', type: 'Limit', side: 'Buy', price: 62500, amount: 0.1, filled: 0, date: '2026-05-02 12:45' },
  { id: '2', pair: 'ETH/USDT', type: 'Stop-Limit', side: 'Sell', price: 3450, amount: 1.5, filled: 0, date: '2026-05-02 11:20' }
]);
</script>

<template>
  <div class="bg-[#0b0e11] flex-1 flex flex-col min-h-0 sm:border sm:border-white/5 sm:rounded-2xl overflow-hidden font-sans shadow-2xl">
    
    <!-- Header Tabs -->
    <div class="flex items-center justify-between px-4 h-[48px] border-b border-white/5 shrink-0 bg-[#161a1e]/30 backdrop-blur-md">
      <div class="flex items-center gap-8 h-full">
        <button 
          @click="activeTab = 0"
          :class="cn(
            'h-full relative transition-all duration-300 flex items-center group',
            activeTab === 0 ? 'text-[#F0B90B]' : 'text-[#848e9c] hover:text-[#EAECEF]'
          )"
        >
          <span class="text-[13px] font-bold tracking-tight">Positions <span class="font-normal opacity-60">({{ activePositions.length }})</span></span>
          <div v-show="activeTab === 0" class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F0B90B] shadow-[0_0_10px_#F0B90B]"></div>
        </button>
        <button 
          @click="activeTab = 1"
          :class="cn(
            'h-full relative transition-all duration-300 flex items-center group',
            activeTab === 1 ? 'text-[#F0B90B]' : 'text-[#848e9c] hover:text-[#EAECEF]'
          )"
        >
          <span class="text-[13px] font-bold tracking-tight">Open Orders <span class="font-normal opacity-60">({{ mockOpenOrders.length }})</span></span>
          <div v-show="activeTab === 1" class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F0B90B] shadow-[0_0_10px_#F0B90B]"></div>
        </button>
      </div>
      <div class="flex items-center gap-4 text-[#848e9c]">
        <button class="p-1.5 hover:bg-white/5 rounded-md transition-colors"><ArrowDownUp class="w-4 h-4" /></button>
        <button class="p-1.5 hover:bg-white/5 rounded-md transition-colors"><FileClock class="w-4 h-4" /></button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar bg-[#0b0e11]">
      
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
            class="flex flex-col p-5 hover:bg-white/[0.02] transition-colors relative group"
          >
            <!-- Badge Status -->
            <div class="absolute top-5 right-5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0ecb81]/10 border border-[#0ecb81]/20">
                <div class="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse"></div>
                <span class="text-[10px] font-bold text-[#0ecb81] uppercase tracking-tighter">Live</span>
            </div>

            <!-- Top Header -->
            <div class="flex items-center gap-3 mb-6">
              <div :class="cn('w-9 h-9 rounded-xl flex items-center justify-center shadow-lg', pos.type === 'LONG' ? 'bg-[#0ecb81]/20 text-[#0ecb81]' : 'bg-[#f6465d]/20 text-[#f6465d]')">
                <TrendingUp v-if="pos.type === 'LONG'" class="w-5 h-5" />
                <TrendingDown v-else class="w-5 h-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                    <h3 class="text-[#EAECEF] font-black text-base tracking-tight">{{ pos.pair }}</h3>
                    <span :class="cn('text-[10px] font-bold px-1.5 py-0.5 rounded', pos.type === 'LONG' ? 'bg-[#0ecb81] text-[#0b0e11]' : 'bg-[#f6465d] text-white')">
                        {{ pos.leverage }}
                    </span>
                </div>
                <div class="text-[10px] text-[#848e9c] font-medium uppercase tracking-widest mt-0.5">Isolated • Cross Margin</div>
              </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div class="flex flex-col gap-1.5">
                <span class="text-[11px] text-[#848e9c] font-bold uppercase tracking-wider flex items-center gap-1">Unrealized PNL <Info class="w-3 h-3 opacity-30" /></span>
                <div class="flex flex-col">
                    <span :class="cn('text-lg font-mono font-bold leading-none', pos.liveDelta >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                      {{ pos.liveDelta > 0 ? '+' : '' }}{{ pos.liveDelta.toFixed(2) }} <span class="text-xs uppercase">USDT</span>
                    </span>
                    <span :class="cn('text-xs font-mono font-medium mt-1', pos.liveDeltaPercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                      ({{ pos.liveDeltaPercent >= 0 ? '+' : '' }}{{ pos.liveDeltaPercent.toFixed(2) }}%)
                    </span>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <span class="text-[11px] text-[#848e9c] font-bold uppercase tracking-wider">Size / Value</span>
                <div class="flex flex-col">
                    <span class="text-sm font-mono text-[#EAECEF] font-bold leading-none">{{ pos.size.toFixed(4) }} BTC</span>
                    <span class="text-[11px] font-mono text-[#848e9c] mt-1">≈ {{ (pos.size * pos.mark).toFixed(2) }} USDT</span>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <span class="text-[11px] text-[#848e9c] font-bold uppercase tracking-wider">Entry / Mark</span>
                <div class="flex flex-col">
                    <span class="text-sm font-mono text-[#EAECEF] font-bold leading-none">{{ pos.entry.toFixed(2) }}</span>
                    <span class="text-[11px] font-mono text-[#F0B90B] mt-1">{{ pos.mark.toFixed(2) }}</span>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <span class="text-[11px] text-[#848e9c] font-bold uppercase tracking-wider">Liq. Price</span>
                <div class="flex flex-col">
                    <span class="text-sm font-mono text-[#fcd535] font-bold leading-none">{{ (pos.entry * (pos.type === 'LONG' ? 0.85 : 1.15)).toFixed(2) }}</span>
                    <div class="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                        <div class="h-full bg-[#fcd535]" :style="`width: ${Math.max(10, 100 - (Math.abs(pos.mark - pos.entry) / pos.entry * 500))}%`"></div>
                    </div>
                </div>
              </div>
            </div>

            <!-- PNL Visual Bar -->
            <div class="mt-6 w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                <div :class="cn('h-full transition-all duration-1000', pos.liveDelta >= 0 ? 'bg-[#0ecb81] shadow-[0_0_10px_#0ecb81]' : 'bg-[#f6465d] shadow-[0_0_10px_#f6465d]')" :style="`width: ${Math.min(100, Math.abs(pos.liveDeltaPercent))}%`"></div>
            </div>

            <!-- Footer Actions -->
            <div class="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <div class="flex items-center gap-4">
                    <button class="text-[11px] text-[#848e9c] hover:text-[#EAECEF] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                        <Settings2 class="w-3.5 h-3.5" /> TP/SL
                    </button>
                    <button class="text-[11px] text-[#848e9c] hover:text-[#EAECEF] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                        <Plus class="w-3.5 h-3.5" /> Margin
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button @click="closePosition(pos.id)" class="px-4 py-1.5 rounded-lg bg-[#2b3139] hover:bg-[#323a43] text-white text-[12px] font-bold transition-all active:scale-95">Close Position</button>
                    <button class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><MoreHorizontal class="w-4 h-4" /></button>
                </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Open Orders Tab -->
      <div v-else-if="activeTab === 1" class="flex flex-col">
        <div class="p-0">
            <table class="w-full text-left border-collapse">
                <thead class="bg-[#161a1e]/20 text-[10px] text-[#848e9c] font-bold uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                        <th class="px-5 py-3">Date</th>
                        <th class="px-5 py-3">Pair</th>
                        <th class="px-5 py-3">Type/Side</th>
                        <th class="px-5 py-3">Price</th>
                        <th class="px-5 py-3">Amount</th>
                        <th class="px-5 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-white/5 font-mono text-[12px]">
                    <tr v-for="order in mockOpenOrders" :key="order.id" class="hover:bg-white/[0.02] transition-colors">
                        <td class="px-5 py-4 text-[#848e9c]">{{ order.date }}</td>
                        <td class="px-5 py-4 text-[#EAECEF] font-bold">{{ order.pair }}</td>
                        <td class="px-5 py-4">
                            <div class="flex flex-col gap-0.5">
                                <span class="text-[#EAECEF]">{{ order.type }}</span>
                                <span :class="order.side === 'Buy' ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ order.side }}</span>
                            </div>
                        </td>
                        <td class="px-5 py-4 text-[#EAECEF]">{{ order.price.toFixed(2) }}</td>
                        <td class="px-5 py-4">
                            <div class="flex flex-col gap-1">
                                <span class="text-[#EAECEF]">{{ order.amount.toFixed(4) }}</span>
                                <div class="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div class="h-full bg-[#F0B90B]" :style="`width: ${order.filled}%`"></div>
                                </div>
                            </div>
                        </td>
                        <td class="px-5 py-4 text-right">
                            <button class="text-[#f6465d] hover:bg-[#f6465d]/10 px-3 py-1 rounded-md transition-colors font-bold uppercase text-[10px]">Cancel</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
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


