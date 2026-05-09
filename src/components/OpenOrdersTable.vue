<script setup lang="ts">
import { ref } from 'vue';
import { openOrders, cancelOrder, currentPrice } from '../store/tradeStore';
import { cn } from '../lib/utils';
import { Clock, X, Info, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-vue-next';

const formatNum = (num: number, decimals: number = 2) => 
  num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const cancelingIds = ref<Set<string>>(new Set());

const handleCancel = async (id: string) => {
  cancelingIds.value.add(id);
  // Simulate network delay for premium feel
  setTimeout(async () => {
    await cancelOrder(id);
    cancelingIds.value.delete(id);
  }, 600);
};

const getSideClass = (side: string) => {
  return side === 'Buy' ? 'text-[#0ecb81] bg-[#0ecb81]/10 border-[#0ecb81]/20' : 'text-[#f6465d] bg-[#f6465d]/10 border-[#f6465d]/20';
};
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <!-- Table Container -->
    <div v-if="openOrders.length > 0" class="flex-1 overflow-x-auto no-scrollbar">
      <table class="w-full text-left border-separate border-spacing-y-2 px-4">
        <thead class="sticky top-0 bg-transparent z-20">
          <tr class="text-[10px] text-[#848e9c] font-black uppercase tracking-[0.2em]">
            <th class="px-4 py-3 font-black">Market / Time</th>
            <th class="px-4 py-3 font-black">Type</th>
            <th class="px-4 py-3 font-black">Side</th>
            <th class="px-4 py-3 font-black text-right">Order Price</th>
            <th class="px-4 py-3 font-black text-right">Amount</th>
            <th class="px-4 py-3 font-black text-right">Filled</th>
            <th class="px-4 py-3 font-black text-right">Action</th>
          </tr>
        </thead>
        <tbody class="relative z-10">
          <tr v-for="order in openOrders" :key="order.id" 
              class="group/row bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all duration-300 rounded-xl overflow-hidden">
            
            <!-- Market / Time -->
            <td class="px-4 py-4 rounded-l-2xl">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                   <span class="text-sm font-black text-white">BTC/USDT</span>
                   <span class="text-[9px] text-[#848e9c] font-mono opacity-50">#{{ order.id.slice(-4) }}</span>
                </div>
                <span class="text-[10px] text-[#848e9c] font-medium">Just now</span>
              </div>
            </td>

            <!-- Type -->
            <td class="px-4 py-4">
               <div class="flex items-center gap-1.5">
                  <div class="w-1.5 h-1.5 rounded-full bg-[#F0B90B] shadow-[0_0_8px_#F0B90B]"></div>
                  <span class="text-[11px] text-[#EAECEF] font-bold uppercase tracking-wide">{{ order.type }}</span>
               </div>
            </td>

            <!-- Side -->
            <td class="px-4 py-4">
               <span :class="cn('px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border flex items-center w-fit gap-1', getSideClass(order.side))">
                  <ArrowUpRight v-if="order.side === 'Buy'" class="w-3 h-3" />
                  <ArrowDownRight v-else class="w-3 h-3" />
                  {{ order.side }}
               </span>
            </td>

            <!-- Price -->
            <td class="px-4 py-4 text-right font-mono">
               <div class="flex flex-col items-end">
                  <span class="text-sm font-black text-white">${{ formatNum(order.price) }}</span>
                  <span class="text-[9px] text-[#848e9c]">Market: ${{ formatNum(currentPrice) }}</span>
               </div>
            </td>

            <!-- Amount -->
            <td class="px-4 py-4 text-right">
               <span class="text-sm font-bold text-[#EAECEF]">{{ order.amount }} BTC</span>
            </td>

            <!-- Filled -->
            <td class="px-4 py-4 text-right">
               <div class="flex flex-col items-end gap-1.5">
                  <div class="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                     <div class="h-full bg-gradient-to-r from-[#F0B90B] to-[#FCD535] rounded-full transition-all duration-1000" :style="{ width: '0%' }"></div>
                  </div>
                  <span class="text-[10px] text-[#848e9c] font-bold">0.00%</span>
               </div>
            </td>

            <!-- Action -->
            <td class="px-4 py-4 text-right rounded-r-2xl">
               <button 
                 @click="handleCancel(order.id)"
                 :disabled="cancelingIds.has(order.id)"
                 class="group/btn relative overflow-hidden px-4 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-[#f6465d]/10 hover:border-[#f6465d]/30 text-[#848e9c] hover:text-[#f6465d] text-[10px] font-black uppercase tracking-widest transition-all duration-300 disabled:opacity-50"
               >
                 <span v-if="cancelingIds.has(order.id)" class="flex items-center gap-2">
                    <div class="w-3 h-3 border-2 border-[#f6465d]/30 border-t-[#f6465d] rounded-full animate-spin"></div>
                    Canceling
                 </span>
                 <span v-else class="flex items-center gap-1.5">
                    <X class="w-3 h-3 group-hover/btn:rotate-90 transition-transform duration-300" />
                    Cancel
                 </span>
               </button>
            </td>

          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-5 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
        <Clock class="w-8 h-8 text-[#474d57]" />
      </div>
      <h3 class="text-white text-lg font-black mb-1 uppercase tracking-wider">No Active Orders</h3>
      <p class="text-[#848e9c] text-sm max-w-[300px] font-medium leading-relaxed">Your order book is currently empty. Start trading to see your pending orders here.</p>
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

tr {
  transform: translateZ(0);
}
</style>
