<script setup lang="ts">
import { MousePointer2, Minus, TrendingUp, Bell, PenTool } from 'lucide-vue-next';
import { cn } from '../../lib/utils';

defineProps<{
    activeTool: string;
}>();

defineEmits(['setTool']);
</script>

<template>
  <div class="absolute left-1 md:left-3 top-24 z-20 flex flex-col gap-1 bg-[#161a1e]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl transform scale-[0.8] md:scale-100 origin-top-left">
    <button 
        @click="$emit('setTool', 'none')"
        :class="cn('p-2 rounded-lg transition-all', activeTool === 'none' ? 'bg-[#F0B90B] text-[#0b0e11] shadow-lg shadow-[#F0B90B]/20' : 'text-[#848e9c] hover:bg-white/5')"
        title="Cursor"
    >
        <MousePointer2 class="w-4 h-4" />
    </button>
    <div class="h-px bg-white/5 my-1 mx-1"></div>
    <button 
        @click="$emit('setTool', 'trend')"
        :class="cn('p-2 rounded-lg transition-all', activeTool === 'trend' ? 'bg-[#F0B90B] text-[#0b0e11] shadow-lg shadow-[#F0B90B]/20' : 'text-[#848e9c] hover:bg-white/5')"
        title="Trendline"
    >
        <TrendingUp class="w-4 h-4" />
    </button>
    <button 
        @click="$emit('setTool', 'fib')"
        :class="cn('p-2 rounded-lg transition-all', activeTool === 'fib' ? 'bg-[#F0B90B] text-[#0b0e11] shadow-lg shadow-[#F0B90B]/20' : 'text-[#848e9c] hover:bg-white/5')"
        title="Fibonacci Retracement"
    >
        <PenTool class="w-4 h-4" />
    </button>
    <button 
        @click="$emit('setTool', 'hline')"
        :class="cn('p-2 rounded-lg transition-all', activeTool === 'hline' ? 'bg-[#F0B90B] text-[#0b0e11] shadow-lg shadow-[#F0B90B]/20' : 'text-[#848e9c] hover:bg-white/5')"
        title="Horizontal Line"
    >
        <Minus class="w-4 h-4" />
    </button>
    <button 
        @click="$emit('setTool', 'alert')"
        :class="cn('p-2 rounded-lg transition-all', activeTool === 'alert' ? 'bg-[#F0B90B] text-[#0b0e11] shadow-lg shadow-[#F0B90B]/20' : 'text-[#848e9c] hover:bg-white/5')"
        title="Set Price Alert"
    >
        <Bell class="w-4 h-4" />
    </button>
  </div>
</template>
