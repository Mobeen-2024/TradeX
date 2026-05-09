<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Target } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();
</script>

<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="absolute -inset-[1px] bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#0ecb81] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    
    <div class="bg-[#0c0f12]/60 backdrop-blur-[60px] border border-white/[0.05] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[260px] items-start relative z-0 group-hover:border-white/[0.1] transition-all duration-500 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-transparent px-4 py-3 flex items-center justify-between border-b border-white/[0.05] w-full">
        <div class="flex items-center gap-3">
          <Target class="w-4 h-4 text-[#0ecb81]" />
          <span class="text-xs font-bold text-white/90 uppercase tracking-widest flex-1 truncate">Take Profit Engine</span>
        </div>
      </div>
      <!-- Body -->
      <div class="p-5 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs w-full">
        <div class="flex justify-between items-center text-[#848e9c]">
          <span class="text-[10px] text-white/40 tracking-wider uppercase">Target</span>
          <span class="font-bold text-[#0ecb81] bg-[#0ecb81]/10 px-2.5 py-1 rounded-lg border border-[#0ecb81]/20 tracking-wide">{{ data.target || '50 SMA' }}</span>
        </div>
        <div class="flex justify-between items-center text-[#848e9c]">
          <span class="text-[10px] text-white/40 tracking-wider uppercase">Est. RR</span>
          <span class="font-bold text-white/90">{{ data.rr || '1 : 2.3' }}</span>
        </div>
        <div class="mt-2 flex flex-col gap-1">
          <span class="text-[9px] text-white/30 uppercase tracking-widest mb-1">Partials</span>
          <div class="flex gap-1.5 flex-wrap">
            <span v-for="(partial, idx) in (data.partials || ['25%', '50%', 'Runner'])" :key="idx" class="font-bold text-white/90 bg-black/40 px-2 py-0.5 rounded border border-white/[0.05]">{{ partial }}</span>
          </div>
        </div>
      </div>
      <!-- Ports -->
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#0ecb81] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
