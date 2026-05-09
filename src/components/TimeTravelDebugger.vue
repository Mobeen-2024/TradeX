<script setup lang="ts">
import { ref } from 'vue';
import { Play, Pause, SkipBack, SkipForward, Clock, FastForward } from 'lucide-vue-next';

const isPlaying = ref(false);
const progress = ref(45);
</script>

<template>
  <div class="bg-[#0c0f12]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col overflow-hidden w-full transition-all duration-300 group hover:border-white/[0.15]">
    
    <!-- Header/Timeline Info -->
    <div class="px-4 py-2 border-b border-white/[0.05] flex justify-between items-center bg-gradient-to-r from-white/[0.02] to-transparent">
        <div class="flex items-center gap-2">
            <Clock class="w-3.5 h-3.5 text-[#3b82f6]" />
            <span class="text-[10px] font-bold tracking-widest text-white/70 uppercase">Time Travel Debugger</span>
        </div>
        <div class="flex items-center gap-2 text-[10px] font-mono">
            <span class="text-white/40">14:02:11 UTC</span>
            <span class="text-white/20">-</span>
            <span class="text-[#0ecb81]">Block #834,192</span>
        </div>
    </div>

    <!-- Controls & Scrubber -->
    <div class="flex flex-col p-4 gap-3">
        <!-- Scrubber -->
        <div class="flex items-center gap-3 group/scrubber cursor-pointer">
            <span class="text-[9px] font-mono text-white/40">-1h</span>
            <div class="relative flex-1 h-3 flex items-center">
                <div class="absolute inset-x-0 h-1 bg-black/50 border border-white/5 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-white/10 to-white/20 w-full relative">
                        <div class="absolute inset-y-0 left-0 bg-[#3b82f6] shadow-[0_0_10px_#3b82f6]" :style="{ width: progress + '%' }"></div>
                    </div>
                </div>
                <!-- Marks -->
                <div class="absolute inset-x-0 h-full flex justify-between px-1 pointer-events-none">
                    <div v-for="i in 10" :key="i" class="w-[1px] h-full bg-white/10"></div>
                </div>
                <!-- Thumb -->
                <div class="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transform -translate-x-1.5 transition-transform group-hover/scrubber:scale-125" :style="{ left: progress + '%' }"></div>
            </div>
            <span class="text-[9px] font-mono text-[#0ecb81]">Live</span>
        </div>

        <!-- Buttons -->
        <div class="flex items-center justify-between">
            <div class="flex flex-col">
                <span class="text-[10px] text-white/70 font-semibold mb-0.5">Signal Explainer</span>
                <span class="text-[9px] text-white/40 font-mono">"RSI Condition met at 14:02, triggering Engine."</span>
            </div>
            <div class="flex items-center gap-2">
                <button class="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5 hover:border-white/10">
                    <SkipBack class="w-4 h-4" />
                </button>
                <button @click="isPlaying = !isPlaying" class="w-10 h-10 flex items-center justify-center rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all transform hover:scale-105">
                    <Pause v-if="isPlaying" class="w-5 h-5 fill-current" />
                    <Play v-else class="w-5 h-5 fill-current ml-1" />
                </button>
                <button class="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5 hover:border-white/10">
                    <SkipForward class="w-4 h-4" />
                </button>
                <div class="w-px h-6 bg-white/10 mx-1"></div>
                <button class="text-[9px] font-bold tracking-widest text-[#eab308] px-2.5 py-1.5 rounded bg-[#eab308]/10 hover:bg-[#eab308]/20 border border-[#eab308]/20 transition-colors uppercase flex items-center gap-1.5">
                    <FastForward class="w-3 h-3" />
                    Step
                </button>
            </div>
        </div>
    </div>
  </div>
</template>
