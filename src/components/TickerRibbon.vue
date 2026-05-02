<script setup lang="ts">
import { ChevronDown, ArrowUp, ArrowDown } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { currentPrice, previousPrice } from '../store/tradeStore';

interface TickerItem {
  pair: string;
  price: string;
  isUp: boolean;
  active?: boolean;
}

const tickers = computed<TickerItem[]>(() => [
  { pair: 'BTC/USDT', price: `${currentPrice.value.toFixed(2)}`, isUp: currentPrice.value >= previousPrice.value, active: true },
  { pair: 'ETH/USDT', price: '3077.93', isUp: true, active: false },
  { pair: 'SOL/USDT', price: '145.22', isUp: false, active: false },
  { pair: 'BNB/USDT', price: '580.44', isUp: true, active: false },
  { pair: 'ADA/USDT', price: '0.45', isUp: false, active: false },
  { pair: 'XRP/USDT', price: '0.62', isUp: true, active: false },
]);
</script>

<template>
  <div class="flex px-1 py-1 gap-2 overflow-x-auto no-scrollbar shrink-0">
    <button
      v-for="t in tickers"
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
