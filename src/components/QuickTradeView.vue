<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
    currentPrice, 
    previousPrice, 
    availableUsdt, 
    availableBtc, 
    quickTradePreferences,
    quickTradeMode
} from '../store/tradeStore';
import { useOrderExecution } from '../composables/useOrderExecution';
import MiniChartWidget from './MiniChartWidget.vue';
import SwipeButton from './SwipeButton.vue';
import { X, Zap, ShieldCheck, TrendingUp, TrendingDown, Wallet, Target } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const { isPending, executeTrade } = useOrderExecution();

const riskAmount = computed(() => quickTradePreferences.value.defaultRisk);
const leverage = computed(() => quickTradePreferences.value.defaultLeverage);

const handleTrade = async (side: 'Buy' | 'Sell') => {
    const amount = riskAmount.value / currentPrice.value;
    
    await executeTrade({
        side,
        type: 'MARKET',
        amount: parseFloat(amount.toFixed(4)),
        price: currentPrice.value,
        leverage: leverage.value,
        marginEnabled: true
    });
};

</script>

<template>
  <div class="fixed inset-0 z-[200] bg-[#0b0e11] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
    <!-- Header -->
    <div class="px-6 pt-12 pb-4 flex items-center justify-between border-b border-white/5">
        <div class="flex items-center gap-3">
            <div class="p-2 bg-[#F0B90B]/10 rounded-xl">
                <Zap class="w-6 h-6 text-[#F0B90B]" />
            </div>
            <div>
                <h2 class="text-xl font-bold text-white tracking-tight">Quick Trade</h2>
                <div class="flex items-center gap-2 text-[#848e9c] text-xs">
                    <span class="flex items-center gap-1"><ShieldCheck class="w-3 h-3 text-[#0ecb81]" /> Isolated {{ leverage }}x</span>
                </div>
            </div>
        </div>
        <button 
            @click="quickTradeMode = false"
            class="p-2 bg-white/5 rounded-full text-[#848e9c] hover:text-white"
        >
            <X class="w-6 h-6" />
        </button>
    </div>

    <!-- Market Price Section -->
    <div class="px-6 py-8 flex flex-col items-center">
        <div class="text-[#848e9c] text-sm font-medium mb-1">BTC / USDT</div>
        <div :class="cn('text-5xl font-black tracking-tighter transition-colors duration-300', currentPrice >= previousPrice ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
            {{ currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
        </div>
    </div>

    <!-- Mini Chart -->
    <div class="flex-1 min-h-[120px] relative px-4">
        <MiniChartWidget symbol="BTCUSDT" />
    </div>

    <!-- Risk Summary Card -->
    <div class="px-6 py-4">
        <div class="bg-[#1e2329] rounded-3xl p-5 border border-white/5 shadow-2xl">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2 text-[#848e9c]">
                    <Wallet class="w-4 h-4" />
                    <span class="text-xs font-bold uppercase tracking-widest">Available</span>
                </div>
                <div class="text-white font-mono text-sm">${{ availableUsdt.toLocaleString() }}</div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-[#0b0e11] rounded-2xl p-4 flex flex-col gap-1">
                    <div class="flex items-center gap-1.5 text-[#848e9c] text-[10px] font-black uppercase tracking-widest">
                        <Target class="w-3 h-3" /> Risk / Trade
                    </div>
                    <div class="text-[#F0B90B] font-bold">${{ riskAmount }}</div>
                </div>
                <div class="bg-[#0b0e11] rounded-2xl p-4 flex flex-col gap-1">
                    <div class="flex items-center gap-1.5 text-[#848e9c] text-[10px] font-black uppercase tracking-widest">
                        <Activity class="w-3 h-3" /> Size (BTC)
                    </div>
                    <div class="text-white font-bold">{{ (riskAmount / currentPrice).toFixed(4) }}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Action Section -->
    <div class="px-6 pt-4 pb-12 flex flex-col gap-4">
        <SwipeButton 
            text="Swipe to BUY Market"
            active-color="#0ecb81"
            :disabled="isPending"
            @confirmed="handleTrade('Buy')"
        />
        <SwipeButton 
            text="Swipe to SELL Market"
            active-color="#f6465d"
            :disabled="isPending"
            @confirmed="handleTrade('Sell')"
        />
    </div>

    <!-- Quick Preferences Footer -->
    <div class="px-6 py-4 bg-[#161a1e] flex items-center justify-center gap-8 text-[10px] font-bold text-[#474d57] uppercase tracking-widest">
        <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-[#0ecb81]"></div>
            Real-time Feed
        </div>
        <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-[#F0B90B]"></div>
            Zero Latency
        </div>
    </div>
  </div>
</template>
