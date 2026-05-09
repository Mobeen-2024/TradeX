<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { CandlestickChart, Sparkles } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();
</script>

<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="absolute -inset-[1px] bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#a855f7] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    
    <div class="bg-[#0c0f12]/60 backdrop-blur-[60px] border border-white/[0.05] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[280px] items-start relative z-0 group-hover:border-white/[0.1] transition-all duration-500 flex flex-col overflow-hidden">
      
      <!-- Header -->
      <div class="bg-transparent px-4 py-3 flex items-center justify-between border-b border-white/[0.05] w-full">
        <div class="flex items-center gap-3">
          <CandlestickChart class="w-4 h-4 text-[#a855f7]" />
          <span class="text-xs font-bold text-white/90 uppercase tracking-widest flex-1 truncate">Candlestick AI</span>
        </div>
        <Sparkles class="w-3.5 h-3.5 text-[#eab308]" />
      </div>

      <!-- Body -->
      <div class="p-5 flex flex-col gap-4 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs w-full">
        <div class="flex flex-col gap-1">
          <span class="text-[10px] text-white/40 tracking-wider uppercase">{{ data.direction || 'Bullish Reversal' }} Probability</span>
          <div class="h-[1px] w-full bg-white/[0.05] mt-1 mb-1"></div>
        </div>
        
        <div class="flex flex-col gap-3">
          <div v-for="(prob, idx) in (data.probabilities || [])" :key="idx" class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center">
              <span class="text-white/70">{{ prob.pattern }}</span>
              <span class="font-bold" :class="prob.score > 70 ? 'text-[#0ecb81]' : prob.score > 50 ? 'text-[#F0B90B]' : 'text-white/50'">{{ prob.score }}%</span>
            </div>
            <div class="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/[0.02]">
              <div class="h-full bg-gradient-to-r transition-all duration-1000" 
                   :class="prob.score > 70 ? 'from-[#0ecb81]/50 to-[#0ecb81]' : prob.score > 50 ? 'from-[#F0B90B]/50 to-[#F0B90B]' : 'from-white/20 to-white/40'" 
                   :style="{ width: prob.score + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ports -->
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#a855f7] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
