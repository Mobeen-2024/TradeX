<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { AlertOctagon } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();
</script>
<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="bg-[#1e2329] border border-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.15)] rounded-xl min-w-[220px] overflow-hidden relative z-0">
      <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#f59e0b] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
      <div class="bg-[#f59e0b]/10 px-3 py-2 flex items-center gap-2 border-b border-[#f59e0b]/20">
        <AlertOctagon class="w-4 h-4 text-[#f59e0b]" />
        <span class="text-xs font-bold text-[#f59e0b] uppercase tracking-wider">Risk Engine</span>
      </div>
      <div class="p-5 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent text-[10px]">
        <div class="flex justify-between items-center text-[#848e9c]"><span>Kill Switch</span><span class="font-bold" :class="data.killSwitch ? 'text-red-500' : 'text-[#0ecb81]'">{{ data.killSwitch ? 'ON' : 'OFF' }}</span></div>
        <div class="flex justify-between items-center text-[#848e9c]"><span>Max Drawdown</span><span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.maxDrawdown || '5%' }}</span></div>
        <div class="flex justify-between items-center text-[#848e9c]"><span>Max Leverage</span><span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.maxLeverage || '10x' }}</span></div>
        <div class="flex justify-between items-center text-[#848e9c]"><span>Max Exposure</span><span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.maxExposure || '$100k' }}</span></div>
      </div>
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#f59e0b] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
