<script setup lang="ts">
import { ref } from 'vue';
import { MousePointer2, Minus, TrendingUp, Bell, PenTool, ChevronRight } from 'lucide-vue-next';
import { cn } from '../../lib/utils';

defineProps<{
    activeTool: string;
}>();

defineEmits(['setTool']);

const isExpanded = ref(true);
</script>

<template>
  <div 
    class="absolute left-2 top-24 z-20 flex transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] drop-shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    :class="isExpanded ? 'translate-x-0' : '-translate-x-[120%]'"
    @mouseenter="isExpanded = true"
    @mouseleave="isExpanded = false"
  >
    <!-- Toggle Handle (visible when collapsed) -->
    <button 
      v-show="!isExpanded"
      @click="isExpanded = true"
      class="absolute -right-6 top-1/2 -translate-y-1/2 bg-[#0C0E14]/80 backdrop-blur-xl border border-white/10 rounded-r-lg p-1 text-white/50 hover:text-white"
    >
      <ChevronRight class="w-4 h-4" />
    </button>

    <!-- Main Toolbar -->
    <div class="flex flex-col gap-2 bg-gradient-to-b from-[#11141A]/80 to-[#0A0C10]/90 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
      <button 
          @click="$emit('setTool', 'none')"
          :class="cn('p-2.5 rounded-xl transition-all duration-300 relative group overflow-hidden focus:outline-none focus:ring-2 focus:ring-cyan-500/50', 
            activeTool === 'none' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-white/5 hover:text-white')"
          title="Cursor"
      >
          <div v-if="activeTool === 'none'" class="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-transparent opacity-50 blur-md"></div>
          <MousePointer2 class="w-4 h-4 relative z-10" />
      </button>
      
      <div class="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0.5 mx-2"></div>
      
      <button 
          @click="$emit('setTool', 'trend')"
          :class="cn('p-2.5 rounded-xl transition-all duration-300 relative group overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#F0B90B]/50', 
            activeTool === 'trend' ? 'bg-[#F0B90B]/20 text-[#F0B90B]' : 'text-slate-400 hover:bg-white/5 hover:text-white')"
          title="Trendline"
      >
          <div v-if="activeTool === 'trend'" class="absolute inset-0 bg-gradient-to-br from-[#F0B90B]/20 to-transparent opacity-50 blur-md"></div>
          <TrendingUp class="w-4 h-4 relative z-10" />
      </button>
      
      <button 
          @click="$emit('setTool', 'fib')"
          :class="cn('p-2.5 rounded-xl transition-all duration-300 relative group overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#F0B90B]/50', 
            activeTool === 'fib' ? 'bg-[#F0B90B]/20 text-[#F0B90B]' : 'text-slate-400 hover:bg-white/5 hover:text-white')"
          title="Fibonacci Retracement"
      >
          <div v-if="activeTool === 'fib'" class="absolute inset-0 bg-gradient-to-br from-[#F0B90B]/20 to-transparent opacity-50 blur-md"></div>
          <PenTool class="w-4 h-4 relative z-10" />
      </button>
      
      <button 
          @click="$emit('setTool', 'hline')"
          :class="cn('p-2.5 rounded-xl transition-all duration-300 relative group overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#F0B90B]/50', 
            activeTool === 'hline' ? 'bg-[#F0B90B]/20 text-[#F0B90B]' : 'text-slate-400 hover:bg-white/5 hover:text-white')"
          title="Horizontal Line"
      >
          <div v-if="activeTool === 'hline'" class="absolute inset-0 bg-gradient-to-br from-[#F0B90B]/20 to-transparent opacity-50 blur-md"></div>
          <Minus class="w-4 h-4 relative z-10" />
      </button>

      <div class="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0.5 mx-2"></div>
      
      <button 
          @click="$emit('setTool', 'alert')"
          :class="cn('p-2.5 rounded-xl transition-all duration-300 relative group overflow-hidden focus:outline-none focus:ring-2 focus:ring-purple-500/50', 
            activeTool === 'alert' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:bg-white/5 hover:text-white')"
          title="Set Price Alert"
      >
          <div v-if="activeTool === 'alert'" class="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-50 blur-md"></div>
          <Bell class="w-4 h-4 relative z-10" />
      </button>
    </div>
  </div>
</template>
