<script setup lang="ts">
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-vue-next';
import { useWatchlist } from '../composables/useWatchlist';

const { watchlist } = useWatchlist();
</script>

<template>
  <div class="px-2 mt-4">
    <div class="flex items-center justify-between px-2 mb-2">
      <span class="text-[10px] font-bold text-[#848e9c] uppercase tracking-wider">Watchlist</span>
      <ChevronRight class="w-3 h-3 text-[#848e9c] cursor-pointer hover:text-white" />
    </div>
    
    <div class="flex flex-col gap-1">
      <div 
        v-for="item in watchlist" 
        :key="item.pair"
        class="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#2b3139]/30 cursor-pointer transition-colors group"
      >
        <div class="flex flex-col">
          <span class="text-xs font-bold text-[#EAECEF]">{{ item.pair.split('/')[0] }}</span>
          <span class="text-[10px] text-[#848e9c]">{{ item.pair.split('/')[1] }}</span>
        </div>
        
        <div class="text-right">
          <div class="text-xs font-mono text-[#EAECEF]">
            {{ item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </div>
          <div 
            class="text-[10px] flex items-center justify-end gap-0.5"
            :class="item.change >= 0 ? 'text-[#0ECB81]' : 'text-[#f6465d]'"
          >
            <TrendingUp v-if="item.change >= 0" class="w-2.5 h-2.5" />
            <TrendingDown v-else class="w-2.5 h-2.5" />
            {{ item.change >= 0 ? '+' : '' }}{{ item.change.toFixed(2) }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
