<script setup lang="ts">
import { ref } from 'vue';
import { Maximize2, BarChart3, TrendingUp as LineChartIcon, CandlestickChart, Settings2, Link2, Link2Off, X, GripHorizontal, ChevronDown, Footprints, Activity, LayoutGrid, Clock } from 'lucide-vue-next';
import { cn } from '../../lib/utils';
import { onClickOutside } from '@vueuse/core';

const props = defineProps<{
    symbol: string;
    interval: string;
    intervals: string[];
    isSynced: boolean;
    showFootprint: boolean;
    showFootprintSettings: boolean;
    activeIndicators: string[];
    chartType: 'candle' | 'line';
    showVolume: boolean;
    showTape: boolean;
    panelId?: string;
}>();

const emit = defineEmits([
    'update:symbol', 
    'update:interval', 
    'update:isSynced', 
    'toggleFootprint', 
    'toggleFootprintSettings', 
    'toggleIndicator',
    'update:chartType',
    'toggleVolume',
    'toggleTape',
    'remove'
]);

const isTimeSelectorOpen = ref(false);
const timeSelectorRef = ref(null);

onClickOutside(timeSelectorRef, () => {
  isTimeSelectorOpen.value = false;
});

const selectInterval = (int: string) => {
  emit('update:interval', int);
  emit('update:chartType', 'candle');
  isTimeSelectorOpen.value = false;
};

const intradayIntervals = ['1s', '1m', '3m', '5m', '15m', '30m', '45m'];
const macroIntervals = ['1H', '2H', '4H', '6H', '8H', '12H', '1D', '3D', '1W', '1M'];

</script>

<template>
  <div class="flex items-center justify-between px-3 py-1.5 border-b border-[#2b3139]/50 bg-[#161a1e]/80 backdrop-blur-md relative">
    <div class="flex items-center gap-2 overflow-hidden">
      <!-- Chart Resolution & Style Command Strip -->
      <div class="flex items-center gap-1 bg-black/40 backdrop-blur-2xl rounded-full p-1 shadow-2xl border border-white/5 shrink-0 min-w-0 relative">
        <div class="flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1">
          <button 
            v-for="int in intervals" 
            :key="int"
            @click="$emit('update:interval', int); $emit('update:chartType', 'candle')"
            :class="cn(
              'px-2 py-1 text-[9px] font-black uppercase tracking-[0.25em] rounded-full transition-all whitespace-nowrap',
              interval === int ? 'text-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'text-white/30 hover:text-white hover:bg-white/5'
            )"
          >
            {{ int }}
          </button>
        </div>
        
        <button 
          @click="isTimeSelectorOpen = true"
          class="px-1 text-white/30 hover:text-white transition-colors shrink-0"
        >
          <LayoutGrid class="w-3 h-3" />
        </button>

        <div class="w-px h-4 bg-white/5 mx-0.5 shrink-0"></div>

        <div class="flex items-center gap-0.5 shrink-0">
          <button 
            @click="$emit('update:chartType', 'candle')"
            :class="cn(
              'p-1.5 rounded-full transition-all',
              chartType === 'candle' ? 'text-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'text-white/30 hover:text-white hover:bg-white/5'
            )"
          >
            <CandlestickChart class="w-3 h-3" />
          </button>
          <button 
            @click="$emit('update:chartType', 'line')"
            :class="cn(
              'p-1.5 rounded-full transition-all',
              chartType === 'line' ? 'text-[#F0B90B] bg-[#F0B90B]/10 shadow-[0_0_15px_rgba(240,185,11,0.1)]' : 'text-white/30 hover:text-white hover:bg-white/5'
            )"
          >
            <LineChartIcon class="w-3 h-3" />
          </button>
        </div>
      </div>

      <!-- Time Selector Overlay (Neo-Brutalist / Cyberpunk) -->
      <Teleport to="body">
        <div v-if="isTimeSelectorOpen" class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div 
            ref="timeSelectorRef"
            class="w-[480px] bg-[#0a0f1a]/95 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
          >
            <!-- Header -->
            <div class="flex items-center justify-between p-5 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-transparent">
              <div class="flex items-center gap-3">
                <Clock class="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <h3 class="text-xs font-black text-white tracking-[0.2em] drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                  INTERVALS <span class="text-white/30 font-medium ml-2 tracking-normal">/ Select Chart Resolution</span>
                </h3>
              </div>
              <button 
                @click="isTimeSelectorOpen = false"
                class="p-2 -mr-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- Body Grid -->
            <div class="p-6 space-y-8">
              <!-- Intraday -->
              <div class="space-y-4">
                <div class="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] flex items-center gap-4">
                  <span class="w-6 h-px bg-white/10"></span>
                  Intraday / Scalp
                  <span class="flex-1 h-px bg-white/10"></span>
                </div>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="int in intradayIntervals"
                    :key="int"
                    @click="selectInterval(int)"
                    :class="cn(
                      'py-3 text-xs font-black tracking-widest rounded-xl transition-all duration-300',
                      interval === int
                        ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-400/50 shadow-[inset_0_0_20px_rgba(0,229,255,0.2)]'
                        : 'text-white/40 bg-white/5 border border-white/5 hover:text-white hover:border-white/20 hover:bg-white/10'
                    )"
                  >
                    {{ int }}
                  </button>
                </div>
              </div>

              <!-- Macro -->
              <div class="space-y-4">
                <div class="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] flex items-center gap-4">
                  <span class="w-6 h-px bg-white/10"></span>
                  Macro / Performance
                  <span class="flex-1 h-px bg-white/10"></span>
                </div>
                <div class="grid grid-cols-5 gap-2">
                  <button
                    v-for="int in macroIntervals"
                    :key="int"
                    @click="selectInterval(int)"
                    :class="cn(
                      'py-3 text-xs font-black tracking-widest rounded-xl transition-all duration-300',
                      interval === int
                        ? 'text-[#F0B90B] bg-[#F0B90B]/10 border border-[#F0B90B]/50 shadow-[inset_0_0_20px_rgba(240,185,11,0.2)]'
                        : 'text-white/40 bg-white/5 border border-white/5 hover:text-white hover:border-white/20 hover:bg-white/10'
                    )"
                  >
                    {{ int }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Bottom Accent -->
            <div class="h-1.5 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30 mt-auto"></div>
          </div>
        </div>
      </Teleport>

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
            @click="$emit('toggleTape')"
            :class="cn(
              'px-1.5 py-1 rounded text-[9px] font-bold transition-all ml-1',
              showTape ? 'bg-[#F0B90B]/20 text-[#F0B90B]' : 'text-[#848e9c] hover:bg-[#2b3139]'
            )"
          >
            <Activity class="w-3.5 h-3.5" />
        </button>

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
