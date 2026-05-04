<script setup lang="ts">
import { circuitBreakers } from '../store/systemStore';
import { ShieldAlert, ShieldCheck, ShieldClose } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const getBreakerColor = (state: string) => {
  switch (state) {
    case 'CLOSED': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    case 'OPEN': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    case 'HALF_OPEN': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
  }
};
</script>

<template>
  <div class="flex items-center gap-3 px-3 py-1.5 bg-black/40 backdrop-blur-xl border border-white/5 rounded-full shadow-2xl">
    <div v-for="cb in circuitBreakers" :key="cb.name" class="flex items-center gap-1.5 group relative">
      <div :class="cn('px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter transition-all duration-500', getBreakerColor(cb.state))">
        {{ cb.name.split('_')[1] || cb.name }}
      </div>
      
      <!-- Tooltip -->
      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 border border-white/10 rounded text-[9px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {{ cb.name }}: {{ cb.state }}
      </div>
    </div>

    <!-- Overall Safety Icon -->
    <div class="w-4 h-4 ml-1 flex items-center justify-center">
      <ShieldCheck v-if="circuitBreakers.every(b => b.state === 'CLOSED')" class="w-3.5 h-3.5 text-emerald-500" />
      <ShieldAlert v-else-if="circuitBreakers.some(b => b.state === 'OPEN')" class="w-3.5 h-3.5 text-rose-500 animate-pulse" />
      <ShieldAlert v-else class="w-3.5 h-3.5 text-amber-500" />
    </div>
  </div>
</template>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
