<script setup lang="ts">
import { Signal, TrendingUp, TrendingDown, Clock, Target, ShieldCheck, Zap } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const signals = [
  { id: 1, pair: 'BTC/USDT', type: 'LONG', price: '75,200', target: '78,500', sl: '73,800', confidence: 92, time: '12m ago' },
  { id: 2, pair: 'ETH/USDT', type: 'LONG', price: '3,050', target: '3,250', sl: '2,980', confidence: 85, time: '45m ago' },
  { id: 3, pair: 'SOL/USDT', type: 'SHORT', price: '148', target: '132', sl: '154', confidence: 78, time: '1h ago' },
  { id: 4, pair: 'BNB/USDT', type: 'LONG', price: '585', target: '620', sl: '570', confidence: 88, time: '2h ago' },
];
</script>

<template>
  <div class="flex flex-col gap-6 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-black text-white tracking-tight">Trading Signals</h2>
        <p class="text-xs text-[#848e9c] font-medium uppercase tracking-[0.2em] mt-1 opacity-60">AI-powered market entry & exit points</p>
      </div>
      <div class="flex items-center gap-2 px-3 py-1.5 bg-[#0ecb81]/10 rounded-lg border border-[#0ecb81]/20">
        <ShieldCheck class="w-4 h-4 text-[#0ecb81]" />
        <span class="text-[10px] font-black text-[#0ecb81] uppercase">AI Verified</span>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div v-for="s in signals" :key="s.id" class="bg-[#161a1e]/50 backdrop-blur-2xl border border-white/5 p-5 rounded-[24px] hover:border-[#F0B90B]/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
        <!-- Glow background for high confidence -->
        <div v-if="s.confidence > 90" class="absolute -right-10 -top-10 w-32 h-32 bg-[#F0B90B]/5 blur-3xl rounded-full"></div>
        
        <div class="flex justify-between items-start mb-6">
          <div class="flex items-center gap-3">
            <div :class="cn('w-10 h-10 rounded-xl flex items-center justify-center border transition-colors', s.type === 'LONG' ? 'bg-[#0ecb81]/10 border-[#0ecb81]/20 text-[#0ecb81]' : 'bg-[#f6465d]/10 border-[#f6465d]/20 text-[#f6465d]')">
              <TrendingUp v-if="s.type === 'LONG'" class="w-5 h-5" />
              <TrendingDown v-else class="w-5 h-5" />
            </div>
            <div>
              <div class="font-black text-white text-lg tracking-tight">{{ s.pair }}</div>
              <div :class="cn('text-[10px] font-bold uppercase tracking-widest', s.type === 'LONG' ? 'text-[#0ecb81]' : 'text-[#f6465d]')">{{ s.type }} SIGNAL</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-[#848e9c] font-bold uppercase mb-1 flex items-center justify-end gap-1"><Clock class="w-3 h-3" /> {{ s.time }}</div>
            <div class="flex items-center gap-2">
              <div class="w-24 h-1.5 bg-[#2b3139] rounded-full overflow-hidden">
                <div class="h-full bg-[#F0B90B] rounded-full" :style="`width: ${s.confidence}%`"></div>
              </div>
              <span class="text-[10px] font-black text-[#F0B90B]">{{ s.confidence }}%</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-[#0b0e11]/50 p-3 rounded-xl border border-white/5">
            <div class="text-[9px] text-[#848e9c] font-bold uppercase mb-1">Entry Price</div>
            <div class="text-sm font-mono font-bold text-white">{{ s.price }}</div>
          </div>
          <div class="bg-[#0b0e11]/50 p-3 rounded-xl border border-white/5">
            <div class="text-[9px] text-[#848e9c] font-bold uppercase mb-1 flex items-center gap-1"><Target class="w-2.5 h-2.5 text-[#0ecb81]" /> Target</div>
            <div class="text-sm font-mono font-bold text-[#0ecb81]">{{ s.target }}</div>
          </div>
          <div class="bg-[#0b0e11]/50 p-3 rounded-xl border border-white/5">
            <div class="text-[9px] text-[#848e9c] font-bold uppercase mb-1 flex items-center gap-1"><Zap class="w-2.5 h-2.5 text-[#f6465d]" /> Stop Loss</div>
            <div class="text-sm font-mono font-bold text-[#f6465d]">{{ s.sl }}</div>
          </div>
        </div>

        <button :class="cn('w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98]', s.type === 'LONG' ? 'bg-[#0ecb81] text-[#0b0e11] hover:bg-[#12e391]' : 'bg-[#f6465d] text-white hover:bg-[#ff5266]')">
          Execute {{ s.type }} Position
        </button>
      </div>
    </div>
  </div>
</template>
