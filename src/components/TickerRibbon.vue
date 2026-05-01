<script setup lang="ts">
import { ChevronDown, ArrowUp, ArrowDown } from 'lucide-vue-next';
import { cn } from '../lib/utils';

interface TickerItem {
  pair: string;
  price: string;
  isUp: boolean;
  active?: boolean;
}

const mockTickers: TickerItem[] = [
  { pair: '1 BTC', price: '63719.90 USD', isUp: true, active: false },
  { pair: '1 ETH', price: '3077.93 USD', isUp: true, active: true },
  { pair: '1 LTC', price: '80.44 USD', isUp: false, active: false },
  { pair: '1 DASH', price: '28.84 USD', isUp: false, active: false },
  { pair: '1 NEO', price: '16.18 USD', isUp: true, active: false },
  { pair: '1 XMR', price: '129.72 USD', isUp: true, active: false },
];
</script>

<template>
  <div class="flex px-1 py-1 gap-2 overflow-x-auto no-scrollbar shrink-0">
    <button
      v-for="t in mockTickers"
      :key="t.pair"
      :class="cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg border whitespace-nowrap transition-colors',
        t.active 
          ? 'bg-dash-card border-dash-border text-white' 
          : 'border-transparent bg-dash-bg hover:bg-dash-card text-dash-text-muted'
      )"
    >
      <ArrowUp v-if="t.isUp" class="w-3 h-3 text-dash-primary" />
      <ArrowDown v-else class="w-3 h-3 text-dash-text-muted" />
      <span class="font-medium text-xs">{{ t.pair }}</span>
      <span class="text-xs ml-1">{{ t.price }}</span>
    </button>
  </div>
</template>
