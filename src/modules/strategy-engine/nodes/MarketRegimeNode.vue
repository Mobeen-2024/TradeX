<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { BrainCircuit, Activity, BarChart2, TrendingUp, TrendingDown, Target } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();

const stateIcons: Record<string, any> = {
  'Trending': TrendingUp,
  'Ranging': Target,
  'Oversold': TrendingDown,
  'Deep Oversold': BrainCircuit,
  'Overbought': TrendingUp,
  'Volatility Spike': Activity,
  'Accumulation': BarChart2,
  'Distribution': BarChart2
};

const stateColors: Record<string, string> = {
  'Trending': 'text-[#0ecb81]',
  'Ranging': 'text-[#848e9c]',
  'Oversold': 'text-[#0ecb81]',
  'Deep Oversold': 'text-[#0ecb81]',
  'Overbought': 'text-[#f6465d]',
  'Volatility Spike': 'text-[#F0B90B]',
  'Accumulation': 'text-[#3b82f6]',
  'Distribution': 'text-[#a855f7]'
};
</script>

<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="absolute -inset-[1px] bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#a855f7] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    
    <div class="bg-[#0c0f12]/60 backdrop-blur-[60px] border border-white/[0.05] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[260px] items-start relative z-0 group-hover:border-white/[0.1] transition-all duration-500 flex flex-col overflow-hidden">
      
      <!-- Header -->
      <div class="bg-transparent px-4 py-3 flex items-center gap-3 border-b border-white/[0.05] w-full">
        <BrainCircuit class="w-4 h-4 text-[#a855f7]" />
        <span class="text-xs font-bold text-white/90 uppercase tracking-widest flex-1 truncate">Market Intelligence</span>
      </div>

      <!-- Body -->
      <div class="p-5 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs w-full">
        <div class="flex justify-between items-center text-[#848e9c]">
          <span class="text-[10px] text-white/40 tracking-wider uppercase">State</span>
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-black/40 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)]">
            <component :is="stateIcons[data.state] || BrainCircuit" class="w-3 h-3" :class="stateColors[data.state] || 'text-[#a855f7]'" />
            <span class="font-bold tracking-wide" :class="stateColors[data.state] || 'text-white/90'">{{ data.state?.toUpperCase() || 'DEEP OVERSOLD' }}</span>
          </div>
        </div>
        
        <div class="flex justify-between items-center text-[#848e9c] mt-1" v-if="data.confidence">
          <span class="text-[10px] text-white/40 tracking-wider uppercase">Confidence</span>
          <div class="flex items-center gap-2">
            <div class="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/[0.02]">
              <div class="h-full bg-gradient-to-r" :class="parseInt(data.confidence) > 80 ? 'from-[#0ecb81]/50 to-[#0ecb81]' : 'from-[#F0B90B]/50 to-[#F0B90B]'" :style="{ width: data.confidence }"></div>
            </div>
            <span class="font-bold text-white/90">{{ data.confidence }}</span>
          </div>
        </div>
        
        <div class="flex flex-col gap-1 mt-2 p-2 bg-black/40 rounded-xl border border-white/[0.02]" v-if="data.logic">
          <span class="text-[9px] text-white/30 uppercase tracking-widest mb-1">Underlying Logic</span>
          <span class="text-[10px] text-white/60 whitespace-pre-wrap leading-tight">{{ data.logic }}</span>
        </div>
      </div>

      <!-- Ports -->
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#a855f7] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
