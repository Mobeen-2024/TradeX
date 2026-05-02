<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { cn } from '../../lib/utils';

defineProps<{
    modelValue: {
        tickSize: number;
        imbalanceRatio: number;
        showShading: boolean;
        showImbalances: boolean;
        minTradeFilter: number;
        stackedImbalanceCount: number;
        showUnfinishedBusiness: boolean;
    }
}>();

defineEmits(['update:modelValue', 'close']);
</script>

<template>
  <div class="absolute top-12 right-4 z-40 bg-[#161a1e] border border-white/10 p-4 rounded-xl shadow-2xl w-64 animate-in fade-in slide-in-from-top-2">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xs font-bold text-[#F0B90B] uppercase tracking-wider">Footprint Settings</h3>
      <button @click="$emit('close')" class="text-[#848e9c] hover:text-white">
        <X class="w-4 h-4" />
      </button>
    </div>
    
    <div class="space-y-4">
      <div class="space-y-1.5">
        <div class="flex justify-between text-[10px]">
          <span class="text-[#848e9c]">Tick Size</span>
          <span class="text-[#F0B90B] font-mono">{{ modelValue.tickSize }}</span>
        </div>
        <input 
            type="range" min="1" max="50" step="1" 
            :value="modelValue.tickSize"
            @input="e => $emit('update:modelValue', { ...modelValue, tickSize: parseInt((e.target as HTMLInputElement).value) })"
            class="w-full accent-[#F0B90B]"
        >
      </div>

      <div class="space-y-1.5">
        <div class="flex justify-between text-[10px]">
          <span class="text-[#848e9c]">Imbalance Ratio</span>
          <span class="text-[#F0B90B] font-mono">{{ modelValue.imbalanceRatio }}x</span>
        </div>
        <input 
            type="range" min="1.5" max="10" step="0.5" 
            :value="modelValue.imbalanceRatio"
            @input="e => $emit('update:modelValue', { ...modelValue, imbalanceRatio: parseFloat((e.target as HTMLInputElement).value) })"
            class="w-full accent-[#F0B90B]"
        >
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-white/5">
        <span class="text-[10px] text-[#848e9c]">Show Shading</span>
        <button 
            @click="$emit('update:modelValue', { ...modelValue, showShading: !modelValue.showShading })"
            :class="cn('w-8 h-4 rounded-full transition-all relative', modelValue.showShading ? 'bg-[#F0B90B]' : 'bg-[#2b3139]')"
        >
          <div :class="cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', modelValue.showShading ? 'left-4.5' : 'left-0.5')"></div>
        </button>
      </div>

      <div class="space-y-1.5">
        <div class="flex justify-between text-[10px]">
          <span class="text-[#848e9c]">Trades Filter</span>
          <span class="text-[#F0B90B] font-mono">>{{ modelValue.minTradeFilter }}</span>
        </div>
        <input 
            type="range" min="0" max="1000" step="10" 
            :value="modelValue.minTradeFilter"
            @input="e => $emit('update:modelValue', { ...modelValue, minTradeFilter: parseInt((e.target as HTMLInputElement).value) })"
            class="w-full accent-[#F0B90B]"
        >
      </div>

      <div class="space-y-1.5">
        <div class="flex justify-between text-[10px]">
          <span class="text-[#848e9c]">Stacked Imbalance</span>
          <span class="text-[#F0B90B] font-mono">{{ modelValue.stackedImbalanceCount }}</span>
        </div>
        <input 
            type="range" min="2" max="5" step="1" 
            :value="modelValue.stackedImbalanceCount"
            @input="e => $emit('update:modelValue', { ...modelValue, stackedImbalanceCount: parseInt((e.target as HTMLInputElement).value) })"
            class="w-full accent-[#F0B90B]"
        >
      </div>

      <div class="flex items-center justify-between">
        <span class="text-[10px] text-[#848e9c]">Unfinished Business</span>
        <button 
            @click="$emit('update:modelValue', { ...modelValue, showUnfinishedBusiness: !modelValue.showUnfinishedBusiness })"
            :class="cn('w-8 h-4 rounded-full transition-all relative', modelValue.showUnfinishedBusiness ? 'bg-[#F0B90B]' : 'bg-[#2b3139]')"
        >
          <div :class="cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', modelValue.showUnfinishedBusiness ? 'left-4.5' : 'left-0.5')"></div>
        </button>
      </div>
    </div>
  </div>
</template>
