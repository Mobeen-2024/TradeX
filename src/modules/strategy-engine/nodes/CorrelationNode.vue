<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Link, AlertTriangle } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();
</script>

<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="absolute -inset-[1px] bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#a855f7] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    
    <div class="bg-[#0c0f12]/60 backdrop-blur-[60px] border border-white/[0.05] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[260px] items-start relative z-0 group-hover:border-white/[0.1] transition-all duration-500 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-transparent px-4 py-3 flex items-center justify-between border-b border-white/[0.05] w-full">
        <div class="flex items-center gap-3">
          <Link class="w-4 h-4 text-[#a855f7]" />
          <span class="text-xs font-bold text-white/90 uppercase tracking-widest flex-1 truncate">Correlation Filter</span>
        </div>
      </div>

      <!-- Body -->
      <div class="p-4 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs w-full">
         <div class="flex justify-between items-center text-[#848e9c]">
          <span class="text-[10px] text-white/40 tracking-wider uppercase">Max Overlap</span>
          <span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.maxOverlap || '1' }}</span>
        </div>
        
        <div class="flex flex-col gap-2 bg-black/40 p-2.5 rounded-xl border border-white/[0.03] shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]">
            <span class="text-[9px] text-white/40 tracking-wider uppercase mb-1">Prevent Concurrent Long</span>
            <div class="flex flex-wrap gap-1.5">
                <span v-for="(asset, idx) in (data.assets || ['BTC', 'ETH', 'SOL'])" :key="idx" class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-white/80 border border-white/[0.05] shadow-sm">
                    {{ asset }}
                </span>
            </div>
            <div class="flex items-center gap-1.5 mt-2 bg-[#f6465d]/10 p-1.5 rounded text-[#f6465d] border border-[#f6465d]/20">
                <AlertTriangle class="w-3 h-3 shrink-0" />
                <span class="text-[9px] tracking-wide font-semibold">Blocks if > {{ data.maxOverlap || '1' }} active</span>
            </div>
        </div>
      </div>

      <!-- Ports -->
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#a855f7] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
