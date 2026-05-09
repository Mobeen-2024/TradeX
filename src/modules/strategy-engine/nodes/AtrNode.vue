<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Activity } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();
</script>
<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="absolute -inset-[1px] bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <div class="bg-[#0c0f12]/60 backdrop-blur-[60px] border border-white/[0.05] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[240px] overflow-hidden relative z-0 group-hover:border-white/[0.1] transition-all duration-500">
      <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#627EEA] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
      <div class="bg-transparent px-4 py-3 flex items-center gap-3 border-b border-white/[0.05]">
        <Activity class="w-4 h-4 text-[#627EEA]" />
        <span class="text-xs font-bold text-white/90 uppercase tracking-widest">ATR Indicator</span>
      </div>
      <div class="p-5 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs">
        <div class="flex justify-between items-center text-[#848e9c]"><span>Period</span><span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.period || 14 }}</span></div>
      </div>
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#627EEA] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
