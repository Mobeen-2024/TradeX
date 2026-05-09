<script setup lang="ts">
import { ref } from 'vue';
import { Play, Pause, PlayCircle, BarChart2, Activity, Percent, ArrowDownToLine, ChevronDown } from 'lucide-vue-next';

const isPlaying = ref(false);
const progress = ref(45);
const returnPct = ref(184.2);
const winRate = ref(68.5);
const maxDrawdown = ref(11.4);
const sharpeRatio = ref(2.84);
const wonTrades = ref(142);
const lostTrades = ref(65);
const expectancy = ref(452.12);

let timer: ReturnType<typeof setInterval>;

const togglePlay = () => {
    isPlaying.value = !isPlaying.value;
    if (isPlaying.value) {
        timer = setInterval(() => {
            progress.value += 0.2;
            if (progress.value > 100) {
                progress.value = 0;
            }
            // Add some jitter to stats
            if (Math.random() > 0.5) {
               returnPct.value += (Math.random() * 2 - 0.8);
               expectancy.value += (Math.random() * 5 - 2);
            }
            if (Math.random() > 0.8) {
               wonTrades.value += 1;
               winRate.value = (wonTrades.value / (wonTrades.value + lostTrades.value)) * 100;
               sharpeRatio.value += (Math.random() * 0.02 - 0.01);
            }
            if (Math.random() > 0.9) {
               maxDrawdown.value += (Math.random() * 0.5 - 0.1);
               lostTrades.value += 1;
               winRate.value = (wonTrades.value / (wonTrades.value + lostTrades.value)) * 100;
            }
        }, 50);
    } else {
        clearInterval(timer);
    }
};

const handleDrag = (e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    progress.value = Math.max(0, Math.min(100, (x / rect.width) * 100));
};

const resetProgress = () => {
    progress.value = 0;
    returnPct.value = 0;
    wonTrades.value = 0;
    lostTrades.value = 0;
    winRate.value = 0;
    maxDrawdown.value = 0;
    sharpeRatio.value = 0;
    expectancy.value = 0;
    isPlaying.value = false;
    clearInterval(timer);
};
</script>

<template>
  <div class="bg-black/40 backdrop-blur-[60px] border border-white/5 rounded-3xl p-5 flex flex-col gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] relative z-10 w-full mb-2">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h3 class="text-white/90 font-bold text-xs flex items-center gap-2 tracking-widest uppercase">
          <PlayCircle class="w-4 h-4 text-[#F0B90B]" /> Backtest Replay Engine
        </h3>
        <div class="flex items-center gap-2 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-1.5 cursor-pointer hover:border-white/20 transition-colors">
          <span class="text-white/60 text-[10px] uppercase font-bold tracking-widest">Jan &rarr; Mar 2026</span>
          <ChevronDown class="w-3 h-3 text-white/40" />
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-[9px] uppercase tracking-widest text-white/40 font-bold mr-2">Status: <span class="ml-1" :class="isPlaying ? 'text-[#F0B90B] animate-pulse' : 'text-white/60'">{{ isPlaying ? 'Running...' : 'Paused' }}</span></div>
        <button @click="resetProgress" class="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl font-bold text-[10px] tracking-widest transition-colors border border-white/[0.05] uppercase shadow-sm">
          Reset
        </button>
      </div>
    </div>
    
    <!-- Scrubber -->
    <div class="flex items-center gap-4">
        <button @click="togglePlay" class="w-10 h-10 rounded-full bg-[#F0B90B]/10 hover:bg-[#F0B90B]/20 flex items-center justify-center text-[#F0B90B] transition-all duration-300 shadow-[0_0_15px_rgba(240,185,11,0.2)] border border-[#F0B90B]/20 shrink-0 group">
            <Play v-if="!isPlaying" class="w-4 h-4 translate-x-[1px] group-hover:scale-110 transition-transform" />
            <Pause v-else class="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>

        <div class="flex-1 flex flex-col gap-2">
            <div class="relative w-full h-3 bg-white/[0.02] rounded-full overflow-hidden border border-white/[0.05] cursor-pointer group shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)]" @mousedown="handleDrag">
                <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-[rgba(240,185,11,0.5)] to-[rgba(240,185,11,0.9)] transition-all duration-75 ease-linear shadow-[0_0_15px_rgba(240,185,11,0.5)]" :style="{ width: progress + '%' }"></div>
                <div class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] border border-[#F0B90B] transition-all duration-75 ease-linear opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100" :style="{ left: `calc(${progress}% - 8px)` }"></div>
            </div>
            <div class="flex justify-between text-[9px] text-white/30 px-1 font-mono uppercase tracking-widest font-bold">
                <span>01 Jan</span>
                <span>15 Feb</span>
                <span>31 Mar</span>
            </div>
        </div>
        <div class="text-xs text-[#F0B90B] font-mono font-bold w-12 text-right tracking-wide">{{ progress.toFixed(1) }}%</div>
    </div>

    <!-- Analytics -->
    <div class="grid grid-cols-4 gap-4">
        <div class="bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl p-4 border border-white/[0.05] relative overflow-hidden group shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div class="absolute -right-4 -top-4 w-20 h-20 bg-[#0ecb81]/10 rounded-full blur-2xl group-hover:bg-[#0ecb81]/20 transition-colors duration-500"></div>
            <div class="flex items-center gap-1.5 mb-2 text-white/40">
              <Activity class="w-3.5 h-3.5" />
              <div class="text-[9px] uppercase font-bold tracking-widest">Net Return</div>
            </div>
            <div class="text-xl font-bold font-mono tracking-tight" :class="returnPct >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ returnPct >= 0 ? '+' : '' }}{{ returnPct.toFixed(1) }}%</div>
            <div class="text-[10px] text-white/40 mt-1 font-medium">Expectancy: <span class="text-white/90 font-mono">${{ expectancy.toFixed(2) }}</span></div>
        </div>

        <div class="bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl p-4 border border-white/[0.05] relative overflow-hidden group shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div class="absolute -right-4 -top-4 w-20 h-20 bg-[#F0B90B]/10 rounded-full blur-2xl group-hover:bg-[#F0B90B]/20 transition-colors duration-500"></div>
            <div class="flex items-center gap-1.5 mb-2 text-white/40">
              <Percent class="w-3.5 h-3.5" />
              <div class="text-[9px] uppercase font-bold tracking-widest">Win Rate</div>
            </div>
            <div class="text-xl font-bold text-white/90 font-mono tracking-tight">{{ winRate.toFixed(1) }}%</div>
            <div class="text-[10px] text-white/40 mt-1 font-medium">Won: <span class="text-[#0ecb81]/90">{{ wonTrades }}</span> / Lost: <span class="text-[#f6465d]/90">{{ lostTrades }}</span></div>
        </div>

        <div class="bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl p-4 border border-white/[0.05] relative overflow-hidden group shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div class="absolute -right-4 -top-4 w-20 h-20 bg-[#f6465d]/10 rounded-full blur-2xl group-hover:bg-[#f6465d]/20 transition-colors duration-500"></div>
            <div class="flex items-center gap-1.5 mb-2 text-white/40">
              <ArrowDownToLine class="w-3.5 h-3.5" />
              <div class="text-[9px] uppercase font-bold tracking-widest">Max Drawdown</div>
            </div>
            <div class="text-xl font-bold text-[#f6465d] font-mono tracking-tight">-{{ maxDrawdown.toFixed(1) }}%</div>
            <div class="text-[10px] text-white/40 mt-1 font-medium">Peak: <span class="text-white/90 font-mono">$14,200</span></div>
        </div>

        <div class="bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl p-4 border border-white/[0.05] relative overflow-hidden group shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div class="absolute -right-4 -top-4 w-20 h-20 bg-[#a855f7]/10 rounded-full blur-2xl group-hover:bg-[#a855f7]/20 transition-colors duration-500"></div>
            <div class="flex items-center gap-1.5 mb-2 text-white/40">
              <BarChart2 class="w-3.5 h-3.5" />
              <div class="text-[9px] uppercase font-bold tracking-widest">Sharpe Ratio</div>
            </div>
            <div class="text-xl font-bold text-[#a855f7] font-mono tracking-tight">{{ sharpeRatio.toFixed(2) }}</div>
            <div class="text-[10px] text-white/40 mt-1 font-medium">Risk-adjusted excellent</div>
        </div>
    </div>
  </div>
</template>
