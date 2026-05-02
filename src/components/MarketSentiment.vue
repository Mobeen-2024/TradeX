<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Flame, Info, Users, TrendingUp, Compass, Ghost } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const fearGreed = ref(64); // "Greed"
const longRatio = ref(52.4); // 52.4% Longs
const liquidations = ref('142M');

onMounted(() => {
    // Simulate some movement
    setInterval(() => {
        longRatio.value = parseFloat((50 + Math.random() * 5).toFixed(1));
    }, 5000);
});
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Fear & Greed Index -->
    <div class="bg-[#161a1e] border border-[#2b3139] p-5 rounded-2xl flex flex-col relative overflow-hidden group">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
            <Ghost class="w-4 h-4 text-[#F0B90B]" />
            <h3 class="text-[#848e9c] text-[11px] font-bold uppercase tracking-wider">Fear & Greed Index</h3>
        </div>
        <Info class="w-3 h-3 text-[#474d57] hover:text-white cursor-help" />
      </div>
      
      <div class="flex flex-col items-center justify-center py-2">
        <div class="relative w-32 h-16 overflow-hidden">
            <!-- Semi-circle track -->
            <div class="absolute inset-0 border-[10px] border-[#2b3139] rounded-t-full"></div>
            <!-- Progress -->
            <div 
              class="absolute inset-0 border-[10px] border-[#F0B90B] rounded-t-full transition-all duration-1000 ease-out origin-bottom"
              :style="{ transform: `rotate(${(fearGreed / 100) * 180}deg)` }"
            ></div>
            <div class="absolute inset-0 bg-[#161a1e] scale-x-110 translate-y-1/2"></div>
        </div>
        <div class="text-2xl font-bold text-[#F0B90B] mt-2">{{ fearGreed }}</div>
        <div class="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Greed</div>
      </div>
    </div>

    <!-- Long/Short Ratio -->
    <div class="bg-[#161a1e] border border-[#2b3139] p-5 rounded-2xl flex flex-col relative overflow-hidden group">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <Users class="w-4 h-4 text-[#0ecb81]" />
                <h3 class="text-[#848e9c] text-[11px] font-bold uppercase tracking-wider">Long/Short Ratio (24h)</h3>
            </div>
        </div>
        
        <div class="flex flex-col gap-3 justify-center h-full">
            <div class="flex justify-between text-[10px] font-mono font-bold uppercase">
                <span class="text-[#0ecb81]">Long {{ longRatio }}%</span>
                <span class="text-[#f6465d]">Short {{ (100 - longRatio).toFixed(1) }}%</span>
            </div>
            <div class="h-3 w-full bg-[#2b3139] rounded-full overflow-hidden flex">
                <div class="h-full bg-[#0ecb81] transition-all duration-1000 ease-out" :style="`width: ${longRatio}%`"></div>
                <div class="h-full bg-[#f6465d] transition-all duration-1000 ease-out" :style="`width: ${100 - longRatio}%`"></div>
            </div>
            <div class="flex justify-between text-[9px] text-[#474d57] font-medium">
                <span>Retail Sentiment: BULLISH</span>
                <span>Institution: NEUTRAL</span>
            </div>
        </div>
    </div>

    <!-- Hot Topics / Liquidations -->
    <div class="bg-[#161a1e] border border-[#2b3139] p-5 rounded-2xl flex flex-col relative overflow-hidden group">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <Flame class="w-4 h-4 text-[#f6465d]" />
                <h3 class="text-[#848e9c] text-[11px] font-bold uppercase tracking-wider">Market Heat</h3>
            </div>
        </div>
        
        <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
                <span class="text-xs text-[#EAECEF]">Total Liquidations</span>
                <span class="text-xs font-mono font-bold text-[#f6465d]">${{ liquidations }}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-xs text-[#EAECEF]">Funding Rate</span>
                <span class="text-xs font-mono font-bold text-[#0ecb81]">0.0100%</span>
            </div>
            <div class="flex gap-2 mt-1">
                <span class="px-2 py-0.5 rounded bg-[#F0B90B]/10 text-[#F0B90B] text-[9px] font-bold">#VOLATILITY</span>
                <span class="px-2 py-0.5 rounded bg-[#627eea]/10 text-[#627eea] text-[9px] font-bold">#ETH_MERGE</span>
                <span class="px-2 py-0.5 rounded bg-[#0ecb81]/10 text-[#0ecb81] text-[9px] font-bold">#FOMO</span>
            </div>
        </div>
    </div>
  </div>
</template>
