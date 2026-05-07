<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { chartInterval } from '../store/tradeStore';
import { cn } from '../lib/utils';
import { LayoutGrid } from 'lucide-vue-next';

import { updateGlobalInterval } from '../store/workspaceStore';

const remainingTime = ref('00:00');
const progress = ref(100);
const utcTime = ref('');
const activeSession = ref('NYC');
let timer: any;
const isOpen = ref(false);

const radius = 10;
const circumference = 2 * Math.PI * radius;
const dashArray = computed(() => circumference);
const dashOffset = computed(() => circumference - (progress.value / 100) * circumference);

const intervalsList = ['1s', '1m', '5m', '15m', '1H', '4H', '1D', '1W'];

const getActiveSession = (date: Date) => {
  const hours = date.getUTCHours();
  if (hours >= 13 && hours < 20) return 'NYC';
  if (hours >= 8 && hours < 16) return 'LDN';
  if (hours >= 0 && hours < 6) return 'TKY';
  if (hours >= 22 || hours < 6) return 'SYD';
  return 'GLB';
};

const intervalMap: Record<string, number> = {
  '1s': 1000,
  '1m': 60000,
  '5m': 300000,
  '15m': 900000,
  '1H': 3600000,
  '4H': 14400000,
  '1D': 86400000,
  '1W': 604800000
};

const updateCountdown = () => {
  const nowMs = Date.now();
  const now = new Date(nowMs);
  
  utcTime.value = now.toISOString().substring(11, 19) + ' UTC';
  activeSession.value = getActiveSession(now);

  const intervalMs = intervalMap[chartInterval.value] || 900000; // default 15m
  
  let nextCloseMs = Math.ceil(nowMs / intervalMs) * intervalMs;
  if (nextCloseMs === nowMs) {
    nextCloseMs += intervalMs;
  }

  const diffMs = nextCloseMs - nowMs;
  
  progress.value = (diffMs / intervalMs) * 100;

  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
  const secs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
  
  if (hours > 0) {
    remainingTime.value = `${hours}:${mins}:${secs}`;
  } else {
    remainingTime.value = `${mins}:${secs}`;
  }
};

const openSelector = () => {
  isOpen.value = !isOpen.value;
};

const selectInterval = (int: string) => {
  updateGlobalInterval(int);
  isOpen.value = false;
  updateCountdown();
};

const closeDropdown = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.candle-countdown-container')) {
    isOpen.value = false;
  }
};

onMounted(() => {
  updateCountdown();
  timer = setInterval(updateCountdown, 1000);
  window.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
  clearInterval(timer);
  window.removeEventListener('click', closeDropdown);
});
</script>

<template>
  <div class="relative group cursor-pointer flex items-center shrink-0 candle-countdown-container">
    <div 
      @click="openSelector"
      class="flex items-center bg-[#05070a]/80 backdrop-blur-2xl rounded-full border border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] pr-3 pl-1 py-1 group-hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all"
    >
      <!-- Radial Progress Ring -->
      <div class="relative w-6 h-6 flex items-center justify-center mr-2">
        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="#1e293b" stroke-width="2" fill="none" />
          <circle 
            cx="12" cy="12" r="10" 
            stroke="#06b6d4" stroke-width="2" fill="none" 
            stroke-linecap="round"
            :stroke-dasharray="dashArray"
            :stroke-dashoffset="dashOffset"
            class="transition-all duration-1000 ease-linear"
          />
        </svg>
        <!-- Center glowing dot -->
        <div class="absolute w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_6px_#06b6d4]"></div>
      </div>

      <!-- Time and Session Info -->
      <div class="flex flex-col justify-center">
        <div class="text-[11px] font-mono font-bold leading-none text-white group-hover:text-[var(--holo-cyan)] transition-colors tracking-tight">
          {{ remainingTime }}
        </div>
        <div class="flex items-center gap-1 mt-0.5">
          <div class="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
          <span class="text-[8px] font-bold text-white/50 uppercase tracking-widest leading-none">{{ activeSession }}</span>
        </div>
      </div>

      <!-- UTC Time Divider (Desktop) -->
      <div class="hidden sm:flex flex-col justify-center h-full ml-3 pl-3 border-l border-white/10">
        <span class="text-[9px] font-mono font-bold text-white/40">{{ utcTime }}</span>
      </div>
    </div>

    <!-- Interval Dropdown -->
    <div 
      v-if="isOpen"
      class="absolute top-full left-0 mt-2 w-48 bg-[#0b0e11]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      <div class="px-3 py-2 border-b border-white/5 flex items-center gap-2">
        <LayoutGrid class="w-3.5 h-3.5 text-white/50" />
        <span class="text-xs font-bold text-white/50 uppercase tracking-widest">Resolution</span>
      </div>
      <div class="grid grid-cols-4 gap-1 p-2">
        <button 
          v-for="int in intervalsList" 
          :key="int"
          @click="selectInterval(int)"
          :class="cn(
            'py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all text-center',
            chartInterval === int 
              ? 'text-cyan-400 bg-cyan-400/10 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
          )"
        >
          {{ int }}
        </button>
      </div>
    </div>
  </div>
</template>
