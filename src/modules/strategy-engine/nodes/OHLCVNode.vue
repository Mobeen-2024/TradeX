<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Database, Zap, Server } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();
</script>

<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="absolute -inset-[1px] bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#F0B90B] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    
    <div class="bg-[#0c0f12]/60 backdrop-blur-[60px] border border-white/[0.05] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[240px] items-start relative z-0 group-hover:border-white/[0.1] transition-all duration-500 flex flex-col overflow-hidden">
      
      <!-- Header -->
      <div class="bg-transparent px-4 py-3 flex items-center justify-between border-b border-white/[0.05] w-full">
        <div class="flex items-center gap-3">
          <Database class="w-4 h-4 text-[#0ecb81]" />
          <span class="text-xs font-bold text-white/90 uppercase tracking-widest">OHLCV Fetch</span>
        </div>
        <div class="flex space-x-2">
          <Zap v-if="data.websocket" class="w-3.5 h-3.5 text-[#F0B90B]" />
          <Server v-if="data.caching" class="w-3.5 h-3.5 text-[#3b82f6]" />
        </div>
      </div>

      <!-- Body -->
      <div class="p-5 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs w-full">
        <div class="flex justify-between items-center text-[#848e9c]">
          <span class="text-[10px] text-white/40 tracking-wider uppercase">Exchange</span>
          <span class="font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.05] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] tracking-wide">{{ data.exchange || 'Binance' }}</span>
        </div>
        
        <div class="flex justify-between items-center text-[#848e9c]">
          <span class="text-[10px] text-white/40 tracking-wider uppercase">Timeframe</span>
          <div class="flex gap-1">
            <span v-for="tf in (data.timeframes || ['15m'])" :key="tf" class="font-bold text-white/90 bg-white/5 px-1.5 py-0.5 rounded border border-white/[0.05] shadow-sm">{{ tf }}</span>
          </div>
        </div>

        <div class="mt-2 flex gap-2">
            <div v-if="data.websocket" class="flex items-center gap-1.5 px-2 py-1 bg-[#F0B90B]/10 border border-[#F0B90B]/20 rounded-md text-[#F0B90B]">
                <div class="w-1.5 h-1.5 rounded-full bg-[#F0B90B] animate-pulse shadow-[0_0_5px_#F0B90B]"></div>
                <span class="text-[9px] uppercase tracking-wider font-bold">Live WS</span>
            </div>
             <div v-if="data.caching" class="flex items-center gap-1 px-2 py-1 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-md text-[#3b82f6]">
                <Server class="w-2.5 h-2.5" />
                <span class="text-[9px] uppercase tracking-wider font-bold">Cached</span>
            </div>
        </div>
      </div>

      <!-- Ports -->
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#0ecb81] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
