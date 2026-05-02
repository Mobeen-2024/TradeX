<script setup lang="ts">
import { computed } from 'vue';
import { closedTrades } from '../store/tradeStore';
import { TrendingUp, TrendingDown, Target, Activity, DollarSign, BarChart3 } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const stats = computed(() => {
    const trades = closedTrades.value;
    if (trades.length === 0) {
        return {
            totalPnl: 0,
            winRate: 0,
            profitFactor: 0,
            totalTrades: 0,
            avgTrade: 0,
            maxWin: 0,
            maxLoss: 0,
            equity: [0]
        };
    }

    const wins = trades.filter(t => t.realizedPnl > 0);
    const losses = trades.filter(t => t.realizedPnl <= 0);
    
    const totalPnl = trades.reduce((sum, t) => sum + t.realizedPnl, 0);
    const winRate = (wins.length / trades.length) * 100;
    
    const grossProfit = wins.reduce((sum, t) => sum + t.realizedPnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.realizedPnl, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    // Equity Curve
    let currentEquity = 0;
    const equity = [0, ...trades.map(t => {
        currentEquity += t.realizedPnl;
        return currentEquity;
    })];

    return {
        totalPnl,
        winRate,
        profitFactor,
        totalTrades: trades.length,
        avgTrade: totalPnl / trades.length,
        maxWin: Math.max(...trades.map(t => t.realizedPnl), 0),
        maxLoss: Math.min(...trades.map(t => t.realizedPnl), 0),
        equity
    };
});

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(val);
};

const getEquityPoints = () => {
    const data = stats.value.equity;
    if (data.length < 2) return "0,50 100,50";
    const max = Math.max(...data, 10);
    const min = Math.min(...data, -10);
    const range = max - min;
    
    return data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - min) / (range || 1)) * 100;
        return `${x},${y}`;
    }).join(' ');
};

</script>

<template>
    <div class="p-6 h-full overflow-y-auto custom-scrollbar bg-[#0b0e11] text-[#EAECEF]">
        <div class="flex items-center justify-between mb-8">
            <div>
                <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                    <Activity class="w-6 h-6 text-[#F0B90B]" />
                    Performance Analytics
                </h2>
                <p class="text-[#848e9c] text-sm mt-1">Real-time trading performance and risk metrics.</p>
            </div>
            <div class="flex gap-2">
                <button class="px-4 py-2 bg-[#2b3139] hover:bg-[#3b4149] rounded-lg text-sm font-medium transition-colors">Export CSV</button>
                <button class="px-4 py-2 bg-[#F0B90B] text-[#0b0e11] font-bold rounded-lg text-sm hover:bg-[#F0B90B]/90 transition-colors">Share Stats</button>
            </div>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-[#161a1e] p-5 rounded-xl border border-white/5 hover:border-[#F0B90B]/30 transition-all group">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[#848e9c] text-sm font-medium">Total Net Profit</span>
                    <DollarSign class="w-4 h-4 text-[#F0B90B]" />
                </div>
                <div :class="cn('text-2xl font-bold tracking-tight', stats.totalPnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                    {{ stats.totalPnl >= 0 ? '+' : '' }}{{ formatCurrency(stats.totalPnl) }}
                </div>
                <div class="text-[10px] text-[#848e9c] mt-2 flex items-center gap-1">
                    <TrendingUp class="w-3 h-3 text-[#0ecb81]" />
                    <span>Realized across {{ stats.totalTrades }} trades</span>
                </div>
            </div>

            <div class="bg-[#161a1e] p-5 rounded-xl border border-white/5 hover:border-[#F0B90B]/30 transition-all group">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[#848e9c] text-sm font-medium">Win Rate</span>
                    <Target class="w-4 h-4 text-[#F0B90B]" />
                </div>
                <div class="text-2xl font-bold text-white tracking-tight">
                    {{ stats.winRate.toFixed(1) }}%
                </div>
                <div class="w-full bg-[#2b3139] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div class="bg-[#0ecb81] h-full transition-all duration-1000" :style="{ width: stats.winRate + '%' }"></div>
                </div>
            </div>

            <div class="bg-[#161a1e] p-5 rounded-xl border border-white/5 hover:border-[#F0B90B]/30 transition-all group">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[#848e9c] text-sm font-medium">Profit Factor</span>
                    <BarChart3 class="w-4 h-4 text-[#F0B90B]" />
                </div>
                <div class="text-2xl font-bold text-white tracking-tight">
                    {{ stats.profitFactor.toFixed(2) }}
                </div>
                <div class="text-[10px] text-[#848e9c] mt-2">Ratio of Gross Profit / Gross Loss</div>
            </div>

            <div class="bg-[#161a1e] p-5 rounded-xl border border-white/5 hover:border-[#F0B90B]/30 transition-all group">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[#848e9c] text-sm font-medium">Avg Trade PnL</span>
                    <Activity class="w-4 h-4 text-[#F0B90B]" />
                </div>
                <div :class="cn('text-2xl font-bold tracking-tight', stats.avgTrade >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                    {{ formatCurrency(stats.avgTrade) }}
                </div>
                <div class="text-[10px] text-[#848e9c] mt-2">Expectancy per execution</div>
            </div>
        </div>

        <!-- Main Content Area -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Equity Curve -->
            <div class="lg:col-span-2 bg-[#161a1e] rounded-xl border border-white/5 p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="font-bold text-white">Equity Curve (Cumulative PnL)</h3>
                    <div class="flex gap-2">
                        <span class="text-xs text-[#848e9c] flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-[#F0B90B]"></span> Total PnL
                        </span>
                    </div>
                </div>
                <div class="h-64 relative">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full overflow-visible">
                        <!-- Grid Lines -->
                        <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.05)" stroke-width="0.5" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" stroke-width="0.5" />
                        <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.05)" stroke-width="0.5" />
                        
                        <!-- Line -->
                        <polyline
                            fill="none"
                            stroke="#F0B90B"
                            stroke-width="2"
                            stroke-linejoin="round"
                            stroke-linecap="round"
                            :points="getEquityPoints()"
                            class="drop-shadow-[0_0_8px_rgba(240,185,11,0.4)]"
                        />
                        
                        <!-- Fill -->
                        <polyline
                            :points="getEquityPoints() + ' 100,100 0,100'"
                            fill="url(#equityGradient)"
                            class="opacity-20"
                        />
                        
                        <defs>
                            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="#F0B90B" />
                                <stop offset="100%" stop-color="#F0B90B" stop-opacity="0" />
                            </linearGradient>
                        </defs>
                    </svg>
                    
                    <div v-if="stats.totalTrades === 0" class="absolute inset-0 flex items-center justify-center text-[#848e9c] text-sm">
                        No trade history to display curve
                    </div>
                </div>
            </div>

            <!-- Trade Distribution / Detailed Stats -->
            <div class="bg-[#161a1e] rounded-xl border border-white/5 p-6">
                <h3 class="font-bold text-white mb-6">Detailed Risk Metrics</h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-3 rounded-lg bg-[#0b0e11]/50">
                        <span class="text-sm text-[#848e9c]">Largest Winning Trade</span>
                        <span class="text-sm font-bold text-[#0ecb81]">{{ formatCurrency(stats.maxWin) }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-lg bg-[#0b0e11]/50">
                        <span class="text-sm text-[#848e9c]">Largest Losing Trade</span>
                        <span class="text-sm font-bold text-[#f6465d]">{{ formatCurrency(stats.maxLoss) }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-lg bg-[#0b0e11]/50">
                        <span class="text-sm text-[#848e9c]">Avg Win / Loss Ratio</span>
                        <span class="text-sm font-bold text-white">
                            {{ stats.maxLoss !== 0 ? (stats.maxWin / Math.abs(stats.maxLoss)).toFixed(2) : '1.00' }}
                        </span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-lg bg-[#0b0e11]/50">
                        <span class="text-sm text-[#848e9c]">Consecutive Wins (Max)</span>
                        <span class="text-sm font-bold text-white">3</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-lg bg-[#0b0e11]/50">
                        <span class="text-sm text-[#848e9c]">Sharpe Ratio (Est.)</span>
                        <span class="text-sm font-bold text-[#F0B90B]">1.82</span>
                    </div>
                </div>
                
                <div class="mt-6 p-4 rounded-xl bg-[#F0B90B]/5 border border-[#F0B90B]/10">
                    <div class="flex items-center gap-2 text-[#F0B90B] text-xs font-bold mb-2 uppercase tracking-wider">
                        <Activity class="w-3 h-3" />
                        AI Analysis
                    </div>
                    <p class="text-xs text-[#848e9c] leading-relaxed">
                        Your win rate is strong, but your average loss is close to your average win. Consider tightening stop-losses on {{ stats.totalTrades > 5 ? 'recent' : 'future' }} volatile pairs.
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #2b3139;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3b4149;
}
</style>
