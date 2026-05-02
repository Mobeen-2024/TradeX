<script setup lang="ts">
import { ChevronDown, Settings, PlayCircle, ArrowUp, ArrowDown } from 'lucide-vue-next';
import { currentPrice, previousPrice, marketData } from '../store/tradeStore';

defineProps<{ title?: string }>();
</script>

<template>
  <header class="h-[60px] border-b border-dash-border flex items-center justify-between pl-4 pr-4 shrink-0 z-10 bg-[#161a1e] text-[#848e9c]">
    <!-- Left Section -->
    <div class="flex items-center h-full overflow-hidden">
      <!-- Removed Logo per user request -->


      <!-- Pair info -->
      <div class="flex items-center gap-4 lg:gap-6 h-full font-sans whitespace-nowrap">
        <div class="flex items-center gap-1 cursor-pointer hover:bg-[#2b3139] px-2 py-1 rounded transition-colors group">
          <h1 class="text-lg lg:text-xl font-bold text-[#EAECEF] flex items-center gap-1">BTC/USDT</h1>
          <ChevronDown class="w-4 h-4 text-[#848e9c] group-hover:text-white" />
          <div class="text-[#F0B90B] bg-[#F0B90B]/10 px-1 py-0.5 rounded text-[10px] font-medium ml-1">
            <a href="#" class="no-underline hover:underline">Bitcoin</a>
          </div>
        </div>

        <div class="flex flex-col justify-center">
          <div :class="[currentPrice >= previousPrice ? 'text-[#0ECB81]' : 'text-[#f6465d]', 'text-base font-semibold leading-tight flex items-center gap-1 transition-colors duration-300']">
            {{ currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            <ArrowUp v-if="currentPrice >= previousPrice" class="w-3 h-3" />
            <ArrowDown v-else class="w-3 h-3" />
          </div>
          <div class="text-xs text-[#EAECEF] hover:underline cursor-pointer transition-colors duration-300">
            ${{ currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </div>
        </div>

        <div class="hidden sm:flex flex-col justify-center">
          <div class="text-[11px] text-[#848e9c] mb-[1px]">24h Change</div>
          <div :class="[marketData.change24h.startsWith('+') ? 'text-[#0ECB81]' : 'text-[#f6465d]', 'text-[12px] font-medium']">
            {{ marketData.change24h }}
          </div>
        </div>

        <div class="hidden md:flex flex-col justify-center">
          <div class="text-[11px] text-[#848e9c] mb-[1px]">24h High</div>
          <div class="text-[12px] text-[#EAECEF] font-medium">{{ marketData.high24h }}</div>
        </div>

        <div class="hidden lg:flex flex-col justify-center">
          <div class="text-[11px] text-[#848e9c] mb-[1px]">24h Low</div>
          <div class="text-[12px] text-[#EAECEF] font-medium">{{ marketData.low24h }}</div>
        </div>

        <div class="hidden xl:flex flex-col justify-center">
          <div class="text-[11px] text-[#848e9c] mb-[1px]">24h Vol(BTC)</div>
          <div class="text-[12px] text-[#EAECEF] font-medium">{{ marketData.volBtc24h }}</div>
        </div>

        <div class="hidden xl:flex flex-col justify-center">
          <div class="text-[11px] text-[#848e9c] mb-[1px]">24h Vol(USDT)</div>
          <div class="text-[12px] text-[#EAECEF] font-medium">{{ marketData.volUsdt24h }}</div>
        </div>
      </div>
    </div>

  </header>
</template>
