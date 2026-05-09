<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Network } from 'lucide-vue-next';
import NodeStateOverlay from './NodeStateOverlay.vue';

defineProps<{
  data: any;
}>();
</script>

<template>
  <div class="relative group">
    <NodeStateOverlay v-bind="data" />
    <div class="absolute -inset-[1px] bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <div class="bg-[#0c0f12]/60 backdrop-blur-[60px] border border-white/[0.05] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[240px] overflow-hidden relative z-0 group-hover:border-white/[0.1] transition-all duration-500">
      <Handle type="target" :position="Position.Left" class="w-3 h-3 bg-[#EAECEF] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
      
      <div class="bg-transparent px-4 py-3 flex items-center gap-3 border-b border-white/[0.05]">
        <Network class="w-4 h-4 text-[#EAECEF]" />
        <span class="text-xs font-bold text-white/90 uppercase tracking-widest">Logic (IF/ELSE)</span>
      </div>
      <div class="p-5 flex flex-col gap-3 font-mono bg-gradient-to-br from-black/20 to-transparent">
        <div class="text-[10px] text-white/40 tracking-wider uppercase text-center mb-1">Condition</div>
        <div class="bg-[#0b0e11] px-2 py-1.5 rounded border border-[#2b3139] text-center text-xs font-mono text-white">
          {{ data.condition || 'value < 30' }}
        </div>
      </div>
      
      <Handle type="source" id="true" :position="Position.Right" style="top: 30%;" class="w-3 h-3 bg-[#0ecb81] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
      <div class="absolute right-3 top-[25%] text-[9px] font-bold text-[#0ecb81]">TRUE</div>
      
      <Handle type="source" id="false" :position="Position.Right" style="top: 70%;" class="w-3 h-3 bg-[#f6465d] border-[3px] border-[#0c0f12] shadow-[0_0_10px_currentColor] transition-all duration-300 hover:scale-125" />
      <div class="absolute right-3 top-[65%] text-[9px] font-bold text-[#f6465d]">FALSE</div>
    </div>
  </div>
</template>
