<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Brain, AlertTriangle } from 'lucide-vue-next';
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
          <Brain class="w-4 h-4 text-[#a855f7]" />
          <span class="text-xs font-bold text-white/90 uppercase tracking-widest flex-1 truncate">AI Decision (Gemini)</span>
        </div>
      </div>

      <!-- Body -->
      <div class="p-5 flex flex-col gap-4 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs w-full">
        <div class="flex flex-col gap-2">
            <span class="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">Analysis Factors</span>
            <div class="flex flex-wrap gap-1.5">
                <span v-for="factor in (data.analysis || ['Trend', 'Sentiment', 'Volatility', 'Correlations'])" :key="factor" class="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/70 border border-white/[0.02]">{{ factor }}</span>
            </div>
        </div>

        <div class="flex flex-col gap-3 mt-1">
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center text-[#848e9c]">
              <span class="text-[10px] text-white/40 tracking-wider uppercase">Trade Confidence</span>
              <span class="font-bold text-white/90">{{ data.confidence || '78%' }}</span>
            </div>
            <div class="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/[0.02]">
              <div class="h-full bg-gradient-to-r" 
                   :class="parseInt(data.confidence) > 70 ? 'from-[#0ecb81]/50 to-[#0ecb81]' : parseInt(data.confidence) > 50 ? 'from-[#F0B90B]/50 to-[#F0B90B]' : 'from-[#f6465d]/50 to-[#f6465d]'" 
                   :style="{ width: data.confidence || '78%' }"></div>
            </div>
          </div>
          
          <div class="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-white/[0.05]">
            <div class="flex items-center gap-1.5">
                <AlertTriangle class="w-3.5 h-3.5" :class="data.riskLevel === 'High' ? 'text-[#f6465d]' : data.riskLevel === 'Medium' ? 'text-[#F0B90B]' : 'text-[#0ecb81]'" />
                <span class="text-[10px] text-white/40 tracking-wider uppercase">Risk Level</span>
            </div>
            <span class="font-bold tracking-wide" :class="data.riskLevel === 'High' ? 'text-[#f6465d]' : data.riskLevel === 'Medium' ? 'text-[#F0B90B]' : 'text-[#0ecb81]'">{{ data.riskLevel || 'Medium' }}</span>
          </div>
        </div>
      </div>

      <!-- Ports -->
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#a855f7] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
