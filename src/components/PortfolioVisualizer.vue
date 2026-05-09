<script setup lang="ts">
import { computed } from 'vue';
import { currentPrice } from '../store/tradeStore';
import { balances, totalUsdtBalance } from '../store/accountStore';
import { TrendingUp, TrendingDown, Wallet, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const btcBalance = computed(() => balances.value.find(b => b.asset === 'BTC')?.free || 0);
const ethBalance = computed(() => balances.value.find(b => b.asset === 'ETH')?.free || 0);
const usdtBalance = computed(() => balances.value.find(b => b.asset === 'USDT')?.free || 0);

const btcValue = computed(() => btcBalance.value * currentPrice.value);
const ethValue = computed(() => ethBalance.value * 3000); // Fixed price for ETH in demo

const allocation = computed(() => {
    const total = btcValue.value + ethValue.value + usdtBalance.value;
    if (total === 0) return [];
    return [
        { name: 'BTC', value: btcValue.value, percent: (btcValue.value / total) * 100, color: '#f7931a' },
        { name: 'ETH', value: ethValue.value, percent: (ethValue.value / total) * 100, color: '#627eea' },
        { name: 'USDT', value: usdtBalance.value, percent: (usdtBalance.value / total) * 100, color: '#2ebd85' },
    ].sort((a, b) => b.value - a.value);
});

// Simple Donut logic
const getStrokeDasharray = (percent: number) => {
    return `${percent} ${100 - percent}`;
};

const getRotation = (index: number) => {
    let prevSum = 0;
    for (let i = 0; i < index; i++) {
        prevSum += allocation.value[i].percent;
    }
    return `rotate(${prevSum * 3.6}deg)`;
};
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Total Net Worth Card -->
    <div class="bg-[#161a1e] border border-[#2b3139] p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
        <div class="absolute -right-8 -top-8 w-32 h-32 bg-[#F0B90B] opacity-[0.03] blur-3xl rounded-full"></div>
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-[#F0B90B]/10 flex items-center justify-center text-[#F0B90B]">
                    <Wallet class="w-5 h-5" />
                </div>
                <h3 class="text-[#848e9c] text-sm font-bold uppercase tracking-widest">Total Net Worth</h3>
            </div>
            <div class="flex items-center gap-1 text-[#0ecb81] bg-[#0ecb81]/10 px-2 py-1 rounded text-xs font-bold">
                <TrendingUp class="w-3 h-3" />
                +12.5%
            </div>
        </div>
        <div class="mb-6">
            <div class="text-4xl font-mono font-bold text-white mb-1">
                ${{ totalUsdtBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </div>
            <div class="text-xs text-[#848e9c] flex items-center gap-1">
                <span class="text-[#0ecb81]">+$1.50</span> from last 24h
            </div>
        </div>
        <div class="flex gap-2">
            <button class="flex-1 bg-[#F0B90B] hover:bg-[#FCD535] text-[#181a20] py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95">Withdraw</button>
            <button class="flex-1 bg-[#2b3139] hover:bg-[#323a43] text-white py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border border-[#474d57]/30">Deposit</button>
        </div>
    </div>

    <!-- Asset Allocation Card -->
    <div class="bg-[#161a1e] border border-[#2b3139] p-6 rounded-2xl flex flex-col relative overflow-hidden">
        <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-[#627eea]/10 flex items-center justify-center text-[#627eea]">
                <PieChart class="w-5 h-5" />
            </div>
            <h3 class="text-[#848e9c] text-sm font-bold uppercase tracking-widest">Asset Allocation</h3>
        </div>
        <div class="flex items-center gap-8 flex-1">
            <div class="relative w-32 h-32 flex-shrink-0">
                <svg viewBox="0 0 42 42" class="w-full h-full transform -rotate-90">
                    <circle v-for="(asset, i) in allocation" 
                        :key="asset.name"
                        cx="21" cy="21" r="15.91549430918954" 
                        fill="transparent" 
                        :stroke="asset.color" 
                        stroke-width="5" 
                        :stroke-dasharray="getStrokeDasharray(asset.percent)" 
                        :stroke-dashoffset="0"
                        class="transition-all duration-1000 ease-out"
                        :style="{ transform: getRotation(i), transformOrigin: 'center' }"
                    ></circle>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-[10px] text-[#848e9c] uppercase font-bold">Assets</span>
                    <span class="text-xs font-mono font-bold text-white">{{ allocation.length }}</span>
                </div>
            </div>
            <div class="flex flex-col gap-3 flex-1">
                <div v-for="asset in allocation" :key="asset.name" class="flex items-center justify-between group cursor-pointer">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full" :style="`background-color: ${asset.color}`"></div>
                        <span class="text-xs font-bold text-[#EAECEF] group-hover:text-white transition-colors">{{ asset.name }}</span>
                    </div>
                    <span class="text-[11px] font-mono text-[#848e9c]">{{ asset.percent.toFixed(1) }}%</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Growth & PnL Insights -->
    <div class="bg-[#161a1e] border border-[#2b3139] p-6 rounded-2xl flex flex-col relative overflow-hidden group">
        <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-[#0ecb81]/10 flex items-center justify-center text-[#0ecb81]">
                <Activity class="w-5 h-5" />
            </div>
            <h3 class="text-[#848e9c] text-sm font-bold uppercase tracking-widest">Growth Insights</h3>
        </div>
        <div class="flex-1 flex flex-col gap-4">
            <div class="p-3 bg-[#0b0e11]/50 rounded-xl border border-[#2b3139] flex items-center justify-between hover:border-[#0ecb81]/30 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-[#0ecb81]/10 flex items-center justify-center text-[#0ecb81]">
                        <ArrowUpRight class="w-4 h-4" />
                    </div>
                    <div>
                        <div class="text-[10px] text-[#848e9c] font-bold uppercase">7D Growth</div>
                        <div class="text-sm font-mono font-bold text-[#0ecb81]">+$21.90</div>
                    </div>
                </div>
                <div class="w-16 h-8 flex items-end gap-[1px]">
                    <div v-for="i in 6" :key="i" class="flex-1 bg-[#0ecb81]/20 rounded-t-sm" :style="`height: ${20 + Math.random() * 80}%`"></div>
                    <div class="flex-1 bg-[#0ecb81] rounded-t-sm h-full"></div>
                </div>
            </div>

            <div class="p-3 bg-[#0b0e11]/50 rounded-xl border border-[#2b3139] flex items-center justify-between hover:border-[#f6465d]/30 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-[#f6465d]/10 flex items-center justify-center text-[#f6465d]">
                        <ArrowDownRight class="w-4 h-4" />
                    </div>
                    <div>
                        <div class="text-[10px] text-[#848e9c] font-bold uppercase">Max Drawdown</div>
                        <div class="text-sm font-mono font-bold text-[#f6465d]">-4.21%</div>
                    </div>
                </div>
                <div class="w-16 h-8 flex items-end gap-[1px]">
                    <div v-for="i in 4" :key="i" class="flex-1 bg-[#f6465d]/20 rounded-t-sm" :style="`height: ${40 + Math.random() * 60}%`"></div>
                    <div class="flex-1 bg-[#f6465d] rounded-t-sm h-[80%]"></div>
                    <div v-for="i in 2" :key="i" class="flex-1 bg-[#f6465d]/40 rounded-t-sm" :style="`height: ${20 + Math.random() * 40}%`"></div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
svg circle {
    transition: stroke-dasharray 1s ease-out, transform 1s ease-out;
}
</style>
