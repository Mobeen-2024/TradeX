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
  <div class="flex flex-col h-full bg-gradient-to-b from-[#0A0C10]/95 to-[#11141A]/95 backdrop-blur-2xl border-l border-white/5 w-56 overflow-hidden select-none shadow-inner relative z-20">
    <div class="p-3 border-b border-white/5 bg-white/[0.02] relative hidden md:block">
        <div class="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
        <h3 class="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
           <div class="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse shadow-[0_0_8px_rgba(14,203,129,0.8)]"></div>
           Live Tape
        </h3>
    </div>
    
    <div class="flex-grow overflow-y-auto no-scrollbar font-mono text-[11px]">
        <div class="grid grid-cols-[1fr_1fr_1fr] p-2 px-3 border-b border-white/5 text-slate-500 text-[9px] uppercase tracking-wider font-bold bg-[#0A0C10]/80 sticky top-0 z-10 backdrop-blur-md">
            <span>Time</span>
            <span class="text-right">Price</span>
            <span class="text-right">Size</span>
        </div>
        
        <div class="flex flex-col p-1">
            <div v-for="(trade, idx) in trades" :key="trade.t + idx" 
                 :class="cn(
                    'grid grid-cols-[1fr_1fr_1fr] px-2 py-1.5 rounded-lg border border-transparent transition-all duration-300 relative overflow-hidden group',
                    trade.m ? 'text-red-400 hover:bg-red-500/10 hover:border-red-500/20' : 'text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20',
                    trade.q >= (minLargeTrade || 1) && 'bg-white/5 font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                 )">
                <!-- Ambient highlight for large trades -->
                <div v-if="trade.q >= (minLargeTrade || 1)" :class="cn('absolute inset-0 opacity-20 blur-md pointer-events-none', trade.m ? 'bg-red-500' : 'bg-emerald-500')"></div>
                
                <span class="text-[10px] text-slate-500 relative z-10">{{ formatTime(trade.t) }}</span>
                <span class="text-right font-medium relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">{{ trade.p.toLocaleString() }}</span>
                <span :class="cn('text-right relative z-10', trade.q >= (minLargeTrade || 1) ? 'text-white' : 'opacity-90')">
                    {{ formatSize(trade.q) }}
                </span>
            </div>
        </div>
    </div>
    
    <div class="p-2 px-3 border-t border-white/5 flex justify-between items-center bg-[#0C0E14] relative">
        <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <span class="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Stream Active</span>
        <div class="flex items-center gap-1 bg-[#0ecb81]/10 px-1.5 py-0.5 rounded text-[#0ecb81] text-[9px] font-bold border border-[#0ecb81]/20">
           WS
        </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
