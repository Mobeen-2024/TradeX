<template>
  <div class="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-white/5 bg-[#161a1e] shrink-0">
    <div class="flex items-center gap-1.5">
      <div 
        class="w-1.5 h-1.5 rounded-full" 
        :class="isConnected ? 'bg-[#0ecb81] shadow-[0_0_8px_#0ecb81]' : 'bg-[#f6465d] shadow-[0_0_8px_#f6465d]'"
      ></div>
      <span class="text-[10px] font-bold text-[#848e9c] uppercase tracking-wider">
        WS
      </span>
    </div>

    <div class="h-4 w-px bg-white/10"></div>

    <div class="flex items-center gap-2">
      <span class="text-[11px] font-bold text-white tabular-nums">
        ${{ formattedPrice }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { currentPrice } from '../store/tradeStore';
import { wsManager } from '../lib/wsManager';

const isConnected = wsManager.isConnected;

const formattedPrice = computed(() => {
  return Number(currentPrice.value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
});
</script>
