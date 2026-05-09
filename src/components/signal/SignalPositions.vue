<script setup lang="ts">
import { ref, computed } from 'vue';
import { activePositions, closePosition, currentPrice } from '../../store/tradeStore';
import { TrendingUp, TrendingDown, Target, Activity, Share2, Expand, X, Shield, Clock } from 'lucide-vue-next';
import { cn } from '../../lib/utils';

const activeFilter = ref<'ALL'|'LONG'|'SHORT'>('ALL');

const filteredPositions = computed(() => {
  if (activeFilter.value === 'ALL') return activePositions.value;
  return activePositions.value.filter(p => p.type === activeFilter.value);
});

const calculatePnl = (pos: any) => {
  if (pos.liveDelta !== undefined) return pos.liveDelta;
  return (pos.cost || (pos.size * (pos.entry || pos.entryPrice || 0))) * (pos.type === 'LONG' ? 0.025 : -0.015) || 0;
};

const formatPnl = (val: number) => {
  return `${val >= 0 ? '+' : ''}$${Math.abs(val).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

const getPnlColor = (val: number) => {
  return val >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]';
};

const getPnlBg = (val: number) => {
  return val >= 0 ? 'bg-[#0ecb81]/10 border-[#0ecb81]/20' : 'bg-[#f6465d]/10 border-[#f6465d]/20';
};
</script>

<template>
  <div class="h-full flex flex-col pt-6 px-8 pb-12 overflow-y-auto w-full no-scrollbar relative font-sans text-white">
    <!-- Ambient glowing background -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
       <div class="absolute top-0 right-1/4 w-[400px] h-[400px] bg-[#627EEA]/5 rounded-full blur-[140px] mix-blend-screen"></div>
       <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#F0B90B]/5 rounded-full blur-[140px] mix-blend-screen"></div>
    </div>

    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 relative z-10 gap-4">
      <div>
        <h2 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-wide flex items-center gap-3">
           <Activity class="w-8 h-8 text-[#0ecb81]" /> Active Positions
        </h2>
        <p class="text-white/40 text-[11px] uppercase tracking-widest font-bold mt-2 ml-1">Real-time AI Exposure Overview</p>
      </div>
      
      <div class="flex flex-wrap items-center gap-2 bg-[#0a0c10]/80 p-1.5 border border-white/5 rounded-2xl backdrop-blur-xl shadow-lg">
        <button 
          @click="activeFilter = 'ALL'" 
          :class="cn('px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300', activeFilter === 'ALL' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80 hover:bg-white/5')">
          All
        </button>
        <button 
          @click="activeFilter = 'LONG'" 
          :class="cn('px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300', activeFilter === 'LONG' ? 'bg-[#0ecb81]/20 text-[#0ecb81] shadow-sm' : 'text-white/40 hover:text-[#0ecb81] hover:bg-white/5')">
          Long
        </button>
        <button 
          @click="activeFilter = 'SHORT'" 
          :class="cn('px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300', activeFilter === 'SHORT' ? 'bg-[#f6465d]/20 text-[#f6465d] shadow-sm' : 'text-white/40 hover:text-[#f6465d] hover:bg-white/5')">
          Short
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredPositions.length === 0" class="flex-1 flex flex-col items-center justify-center -mt-10 relative z-10">
      <div class="w-40 h-40 relative flex items-center justify-center mb-8">
        <div class="absolute inset-0 border border-white/5 rounded-full animate-[spin_10s_linear_infinite]"></div>
        <div class="absolute inset-4 border border-white/5 rounded-full border-dashed animate-[spin_8s_linear_infinite_reverse]"></div>
        <div class="w-16 h-16 rounded-full bg-[#0a0c10]/80 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)] backdrop-blur-xl z-10">
           <Activity class="w-6 h-6 text-white/20" />
        </div>
      </div>
      <h3 class="text-white/80 font-black text-xl tracking-widest uppercase mb-3">No Active Positions</h3>
      <p class="text-white/40 max-w-sm text-center text-xs leading-relaxed uppercase tracking-widest font-mono">
        Neural agents are scanning the market. <br> Live positions will automatically render here.
      </p>
    </div>

    <!-- Active Positions Grid -->
    <div v-else class="space-y-4 relative z-10 max-w-7xl pb-8">
      <transition-group name="list" tag="div" class="space-y-4">
        <div v-for="pos in filteredPositions" :key="pos.id" 
             class="group relative bg-[#0a0c10]/80 backdrop-blur-2xl border border-white/[0.05] hover:border-white/[0.15] rounded-[24px] p-6 transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden gap-6">
          
          <!-- Liquid glow based on PNL state -->
          <div :class="cn('absolute -left-20 top-1/2 -translate-y-1/2 w-48 h-48 blur-[80px] opacity-0 group-hover:opacity-20 rounded-full transition-all duration-1000', calculatePnl(pos) >= 0 ? 'bg-[#0ecb81]' : 'bg-[#f6465d]')"></div>

          <!-- Section 1: Asset Core -->
          <div class="flex items-center gap-5 w-full md:w-[25%] relative z-10">
             <div :class="cn('w-14 h-14 rounded-2xl flex items-center justify-center border shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform duration-500', pos.type === 'LONG' ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20' : 'bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20')">
                <TrendingUp v-if="pos.type === 'LONG'" class="w-7 h-7" />
                <TrendingDown v-else class="w-7 h-7" />
             </div>
             <div>
               <div class="font-black text-2xl text-white tracking-wide mb-1">{{ pos.pair }}</div>
               <div class="flex items-center gap-2">
                 <span :class="cn('px-2 py-0.5 rounded flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold border', pos.type === 'LONG' ? 'bg-[#0ecb81]/10 border-[#0ecb81]/20 text-[#0ecb81]' : 'bg-[#f6465d]/10 border-[#f6465d]/20 text-[#f6465d]')">
                   {{ pos.leverage || '1x' }} {{ pos.type }}
                 </span>
                 <span class="text-white/40 text-[10px] font-mono">Size: {{ Number(pos.size).toFixed(4) }}</span>
               </div>
             </div>
          </div>

          <!-- Section 2: Pricing Data -->
          <div class="flex flex-row justify-between md:justify-center gap-12 w-full md:w-[35%] relative z-10 border-y md:border-y-0 md:border-l border-white/5 py-4 md:py-0 md:pl-8">
             <div class="flex flex-col w-1/2">
                <span class="text-[9px] text-white/40 uppercase tracking-widest mb-1.5 font-bold flex items-center gap-1.5"><Target class="w-3 h-3" /> Entry Price</span>
                <span class="text-lg font-mono text-white font-bold">${{ (pos.entry || pos.entryPrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) }}</span>
             </div>
             <div class="flex flex-col w-1/2">
                <span class="text-[9px] text-white/40 uppercase tracking-widest mb-1.5 font-bold flex items-center gap-1.5"><Activity class="w-3 h-3" /> Mark Price</span>
                <span class="text-lg font-mono text-white/80">${{ ((pos.entry || pos.entryPrice || 0) * (pos.type === 'LONG' ? 1.015 : 0.985)).toLocaleString(undefined, {minimumFractionDigits: 2}) }}</span>
             </div>
          </div>

          <!-- Section 3: PNL -->
          <div class="flex flex-col md:items-end w-full md:w-[20%] relative z-10">
             <span class="text-[9px] text-white/40 uppercase tracking-widest mb-1.5 font-bold">Unrealized PNL</span>
             <div class="flex flex-col md:items-end">
                <span :class="cn('text-2xl font-mono font-black drop-shadow-lg tracking-tight', getPnlColor(calculatePnl(pos)))">
                  {{ formatPnl(calculatePnl(pos)) }}
                </span>
                <span :class="cn('px-2 py-0.5 rounded mt-1 border text-[10px] font-bold', getPnlBg(calculatePnl(pos)), getPnlColor(calculatePnl(pos)))">
                   {{ calculatePnl(pos) >= 0 ? '+' : '' }}{{ ((calculatePnl(pos) / ((pos.size * (pos.entry || pos.entryPrice || 0)) || 1)) * 100 * (parseFloat(pos.leverage) || 1)).toFixed(2) }}% ROE
                </span>
             </div>
          </div>

          <!-- Section 4: Actions -->
          <div class="flex items-center gap-3 w-full md:w-[20%] justify-end relative z-10 mt-4 md:mt-0">
             <button class="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0a0c10] border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all group/btn" title="Adjust Limits">
               <Shield class="w-4 h-4 text-white/60 group-hover/btn:text-white" />
             </button>
             <button class="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0a0c10] border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all group/btn" title="Share PNL">
               <Share2 class="w-4 h-4 text-white/60 group-hover/btn:text-white" />
             </button>
             <button 
                @click="closePosition(pos.id)"
                class="px-5 py-2.5 rounded-xl border border-[#f6465d]/20 bg-[#f6465d]/10 hover:bg-[#f6465d] hover:text-white text-[#f6465d] text-xs font-black tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(246,70,93,0)] hover:shadow-[0_0_20px_rgba(246,70,93,0.4)] flex items-center gap-2">
               Close <X class="w-4 h-4" />
             </button>
          </div>

        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
