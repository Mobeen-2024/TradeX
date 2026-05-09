<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { ShoppingCart } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';

defineProps<{
  data: any;
}>();
</script>

<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="bg-[#1e2329] border border-[#0ecb81]/50 shadow-[0_0_15px_rgba(14,203,129,0.15)] rounded-xl min-w-[200px] overflow-hidden relative z-0">
      <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#0ecb81] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
      
      <div class="bg-[#0ecb81]/10 px-3 py-2 flex items-center gap-2 border-b border-[#0ecb81]/20">
        <ShoppingCart class="w-4 h-4 text-[#0ecb81]" />
        <span class="text-xs font-bold text-[#0ecb81] uppercase tracking-wider">Execute Order</span>
      </div>
      <div class="p-5 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent">
        <div class="flex justify-between items-center text-[10px] text-white/40 tracking-wider uppercase">
          <span>Action</span>
          <span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.action || 'BUY' }}</span>
        </div>
        <div class="flex justify-between items-center text-[10px] text-white/40 tracking-wider uppercase">
          <span>Type</span>
          <span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.type || 'MARKET' }}</span>
        </div>
        <div class="flex justify-between items-center text-[10px] text-white/40 tracking-wider uppercase">
          <span>Size</span>
          <span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.size || '100%' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
