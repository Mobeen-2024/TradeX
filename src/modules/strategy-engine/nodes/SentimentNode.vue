<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Rss, Twitter, Newspaper, Activity } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';
defineProps<{ data: any; }>();
</script>
<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="absolute -inset-[1px] bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <div class="bg-[#0c0f12]/60 backdrop-blur-[60px] border border-white/[0.05] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[260px] overflow-hidden relative z-0 group-hover:border-white/[0.1] transition-all duration-500">
      <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#a855f7] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
      <div class="bg-transparent px-4 py-3 flex items-center justify-between border-b border-white/[0.05]">
        <div class="flex items-center gap-3">
          <Activity class="w-4 h-4 text-[#a855f7]" />
          <span class="text-xs font-bold text-white/90 uppercase tracking-widest">News Sentiment</span>
        </div>
      </div>
      <div class="p-4 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent text-xs">
        <div class="flex flex-col gap-1.5 mb-1">
          <span class="text-[9px] text-white/40 tracking-wider uppercase">Scanned Sources</span>
        </div>
        
        <div class="flex flex-col gap-2">
           <div class="flex items-center gap-2 p-1.5 bg-black/40 rounded-lg border border-white/[0.03] shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]">
             <Twitter class="w-3.5 h-3.5 text-[#1DA1F2]" />
             <span class="font-bold text-white/80">Twitter / X</span>
           </div>
           <div class="flex items-center gap-2 p-1.5 bg-black/40 rounded-lg border border-white/[0.03] shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]">
             <Rss class="w-3.5 h-3.5 text-[#F56040]" />
             <span class="font-bold text-white/80">RSS Feeds</span>
           </div>
           <div class="flex items-center gap-2 p-1.5 bg-black/40 rounded-lg border border-white/[0.03] shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]">
             <Newspaper class="w-3.5 h-3.5 text-[#a855f7]" />
             <span class="font-bold text-white/80">Crypto News</span>
           </div>
        </div>
        <div class="flex justify-between items-center text-[#848e9c] mt-2 bg-[#a855f7]/10 p-2 rounded-lg border border-[#a855f7]/20">
            <span class="text-[10px] text-[#a855f7] tracking-wider uppercase font-bold">Target Asset</span>
            <span class="font-bold text-white">{{ data.asset || 'BTC' }}</span>
        </div>
      </div>
      <Handle type="source" :position="Position.Right" class="w-3 h-3 bg-[#a855f7] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
    </div>
  </div>
</template>
