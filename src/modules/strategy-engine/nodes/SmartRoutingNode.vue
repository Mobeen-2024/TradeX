<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Route } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();
</script>
<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="bg-[#1e2329] border border-[#d946ef] shadow-[0_0_15px_rgba(217,70,239,0.15)] rounded-xl min-w-[200px] overflow-hidden relative z-0">
      <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#d946ef] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
      <div class="bg-[#d946ef]/10 px-3 py-2 flex items-center gap-2 border-b border-[#d946ef]/20">
        <Route class="w-4 h-4 text-[#d946ef]" />
        <span class="text-xs font-bold text-[#d946ef] uppercase tracking-wider">Smart Route</span>
      </div>
      <div class="p-5 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs">
        <div class="flex justify-between items-center text-[#848e9c]"><span>Venues</span><span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.venues?.join(', ') || 'BIN, BYB, OKX' }}</span></div>
        <div class="flex justify-between items-center text-[#848e9c]"><span>Goal</span><span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.goal || 'Best Price' }}</span></div>
      </div>
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#d946ef] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
