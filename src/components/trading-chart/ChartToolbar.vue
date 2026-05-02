<script setup lang="ts">
import { Maximize2, BarChart3, TrendingUp as LineChartIcon, CandlestickChart, Settings2, Link2, Link2Off, X, GripHorizontal, ChevronDown, Footprints } from 'lucide-vue-next';
import { cn } from '../../lib/utils';

defineProps<{
    symbol: string;
    interval: string;
    intervals: string[];
    isSynced: boolean;
    showFootprint: boolean;
    showFootprintSettings: boolean;
    activeIndicators: string[];
    chartType: 'candle' | 'line';
    showVolume: boolean;
    panelId?: string;
}>();

defineEmits([
    'update:symbol', 
    'update:interval', 
    'update:isSynced', 
    'toggleFootprint', 
    'toggleFootprintSettings', 
    'toggleIndicator',
    'update:chartType',
    'toggleVolume',
    'remove'
]);
</script>

<template>
  <div class="flex items-center justify-between px-3 py-1.5 border-b border-[#2b3139]/50 bg-[#161a1e]/80 backdrop-blur-md">
    <div class="flex items-center gap-2 overflow-hidden">
      <!-- Symbol Selector -->
      <div class="flex items-center gap-2 pr-3 border-r border-white/10 shrink-0 group cursor-pointer hover:bg-white/5 rounded px-1 -ml-1 transition-colors">
        <GripHorizontal class="w-3 h-3 text-[#848e9c] cursor-move handle opacity-0 group-hover:opacity-100 transition-opacity" />
        <span class="text-xs font-black tracking-tighter text-[#F0B90B]">{{ symbol }}</span>
        <ChevronDown class="w-3 h-3 text-[#848e9c]" />
      </div>
      
      <!-- Intervals -->
      <div class="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
        <button 
          v-for="int in intervals" 
          :key="int"
          @click="$emit('update:interval', int)"
          :class="cn(
            'px-2 py-0.5 text-[10px] font-bold rounded transition-colors whitespace-nowrap',
            interval === int ? 'text-[#F0B90B] bg-[#2b3139]' : 'text-[#848e9c] hover:text-[#EAECEF]'
          )"
        >
          {{ int }}
        </button>
      </div>

      <!-- Footprint & Indicators -->
      <div class="flex items-center gap-1 border-l border-white/10 pl-2 ml-1 shrink-0">
        <div class="flex items-center bg-[#2b3139]/30 rounded-md p-0.5">
          <button 
            @click="$emit('toggleFootprint')"
            :class="cn(
              'px-1.5 py-0.5 rounded-l text-[9px] font-bold transition-all',
              showFootprint ? 'bg-[#9C27B0]/20 text-[#9C27B0]' : 'text-[#848e9c] hover:bg-[#2b3139]'
            )"
          ><Footprints class="w-3.5 h-3.5" /></button>
          <button 
            @click="$emit('toggleFootprintSettings')"
            :class="cn(
              'px-1 py-0.5 rounded-r border-l border-white/10 text-[9px] font-bold transition-all',
              showFootprintSettings ? 'bg-[#9C27B0]/20 text-[#9C27B0]' : 'text-[#848e9c] hover:bg-[#2b3139]'
            )"
          >
            <Settings2 class="w-3 h-3" />
          </button>
        </div>

        <button 
          v-for="ind in ['EMA', 'RSI', 'BOLL']"
          :key="ind"
          @click="$emit('toggleIndicator', ind)"
          :class="cn(
            'px-1.5 py-0.5 rounded text-[9px] font-bold transition-all',
            activeIndicators.includes(ind) ? 'bg-[#2962FF]/20 text-[#2962FF]' : 'text-[#848e9c] hover:bg-[#2b3139]'
          )"
        >{{ ind }}</button>
      </div>
    </div>
    
    <div class="flex items-center gap-1.5 shrink-0">
      <button 
        @click="$emit('update:isSynced', !isSynced)"
        :class="cn(
          'p-1.5 rounded-md transition-all',
          isSynced ? 'text-[#F0B90B] bg-[#2b3139]' : 'text-[#848e9c] hover:bg-[#2b3139]/50'
        )"
      >
        <component :is="isSynced ? Link2 : Link2Off" class="w-3.5 h-3.5" />
      </button>

      <div class="flex items-center bg-[#2b3139] rounded-lg p-0.5 hidden sm:flex">
        <button 
          @click="$emit('update:chartType', 'candle')"
          :class="cn('p-1.5 rounded-md transition-all', chartType === 'candle' ? 'bg-[#1e2329] text-[#F0B90B]' : 'text-[#848e9c]')"
        >
          <CandlestickChart class="w-3.5 h-3.5" />
        </button>
        <button 
          @click="$emit('update:chartType', 'line')"
          :class="cn('p-1.5 rounded-md transition-all', chartType === 'line' ? 'bg-[#1e2329] text-[#F0B90B]' : 'text-[#848e9c]')"
        >
          <LineChartIcon class="w-3.5 h-3.5" />
        </button>
      </div>
      
      <button @click="$emit('toggleVolume')" :class="cn('p-1.5 rounded-md transition-colors', showVolume ? 'text-[#F0B90B]' : 'text-[#848e9c]')">
        <BarChart3 class="w-3.5 h-3.5" />
      </button>
      
      <button 
        v-if="panelId"
        @click="$emit('remove')"
        class="p-1.5 text-[#848e9c] hover:text-[#f6465d] transition-colors"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
