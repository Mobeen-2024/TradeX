<script setup lang="ts">
import { ChevronDown, Settings, PlayCircle, ArrowUp, ArrowDown, Search, Download, Bell, User, Globe } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { currentPrice, previousPrice, marketData, isLiveMode } from '../store/tradeStore';

defineProps<{ title?: string }>();
const emit = defineEmits(['open-settings']);
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
          <div :class="cn('px-1.5 py-0.5 rounded text-[10px] font-bold ml-1 tracking-tighter uppercase', isLiveMode ? 'bg-[#0ecb81]/10 text-[#0ecb81] border border-[#0ecb81]/20' : 'bg-[#F0B90B]/10 text-[#F0B90B] border border-[#F0B90B]/20')">
            {{ isLiveMode ? 'Live' : 'Demo' }}
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

    <!-- Right Section -->
    <div class="flex items-center gap-2 lg:gap-4 ml-auto">
      <div class="hidden sm:flex items-center gap-1 hover:bg-[#2b3139] px-2 py-1 rounded cursor-pointer transition-colors">
        <Search class="w-4 h-4" />
      </div>
      <div class="hidden sm:flex items-center gap-1 hover:bg-[#2b3139] px-2 py-1 rounded cursor-pointer transition-colors">
        <Download class="w-4 h-4" />
      </div>
      <div class="flex items-center gap-1 hover:bg-[#2b3139] px-2 py-1 rounded cursor-pointer transition-colors relative">
        <Bell class="w-4 h-4" />
        <div class="absolute top-1 right-1 w-2 h-2 bg-[#f6465d] rounded-full border border-[#161a1e]"></div>
      </div>
      <div 
        @click="emit('open-settings')"
        class="hidden md:flex items-center gap-1 hover:bg-[#2b3139] px-2 py-1 rounded cursor-pointer transition-colors"
      >
        <Settings class="w-4 h-4" />
      </div>
      <div class="hidden lg:flex items-center gap-1 hover:bg-[#2b3139] px-2 py-1 rounded cursor-pointer transition-colors">
        <Globe class="w-4 h-4" />
      </div>
      
      <div class="h-6 w-[1px] bg-dash-border mx-1"></div>
      
      <div class="flex items-center gap-3 ml-1">
        <button class="text-xs font-medium text-[#EAECEF] hover:text-[#F0B90B] transition-colors">Log In</button>
        <button class="text-xs font-medium bg-[#F0B90B] text-[#161a1e] px-3 py-1 rounded hover:bg-[#FCD535] transition-colors">Register</button>
      </div>
      
      <div class="flex items-center justify-center w-8 h-8 rounded-full bg-[#2b3139] hover:bg-[#323a43] cursor-pointer ml-1">
        <User class="w-4 h-4 text-[#EAECEF]" />
      </div>
    </div>

  </header>
</template>
