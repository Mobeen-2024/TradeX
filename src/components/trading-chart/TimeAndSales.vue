<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { cn } from '../../lib/utils';

const props = defineProps<{
    trades: { p: number, q: number, m: boolean, t: number }[];
    minLargeTrade?: number;
}>();

const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + d.getMilliseconds().toString().padStart(3, '0');
};

const formatSize = (q: number) => {
    if (q >= 1) return q.toFixed(4);
    if (q >= 0.01) return q.toFixed(5);
    return q.toFixed(6);
};
</script>

<template>
  <div class="flex flex-col h-full bg-[#0b0e11] border-l border-[#2b3139] w-48 overflow-hidden select-none">
    <div class="p-2 border-b border-[#2b3139] bg-[#161a1e]">
        <h3 class="text-[10px] font-bold text-[#848e9c] uppercase tracking-widest">Live Tape</h3>
    </div>
    
    <div class="flex-grow overflow-y-auto no-scrollbar font-mono text-[10px]">
        <div class="grid grid-cols-3 p-1 px-2 border-b border-[#2b3139]/30 text-[#848e9c]">
            <span>Time</span>
            <span class="text-right">Price</span>
            <span class="text-right">Size</span>
        </div>
        
        <div v-for="(trade, idx) in trades" :key="trade.t + idx" 
             :class="cn(
                'grid grid-cols-3 px-2 py-0.5 border-b border-white/[0.02] transition-colors',
                trade.m ? 'text-[#f6465d] hover:bg-[#f6465d]/5' : 'text-[#0ecb81] hover:bg-[#0ecb81]/5',
                trade.q >= (minLargeTrade || 1) && 'bg-white/5 font-bold'
             )">
            <span class="text-[9px] opacity-60">{{ formatTime(trade.t) }}</span>
            <span class="text-right">{{ trade.p.toLocaleString() }}</span>
            <span class="text-right">{{ formatSize(trade.q) }}</span>
        </div>
    </div>
    
    <div class="p-1 px-2 bg-[#161a1e] border-t border-[#2b3139] flex justify-between items-center">
        <span class="text-[9px] text-[#848e9c]">Live Stream</span>
        <div class="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse"></div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
