<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Globe, TrendingUp, TrendingDown, Sparkles, List } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();

const icons: Record<string, any> = {
  'Top Volume': Globe,
  'Top Gainers': TrendingUp,
  'Top Losers': TrendingDown,
  'AI Selection': Sparkles,
  'Watchlist': List
};
</script>

<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="absolute -inset-[1px] bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <div class="bg-[#0c0f12]/60 backdrop-blur-[60px] border border-white/[0.05] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[240px] items-start relative z-0 group-hover:border-white/[0.1] transition-all duration-500 flex flex-col overflow-hidden">
      
      <!-- Header -->
      <div class="bg-transparent px-4 py-3 flex items-center gap-3 border-b border-white/[0.05] w-full">
        <component :is="icons[data.mode] || Globe" class="w-4 h-4" :class="{
          'text-[#F0B90B]': data.mode === 'Top Volume' || !data.mode,
          'text-[#0ecb81]': data.mode === 'Top Gainers',
          'text-[#f6465d]': data.mode === 'Top Losers',
          'text-[#a855f7]': data.mode === 'AI Selection',
          'text-[#3b82f6]': data.mode === 'Watchlist',
        }" />
        <span class="text-xs font-bold text-white/90 uppercase tracking-widest flex-1 truncate">Market Universe</span>
      </div>

      <!-- Body -->
      <div class="p-5 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs w-full">
        <div class="flex justify-between items-center text-[#848e9c]">
          <span class="text-[10px] text-white/40 tracking-wider uppercase">Filter</span>
          <span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.mode || 'Top Volume' }}</span>
        </div>
        <div class="flex justify-between items-center text-[#848e9c] mt-1" v-if="data.limit">
          <span class="text-[10px] text-white/40 tracking-wider uppercase">Limit</span>
          <span class="font-bold text-white/90">{{ data.limit }} Base Assets</span>
        </div>
        <div class="flex flex-col gap-1 mt-2 p-2 bg-black/40 rounded-xl border border-white/[0.02]" v-if="data.examples">
          <span class="text-[9px] text-white/30 uppercase tracking-widest mb-1">Preview</span>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="ex in data.examples" :key="ex" class="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/70">{{ ex }}</span>
          </div>
        </div>
      </div>

      <!-- Ports -->
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#F0B90B] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
