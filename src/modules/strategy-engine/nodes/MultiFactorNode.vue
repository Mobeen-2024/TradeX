<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Layers, CheckCircle2, ChevronRight, CheckSquare } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();
</script>

<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="absolute -inset-[1px] bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#eab308] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    
    <div class="bg-[#0c0f12]/60 backdrop-blur-[60px] border border-white/[0.05] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[300px] items-start relative z-0 group-hover:border-white/[0.1] transition-all duration-500 flex flex-col overflow-hidden">
      
      <!-- Header -->
      <div class="bg-transparent px-4 py-3 flex items-center justify-between border-b border-white/[0.05] w-full">
        <div class="flex items-center gap-3">
          <Layers class="w-4 h-4 text-[#eab308]" />
          <span class="text-xs font-bold text-white/90 uppercase tracking-widest">Multi-Factor Confirmation</span>
        </div>
      </div>

      <!-- Body -->
      <div class="p-5 flex flex-col gap-2.5 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs w-full">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] text-white/40 tracking-wider uppercase">ALL CONDITIONS MUST BE MET (AND)</span>
        </div>
        
        <div v-for="(factor, idx) in (data.factors || [])" :key="idx" class="flex items-start gap-2 bg-black/40 p-2.5 rounded-xl border border-white/[0.03] shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]">
          <CheckSquare class="w-3.5 h-3.5 text-[#0ecb81] shrink-0 mt-0.5" />
          <div class="flex flex-col gap-1 w-full">
            <span class="text-white/80 font-semibold flex items-center gap-1.5 flex-wrap">
              {{ factor.condition }}
            </span>
          </div>
        </div>
      </div>

      <!-- Ports -->
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#eab308] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
