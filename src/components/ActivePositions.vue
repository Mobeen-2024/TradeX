<script setup lang="ts">
import { ref, computed } from 'vue';
import { activePositions, closePosition } from '../store/tradeStore';
import { cn } from '../lib/utils';
import { 
  TrendingUp, TrendingDown, Info, ShieldAlert, Settings2, 
  Share2, Activity, CheckCircle2, AlertCircle, X, Shield, Clock, Zap, Maximize
} from 'lucide-vue-next';

// State management for individual positions
const actionStates = ref<Record<string, 'idle' | 'closing' | 'success' | 'error'>>({});

// PnL Calculation
const calculatePnlUsdt = (pos: any) => {
  const mark = pos.mark || pos.entryPrice || pos.entry || 0;
  const entry = pos.entryPrice || pos.entry || 0;
  if (!mark || !entry || !pos.size) return 0;
  return pos.type === 'LONG' 
    ? (mark - entry) * pos.size 
    : (entry - mark) * pos.size;
};

const calculatePnlPercent = (pos: any) => {
  const pnlUsdt = calculatePnlUsdt(pos);
  const leverageNum = parseFloat(pos.leverage) || 1;
  const entry = pos.entryPrice || pos.entry || 0;
  const initialMargin = (entry * pos.size) / leverageNum;
  if (initialMargin === 0) return 0;
  return (pnlUsdt / initialMargin) * 100;
};

const formatCurrency = (val: number) => {
  return Math.abs(val).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
};

const getPnlColorClass = (val: number) => {
  return val >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]';
};

// Handlers
const handleClose = (id: string) => {
  if (actionStates.value[id] && actionStates.value[id] !== 'idle') return;
  actionStates.value[id] = 'closing';
  setTimeout(async () => {
    // 90% chance of success to simulate real network conditions
    const success = Math.random() > 0.1; 
    if (success) {
      actionStates.value[id] = 'success';
      setTimeout(() => {
        closePosition(id);
        delete actionStates.value[id];
      }, 1000);
    } else {
      actionStates.value[id] = 'error';
      setTimeout(() => {
        actionStates.value[id] = 'idle';
      }, 3000);
    }
  }, 1200);
};

</script>

<template>
  <div class="flex flex-col gap-6 mt-4 w-full">
    
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight flex items-center gap-3">
        <Activity class="w-6 h-6 text-[#627EEA]" />
        Your Active Positions
        <span class="text-[11px] px-2.5 py-1 bg-white/10 text-white rounded-full font-mono ml-2 shadow-inner">
          {{ activePositions.length }}
        </span>
      </h3>
      
      <div v-if="activePositions.length > 0" class="flex gap-2">
        <button class="text-xs font-bold text-white/50 hover:text-white px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 transition-all">
          Close All
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="activePositions.length === 0" class="w-full bg-[#0a0c10]/50 backdrop-blur-xl border border-white/5 rounded-[32px] p-12 flex flex-col items-center justify-center relative overflow-hidden group">
      <div class="absolute inset-0 bg-gradient-to-b from-[#627EEA]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
      <div class="w-24 h-24 relative mb-6">
        <div class="absolute inset-0 border border-white/10 rounded-full animate-[ping_3s_ease-out_infinite]"></div>
        <div class="w-full h-full rounded-full bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-md">
          <Shield class="w-8 h-8 text-white/20" />
        </div>
      </div>
      <h4 class="text-white font-black text-lg tracking-widest uppercase mb-2">No Active Exposure</h4>
      <p class="text-white/40 text-sm max-w-sm text-center tracking-wide font-medium leading-relaxed">
        Your portfolio is completely hedged or in cash. Explore markets to deploy capital or wait for AI signals.
      </p>
    </div>

    <!-- Grid Layout for Real Positions -->
    <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-5 relative z-10 w-full">
      <transition-group name="pos-list" tag="div" class="contents">
        <div v-for="pos in activePositions" :key="pos.id" 
             class="group relative bg-[#0b0e11]/80 backdrop-blur-2xl border border-white/5 hover:border-white/[0.15] rounded-[28px] p-6 transition-all duration-500 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
          
          <!-- Liquid Background PNL Glow -->
          <div :class="cn('absolute -right-20 -top-20 w-64 h-64 opacity-0 group-hover:opacity-10 blur-[100px] rounded-full transition-all duration-1000', calculatePnlPercent(pos) >= 0 ? 'bg-[#0ecb81]' : 'bg-[#f6465d]')"></div>

          <!-- Processing State Overlay -->
          <div v-if="actionStates[pos.id] && actionStates[pos.id] !== 'idle'" 
               class="absolute inset-0 z-50 backdrop-blur-md flex flex-col items-center justify-center rounded-[28px]"
               :class="cn(
                 actionStates[pos.id] === 'closing' ? 'bg-[#0b0e11]/80' : 
                 actionStates[pos.id] === 'success' ? 'bg-[#0ecb81]/10' : 'bg-[#f6465d]/10'
               )">
            <div v-if="actionStates[pos.id] === 'closing'" class="flex flex-col items-center gap-3">
              <Activity class="w-8 h-8 text-[#f6465d] animate-pulse" />
              <span class="text-xs font-bold uppercase tracking-widest text-[#f6465d] animate-pulse">Liquidating Position...</span>
            </div>
            <div v-else-if="actionStates[pos.id] === 'success'" class="flex flex-col items-center gap-3">
              <CheckCircle2 class="w-10 h-10 text-[#0ecb81] drop-shadow-[0_0_15px_rgba(14,203,129,0.5)]" />
              <span class="text-xs font-bold uppercase tracking-widest text-[#0ecb81]">Position Closed</span>
            </div>
            <div v-else class="flex flex-col items-center gap-3">
              <AlertCircle class="w-8 h-8 text-[#f6465d]" />
              <span class="text-xs font-bold uppercase tracking-widest text-[#f6465d]">Execution Failed</span>
            </div>
          </div>

          <!-- Section: Top (Ident & Leverage) -->
          <div class="flex items-start justify-between relative z-10 mb-6 border-b border-white/5 pb-5">
            <div class="flex items-center gap-4">
              <div :class="cn('w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner group-hover:scale-105 transition-transform duration-500', pos.type === 'LONG' ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20' : 'bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20')">
                <TrendingUp v-if="pos.type === 'LONG'" class="w-6 h-6" />
                <TrendingDown v-else class="w-6 h-6" />
              </div>
              <div class="flex flex-col">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-black text-xl text-white tracking-wide">{{ pos.pair || pos.symbol }}</span>
                  <span :class="cn('text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider', pos.type === 'LONG' ? 'bg-[#0ecb81]/20 text-[#0ecb81]' : 'bg-[#f6465d]/20 text-[#f6465d]')">
                    {{ pos.leverage }} {{ pos.type }}
                  </span>
                </div>
                <div class="text-[10px] text-white/50 font-mono tracking-wider flex items-center gap-2">
                   <span>ID: {{ pos.id.slice(0, 8) }}</span>
                   <span class="w-1 h-1 rounded-full bg-white/20"></span>
                   <span>Size: <strong class="text-white">{{ (pos.size || 0).toFixed(4) }}</strong></span>
                </div>
              </div>
            </div>

            <!-- Warning Icon if risk is high -->
            <div v-if="calculatePnlPercent(pos) < -50" class="flex items-center gap-2 bg-[#f6465d]/10 px-3 py-1.5 rounded-lg border border-[#f6465d]/20">
                <ShieldAlert class="w-4 h-4 text-[#f6465d] animate-pulse" />
                <span class="text-[10px] text-[#f6465d] uppercase font-bold tracking-widest hidden sm:block">Liq. Risk</span>
            </div>
          </div>

          <!-- Section: Middle (Pricing & PNL) -->
          <div class="flex flex-col sm:flex-row gap-6 relative z-10 w-full mb-6">
            
            <!-- Pricing Column -->
            <div class="flex-1 flex flex-col gap-4">
              <div class="flex justify-between items-end">
                <span class="text-[10px] text-white/40 uppercase tracking-widest font-bold">Entry Price</span>
                <span class="text-base font-mono text-white/90">${{ (pos.entry || pos.entryPrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) }}</span>
              </div>
              <div class="flex justify-between items-end">
                <span class="text-[10px] text-white/40 uppercase tracking-widest font-bold">Mark Price</span>
                <span class="text-base font-mono text-white">${{ (pos.mark || pos.entry || pos.entryPrice).toLocaleString(undefined, {minimumFractionDigits: 2}) }}</span>
              </div>
            </div>

            <!-- Divider -->
            <div class="hidden sm:block w-[1px] bg-white/5 self-stretch"></div>
            
            <!-- PNL Column -->
            <div class="flex-1 flex flex-col justify-center items-start sm:items-end bg-black/20 sm:bg-transparent rounded-xl p-4 sm:p-0 border border-white/5 sm:border-transparent">
              <span class="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 font-bold flex items-center gap-1">Unrealized PNL <Info class="w-3 h-3 text-white/20" /></span>
              
              <div :class="cn('text-2xl font-mono font-black tracking-tight drop-shadow-md flex items-center gap-1', getPnlColorClass(calculatePnlUsdt(pos)))">
                <span v-if="calculatePnlUsdt(pos) > 0">+</span><span v-else-if="calculatePnlUsdt(pos) < 0">-</span>${{ formatCurrency(calculatePnlUsdt(pos)) }}
              </div>
              
              <div :class="cn('text-[11px] font-mono font-bold mt-1 px-2 py-0.5 rounded-md border', 
                calculatePnlPercent(pos) >= 0 ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20' : 'bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20')">
                {{ calculatePnlPercent(pos) > 0 ? '+' : '' }}{{ calculatePnlPercent(pos).toFixed(2) }}% ROE
              </div>
            </div>

          </div>

          <!-- Section: Bottom (Actions) -->
          <div class="flex items-center justify-between relative z-10 pt-4 border-t border-white/5">
            <div class="flex items-center gap-2">
              <button class="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/60 hover:text-white group/btn tooltip" data-tip="TP/SL Settings">
                <Settings2 class="w-4 h-4" />
              </button>
              <button class="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/60 hover:text-white group/btn tooltip" data-tip="Share Image">
                <Share2 class="w-4 h-4" />
              </button>
            </div>
            
            <button @click="handleClose(pos.id)" class="px-6 py-2.5 rounded-xl border border-[#f6465d]/20 bg-[#f6465d]/10 hover:bg-[#f6465d] hover:text-white text-[#f6465d] text-[11px] font-black tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(246,70,93,0)] hover:shadow-[0_0_20px_rgba(246,70,93,0.3)] flex items-center gap-2 group/close">
              Close Position <X class="w-4 h-4 group-hover/close:rotate-90 transition-transform duration-300" />
            </button>
          </div>

        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.pos-list-enter-active,
.pos-list-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.pos-list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}
.pos-list-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
