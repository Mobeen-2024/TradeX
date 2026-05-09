<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Waves, ArrowDownUp, LineChart, Banknote } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();
</script>

<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="absolute -inset-[1px] bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#3b82f6] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    
    <div class="bg-[#0c0f12]/60 backdrop-blur-[60px] border border-white/[0.05] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[280px] items-start relative z-0 group-hover:border-white/[0.1] transition-all duration-500 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-transparent px-4 py-3 flex items-center justify-between border-b border-white/[0.05] w-full">
        <div class="flex items-center gap-3">
          <Waves class="w-4 h-4 text-[#3b82f6]" />
          <span class="text-xs font-bold text-white/90 uppercase tracking-widest flex-1 truncate">Whale Detection</span>
        </div>
      </div>

      <!-- Body -->
      <div class="p-4 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs w-full">
        <div class="flex flex-col gap-2 p-2 bg-black/40 rounded-xl border border-white/[0.03] shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]">
          <div class="flex items-center gap-2">
             <Banknote class="w-3.5 h-3.5 text-[#0ecb81]" />
             <div class="flex justify-between items-center w-full">
               <span class="text-[10px] text-white/50 tracking-wider">Large Tx</span>
               <span class="font-bold text-[#0ecb81]">{{ data.largeTx || '> $10M' }}</span>
             </div>
          </div>
        </div>

        <div class="flex flex-col gap-2 p-2 bg-black/40 rounded-xl border border-white/[0.03] shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]">
          <div class="flex items-center gap-2">
             <ArrowDownUp class="w-3.5 h-3.5 text-[#f6465d]" />
             <div class="flex justify-between items-center w-full">
               <span class="text-[10px] text-white/50 tracking-wider">Exchange</span>
               <div class="flex items-center gap-1.5">
                   <span class="font-bold text-[#f6465d]">{{ data.outflows || 'High Outflows' }}</span>
               </div>
             </div>
          </div>
        </div>
        
         <div class="flex flex-col gap-2 p-2 bg-black/40 rounded-xl border border-white/[0.03] shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]">
          <div class="flex items-center gap-2">
             <LineChart class="w-3.5 h-3.5 text-[#a855f7]" />
             <div class="flex justify-between items-center w-full">
               <span class="text-[10px] text-white/50 tracking-wider">Smart Money</span>
               <span class="font-bold text-[#a855f7]">{{ data.smartMoney || 'Accumulating' }}</span>
             </div>
          </div>
        </div>
      </div>

      <!-- Ports -->
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#3b82f6] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
