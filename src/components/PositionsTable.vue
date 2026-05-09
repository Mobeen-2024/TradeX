<script setup lang="ts">
import { ref } from 'vue';
import { activePositions, closePosition, currentPrice } from '../store/tradeStore';
import { cn } from '../lib/utils';
import { Activity, X, TrendingUp, TrendingDown, Target, Shield, Info, ArrowUpRight, ArrowDownRight, Settings2 } from 'lucide-vue-next';

const formatNum = (num: number, decimals: number = 2) => 
  num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const actionStates = ref<Record<string, 'idle' | 'closing'>>({});

const handleClose = (id: string) => {
  actionStates.value[id] = 'closing';
  // Artificial delay for premium interaction feel
  setTimeout(() => {
    closePosition(id);
    delete actionStates.value[id];
  }, 800);
};

const getPnlColor = (pnl: number) => pnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]';

const calculatePnl = (pos: any) => {
  if (pos.pnl !== undefined && pos.pnlPercent !== undefined) {
    return { pnl: pos.pnl, pnlPercent: pos.pnlPercent };
  }
  const mark = pos.mark || currentPrice.value;
  const entry = pos.entry;
  const pnl = (mark - entry) * pos.size * (pos.type === 'LONG' ? 1 : -1);
  const pnlPercent = (pnl / (entry * pos.size / parseFloat(pos.leverage))) * 100;
  return { pnl, pnlPercent };
};
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <!-- Table Container -->
    <div v-if="activePositions.length > 0" class="flex-1 overflow-x-auto no-scrollbar">
      <table class="w-full text-left border-separate border-spacing-y-2 px-4">
        <thead class="sticky top-0 bg-transparent z-20">
          <tr class="text-[10px] text-[#848e9c] font-black uppercase tracking-[0.2em]">
            <th class="px-4 py-3 font-black">Symbol / Leverage</th>
            <th class="px-4 py-3 font-black">Size</th>
            <th class="px-4 py-3 font-black text-right">Entry / Mark</th>
            <th class="px-4 py-3 font-black text-right">Liq. Price</th>
            <th class="px-4 py-3 font-black text-right">Margin / Ratio</th>
            <th class="px-4 py-3 font-black text-right">PnL (ROE%)</th>
            <th class="px-4 py-3 font-black text-right">Action</th>
          </tr>
        </thead>
        <tbody class="relative z-10">
          <tr v-for="pos in activePositions" :key="pos.id" 
              class="group/row bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all duration-300 rounded-xl overflow-hidden">
            
            <!-- Symbol / Leverage -->
            <td class="px-4 py-4 rounded-l-2xl">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                   <span class="text-sm font-black text-white">BTC/USDT</span>
                   <span :class="cn('px-1.5 py-0.5 rounded text-[9px] font-black tracking-tight border', pos.type === 'LONG' ? 'text-[#0ecb81] border-[#0ecb81]/20 bg-[#0ecb81]/10' : 'text-[#f6465d] border-[#f6465d]/20 bg-[#f6465d]/10')">
                     {{ pos.leverage }}
                   </span>
                </div>
                <div class="flex items-center gap-1.5">
                   <ArrowUpRight v-if="pos.type === 'LONG'" class="w-3 h-3 text-[#0ecb81]" />
                   <ArrowDownRight v-else class="w-3 h-3 text-[#f6465d]" />
                   <span :class="cn('text-[10px] font-bold uppercase tracking-wider', pos.type === 'LONG' ? 'text-[#0ecb81]' : 'text-[#f6465d]')">{{ pos.type === 'LONG' ? 'Long' : 'Short' }}</span>
                </div>
              </div>
            </td>

            <!-- Size -->
            <td class="px-4 py-4">
               <div class="flex flex-col gap-0.5">
                  <span class="text-sm font-bold text-[#EAECEF]">{{ pos.size }} BTC</span>
                  <span class="text-[9px] text-[#848e9c] font-mono">${{ formatNum(pos.size * pos.entry, 0) }}</span>
               </div>
            </td>

            <!-- Entry / Mark -->
            <td class="px-4 py-4 text-right">
               <div class="flex flex-col items-end gap-0.5">
                  <span class="text-sm font-mono font-black text-white">${{ formatNum(pos.entry) }}</span>
                  <span class="text-[10px] font-mono font-bold text-[#0ecb81]">${{ formatNum(pos.mark || currentPrice) }}</span>
               </div>
            </td>

            <!-- Liq. Price -->
            <td class="px-4 py-4 text-right">
               <span class="text-sm font-mono font-black text-[#F0B90B]">${{ formatNum(pos.liqPrice || pos.entry * 0.85) }}</span>
            </td>

            <!-- Margin / Ratio -->
            <td class="px-4 py-4 text-right">
               <div class="flex flex-col items-end gap-1">
                  <span class="text-sm font-bold text-[#EAECEF]">${{ formatNum(pos.entry * pos.size / parseFloat(pos.leverage)) }}</span>
                  <div class="w-16 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                     <div class="h-full bg-[#0ecb81] rounded-full" style="width: 12%"></div>
                  </div>
               </div>
            </td>

            <!-- PnL -->
            <td class="px-4 py-4 text-right">
               <div class="flex flex-col items-end gap-0.5">
                  <span :class="cn('text-sm font-black', getPnlColor(calculatePnl(pos).pnl))">
                    {{ calculatePnl(pos).pnl >= 0 ? '+' : '' }}${{ formatNum(calculatePnl(pos).pnl) }}
                  </span>
                  <span :class="cn('text-[11px] font-black', getPnlColor(calculatePnl(pos).pnlPercent))">
                    {{ calculatePnl(pos).pnlPercent >= 0 ? '+' : '' }}{{ formatNum(calculatePnl(pos).pnlPercent) }}%
                  </span>
               </div>
            </td>

            <!-- Action -->
            <td class="px-4 py-4 text-right rounded-r-2xl">
               <div class="flex items-center justify-end gap-2">
                 <button 
                   @click="handleClose(pos.id)"
                   :disabled="actionStates[pos.id] === 'closing'"
                   class="group/btn relative overflow-hidden px-4 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-[#f6465d]/10 hover:border-[#f6465d]/30 text-[#848e9c] hover:text-[#f6465d] text-[10px] font-black uppercase tracking-widest transition-all duration-300 disabled:opacity-50"
                 >
                   <span v-if="actionStates[pos.id] === 'closing'" class="flex items-center gap-2">
                      <div class="w-3 h-3 border-2 border-[#f6465d]/30 border-t-[#f6465d] rounded-full animate-spin"></div>
                      Closing
                   </span>
                   <span v-else class="flex items-center gap-1.5">
                      Market Close
                   </span>
                 </button>
                 <button class="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:border-white/30 text-[#848e9c] hover:text-white transition-all">
                    <Settings2 class="w-4 h-4" />
                 </button>
               </div>
            </td>

          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-5 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
        <Shield class="w-8 h-8 text-[#474d57]" />
      </div>
      <h4 class="text-white font-black text-lg tracking-widest uppercase mb-2">No Active Exposure</h4>
      <p class="text-[#848e9c] text-sm max-w-sm font-medium leading-relaxed">Your portfolio is completely hedged or in cash. Start a trade to see your positions.</p>
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
