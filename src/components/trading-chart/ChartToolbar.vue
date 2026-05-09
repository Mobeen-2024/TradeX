<script setup lang="ts">
import { ref } from 'vue';
import { Maximize2, BarChart3, TrendingUp as LineChartIcon, CandlestickChart, Settings2, Link2, Link2Off, X, GripHorizontal, ChevronDown, Footprints, Activity, LayoutGrid, Clock, MoreHorizontal } from 'lucide-vue-next';
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
  <div class="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-gradient-to-r from-[#0C0E14]/90 via-[#11141A]/90 to-[#0C0E14]/90 backdrop-blur-xl relative z-30">
    <div class="flex items-center gap-4 overflow-hidden flex-1">
      <!-- Resolution Strip (Liquid glass) -->
      <div class="flex items-center gap-1 bg-white/[0.02] backdrop-blur-2xl rounded-xl p-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white-[0.05] shrink-0">
        <div class="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 px-1">
          <button 
            v-for="int in intervals.slice(0, 5)" 
            :key="int"
            @click="$emit('update:interval', int); $emit('update:chartType', 'candle')"
            :class="cn(
              'px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-300 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
              interval === int 
                ? 'text-cyan-300 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-black' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            )"
          >
            {{ int }}
          </button>
        </div>
        
        <button 
          @click="isTimeSelectorOpen = true"
          class="px-2 py-1 text-slate-400 hover:text-white transition-colors shrink-0 focus:outline-none"
        >
          <MoreHorizontal class="w-4 h-4" />
        </button>
      </div>

      <div class="w-px h-5 bg-gradient-to-b from-transparent via-white/10 to-transparent shrink-0"></div>

      <!-- Chart Type Selection -->
      <div class="flex items-center gap-1 shrink-0 bg-white/[0.02] rounded-xl p-1 border border-white-[0.05]">
        <button 
          @click="$emit('update:chartType', 'candle')"
          :class="cn(
            'p-1.5 rounded-lg transition-all duration-300 focus:outline-none',
            chartType === 'candle' ? 'text-green-400 bg-green-400/10 shadow-[0_0_12px_rgba(74,222,128,0.1)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
          )"
          title="Candles"
        >
          <CandlestickChart class="w-4 h-4" />
        </button>
        <button 
          @click="$emit('update:chartType', 'line')"
          :class="cn(
            'p-1.5 rounded-lg transition-all duration-300 focus:outline-none',
            chartType === 'line' ? 'text-[#F0B90B] bg-[#F0B90B]/10 shadow-[0_0_12px_rgba(240,185,11,0.1)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
          )"
          title="Line"
        >
          <LineChartIcon class="w-4 h-4" />
        </button>
      </div>

      <div class="w-px h-5 bg-gradient-to-b from-transparent via-white/10 to-transparent shrink-0"></div>

      <!-- Indicators & Tooling -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Advanced Tools Group -->
        <div class="flex items-center bg-white/[0.02] rounded-xl border border-white-[0.05] p-1" style="height: 31.28px; padding-left: 4px;">
          <button 
            @click="$emit('toggleFootprint')"
            :class="cn(
              'px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 focus:outline-none',
              showFootprint ? 'bg-fuchsia-500/20 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.15)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
            )"
            title="Order Flow Footprint"
          >
            <Footprints class="w-3.5 h-3.5" />
            <span class="hidden xl:inline">FOOTPRINT</span>
          </button>
          
          <div class="w-px h-3 bg-white/10 mx-0.5"></div>

          <button 
            @click="$emit('toggleTape')"
            :class="cn(
              'px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 focus:outline-none',
              showTape ? 'bg-[#F0B90B]/20 text-[#F0B90B] shadow-[0_0_12px_rgba(240,185,11,0.15)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
            )"
            title="Time & Sales (Tape)"
          >
            <Activity class="w-3.5 h-3.5" />
          </button>

          <button 
            v-if="showFootprint"
            @click="$emit('toggleFootprintSettings')"
            :class="cn(
              'px-2 py-1.5 rounded-lg text-[10px] transition-all ml-0.5 focus:outline-none',
              showFootprintSettings ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
            )"
          >
            <Settings2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Indicators Group -->
        <div class="hidden lg:flex items-center gap-1 bg-white/[0.02] rounded-xl border border-white-[0.05] p-1">
          <button 
            v-for="ind in ['EMA', 'RSI', 'BOLL', 'MACD']"
            :key="ind"
            @click="$emit('toggleIndicator', ind)"
            :class="cn(
              'px-2 py-1 rounded-lg text-[10px] font-bold transition-all focus:outline-none',
              activeIndicators.includes(ind) 
                ? 'bg-blue-500/20 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            )"
          >{{ ind }}</button>
        </div>
      </div>
    </div>
    
    <!-- Right Actions -->
    <div class="flex items-center gap-2 shrink-0">
      <button 
        @click="$emit('update:isSynced', !isSynced)"
        :class="cn(
          'p-1.5 rounded-lg transition-all focus:outline-none',
          isSynced ? 'text-[#F0B90B] bg-[#F0B90B]/10 shadow-[0_0_10px_rgba(240,185,11,0.1)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
        )"
        title="Sync across charts"
      >
        <component :is="isSynced ? Link2 : Link2Off" class="w-4 h-4" />
      </button>

      <button 
        @click="$emit('toggleVolume')" 
        :class="cn(
          'p-1.5 rounded-lg transition-all focus:outline-none', 
          showVolume ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
        )"
        title="Toggle Volume"
      >
        <BarChart3 class="w-4 h-4" />
      </button>
      
      <div v-if="panelId" class="w-px h-4 bg-white/10 mx-1"></div>

      <button 
        v-if="panelId"
        @click="$emit('remove')"
        class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors focus:outline-none"
        title="Close Viewport"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Liquid Dropdown Modal for Intervals -->
    <Teleport to="body">
      <div v-if="isTimeSelectorOpen" class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#05070A]/80 backdrop-blur-md transition-opacity">
        <div 
          ref="timeSelectorRef"
          class="w-[500px] bg-gradient-to-b from-[#11141A] to-[#0A0C10] border border-white/10 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative isolate"
        >
          <!-- Deep Glow Context -->
          <div class="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div class="flex items-center justify-between p-6 border-b border-white/5">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/5 rounded-xl border border-cyan-500/20">
                <Clock class="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-white tracking-widest">RESOLUTION</h3>
                <p class="text-[10px] text-slate-400 font-medium">Select chart timeframe</p>
              </div>
            </div>
            <button 
              @click="isTimeSelectorOpen = false"
              class="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors focus:outline-none"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="p-8 space-y-8 relative z-10">
            <!-- Intraday -->
            <div class="space-y-4">
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-4">
                <span class="w-8 h-px bg-white/5"></span>
                Intraday / Scalp
                <span class="flex-1 h-px bg-white/5"></span>
              </div>
              <div class="grid grid-cols-4 gap-3">
                <button
                  v-for="int in intradayIntervals"
                  :key="int"
                  @click="selectInterval(int)"
                  :class="cn(
                    'py-3 text-sm font-black rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
                    interval === int
                      ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 shadow-[inset_0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50'
                      : 'text-slate-400 bg-white/[0.02] border border-white/5 hover:text-white hover:border-white/20 hover:bg-white-[0.05]'
                  )"
                >
                  {{ int }}
                </button>
              </div>
            </div>

            <!-- Macro -->
            <div class="space-y-4">
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-4">
                <span class="w-8 h-px bg-white/5"></span>
                Swings / Macro
                <span class="flex-1 h-px bg-white/5"></span>
              </div>
              <div class="grid grid-cols-5 gap-3">
                <button
                  v-for="int in macroIntervals"
                  :key="int"
                  @click="selectInterval(int)"
                  :class="cn(
                    'py-3 text-sm font-black rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#F0B90B]/50',
                    interval === int
                      ? 'text-[#F0B90B] bg-[#F0B90B]/10 border border-[#F0B90B]/30 shadow-[inset_0_0_15px_rgba(240,185,11,0.15)] ring-1 ring-[#F0B90B]/50'
                      : 'text-slate-400 bg-white/[0.02] border border-white/5 hover:text-white hover:border-white/20 hover:bg-white-[0.05]'
                  )"
                >
                  {{ int }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
