<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { analyticsData } from '../store/analyticsStore';
import { TrendingUp, TrendingDown, Target, Activity, DollarSign, BarChart3, ShieldAlert, Award, Zap, History, ExternalLink } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { createChart, IChartApi, ISeriesApi, AreaSeries, Time } from 'lightweight-charts';
import AssetAllocationDonut from './AssetAllocationDonut.vue';
import { closedTrades } from '../store/tradeStore';

const chartContainer = ref<HTMLElement | null>(null);
let chart: IChartApi | null = null;
let areaSeries: ISeriesApi<"Area"> | null = null;

const stats = computed(() => analyticsData.value);

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(val);
};

const insights = computed(() => {
    const data = stats.value;
    const items = [];

    if (data.winRate > 60) {
        items.push({ 
            title: "High Precision", 
            desc: "Your win rate is exceptional. Focus on increasing position size to maximize returns.", 
            icon: Award, 
            color: "#0ecb81" 
        });
    } else if (data.winRate < 40 && data.profitFactor > 1.5) {
        items.push({ 
            title: "Trend Follower", 
            desc: "You have a low win rate but high profit factor. This suggests you capture big moves effectively.", 
            icon: TrendingUp, 
            color: "#F0B90B" 
        });
    }

    if (data.maxDrawdown > 20) {
        items.push({ 
            title: "Risk Alert", 
            desc: "Max Drawdown is high (20%+). Consider tightening stop losses to preserve capital.", 
            icon: ShieldAlert, 
            color: "#f6465d" 
        });
    }

    if (data.sharpeRatio > 2) {
        items.push({ 
            title: "Elite Efficiency", 
            desc: "Your risk-adjusted returns are institutional-grade. Your trading system is very stable.", 
            icon: Zap, 
            color: "#F0B90B" 
        });
    }

    return items;
});

const initChart = () => {
    if (!chartContainer.value) return;

    chart = createChart(chartContainer.value, {
        width: chartContainer.value.clientWidth,
        height: chartContainer.value.clientHeight,
        layout: {
            background: { color: 'transparent' },
            textColor: '#848e9c',
            fontSize: 11,
            fontFamily: '"JetBrains Mono", monospace',
        },
        grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            autoScale: true,
        },
        timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            timeVisible: true,
        },
        crosshair: {
            horzLine: { color: 'rgba(240, 185, 11, 0.5)', style: 3 },
            vertLine: { color: 'rgba(240, 185, 11, 0.5)', style: 3 },
        },
        handleScroll: true,
        handleScale: true,
    });

    areaSeries = chart.addSeries(AreaSeries, {
        lineColor: '#F0B90B',
        topColor: 'rgba(240, 185, 11, 0.3)',
        bottomColor: 'rgba(240, 185, 11, 0.0)',
        lineWidth: 2,
    });

    updateChart();
};

const updateChart = () => {
    if (!areaSeries || !stats.value.equityCurve.length || !chart) return;
    areaSeries.setData(stats.value.equityCurve as any);
    chart.timeScale().fitContent();
};

const fetchEquityHistory = async () => {
    try {
        const res = await fetch('/api/portfolio/history');
        const data = await res.json();
        if (data.length > 0 && areaSeries) {
            const curve = data.map((d: any) => ({
                time: (new Date(d.timestamp).getTime() / 1000) as Time,
                value: d.equity
            }));
            areaSeries.setData(curve);
            chart?.timeScale().fitContent();
        }
    } catch (e) {
        console.error('Failed to fetch equity history');
    }
};

watch(() => stats.value.equityCurve, updateChart, { deep: true });

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    initChart();
    fetchEquityHistory();
    if (chartContainer.value) {
        resizeObserver = new ResizeObserver((entries) => {
            if (chart && entries[0].contentRect) {
                chart.applyOptions({
                    width: entries[0].contentRect.width,
                    height: entries[0].contentRect.height
                });
            }
        });
        resizeObserver.observe(chartContainer.value);
    }
});

onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if (chart) {
        chart.remove();
        chart = null;
    }
});

</script>

<template>
    <div class="p-4 sm:p-6 h-full overflow-hidden bg-[#0b0e11] text-[#EAECEF]">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
                <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                    <Activity class="w-6 h-6 text-[#F0B90B]" />
                    Decision Intelligence
                </h2>
                <p class="text-[#848e9c] text-sm mt-1">Institutional-grade performance and risk analytics.</p>
            </div>
            <div class="flex gap-2">
                <button class="px-4 py-2 bg-[#2b3139] hover:bg-[#3b4149] rounded-xl text-sm font-medium transition-colors">Export Analytics</button>
                <button class="px-4 py-2 bg-[#F0B90B] text-[#0b0e11] font-bold rounded-xl text-sm hover:bg-[#F0B90B]/90 transition-colors">Deep Audit</button>
            </div>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-[#161a1e] p-5 rounded-2xl border border-white/5 hover:border-[#F0B90B]/30 transition-all">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[#848e9c] text-[10px] font-black uppercase tracking-widest">Total Net Profit</span>
                    <DollarSign class="w-4 h-4 text-[#F0B90B]" />
                </div>
                <div :class="cn('text-3xl font-black tracking-tighter', stats.totalNetProfit >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                    {{ stats.totalNetProfit >= 0 ? '+' : '' }}{{ formatCurrency(stats.totalNetProfit) }}
                </div>
            </div>

            <div class="bg-[#161a1e] p-5 rounded-2xl border border-white/5 hover:border-[#F0B90B]/30 transition-all">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[#848e9c] text-[10px] font-black uppercase tracking-widest">Win Rate</span>
                    <Target class="w-4 h-4 text-[#F0B90B]" />
                </div>
                <div class="text-3xl font-black text-white tracking-tighter">
                    {{ stats.winRate.toFixed(1) }}%
                </div>
                <div class="w-full bg-[#2b3139] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div class="bg-[#0ecb81] h-full transition-all duration-1000" :style="{ width: stats.winRate + '%' }"></div>
                </div>
            </div>

            <div class="bg-[#161a1e] p-5 rounded-2xl border border-white/5 hover:border-[#F0B90B]/30 transition-all">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[#848e9c] text-[10px] font-black uppercase tracking-widest">Profit Factor</span>
                    <BarChart3 class="w-4 h-4 text-[#F0B90B]" />
                </div>
                <div class="text-3xl font-black text-white tracking-tighter">
                    {{ stats.profitFactor.toFixed(2) }}
                </div>
                <div class="text-[10px] text-[#848e9c] mt-2 font-bold opacity-50 uppercase tracking-tighter">Gross Profit / Gross Loss</div>
            </div>

            <div class="bg-[#161a1e] p-5 rounded-2xl border border-white/5 hover:border-[#F0B90B]/30 transition-all">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[#848e9c] text-[10px] font-black uppercase tracking-widest">Sharpe Ratio</span>
                    <Zap class="w-4 h-4 text-[#F0B90B]" />
                </div>
                <div class="text-3xl font-black text-[#F0B90B] tracking-tighter">
                    {{ stats.sharpeRatio.toFixed(2) }}
                </div>
                <div class="text-[10px] text-[#848e9c] mt-2 font-bold opacity-50 uppercase tracking-tighter">Risk-Adjusted Return</div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Equity Curve -->
            <div class="lg:col-span-2 bg-[#161a1e] rounded-3xl border border-white/5 p-4 sm:p-6 flex flex-col">
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h3 class="font-bold text-white text-lg">Equity Curve</h3>
                        <p class="text-xs text-[#848e9c]">Historical growth of total account value.</p>
                    </div>
                </div>
                <div class="flex-1 min-h-[350px] relative">
                    <div ref="chartContainer" class="w-full h-full"></div>
                    <div v-if="!stats.equityCurve.length" class="absolute inset-0 flex items-center justify-center text-[#848e9c] text-sm bg-[#161a1e]/50 backdrop-blur-sm z-10">
                        Waiting for trade history...
                    </div>
                </div>
            </div>

            <!-- Insights & Secondary Metrics -->
            <div class="flex flex-col gap-6">
                <!-- Asset Allocation -->
                <div class="bg-[#161a1e] rounded-3xl border border-white/5 p-6 h-fit">
                    <h3 class="font-bold text-white mb-6 flex items-center gap-2 text-sm">
                        <BarChart3 class="w-4 h-4 text-[#F0B90B]" />
                        Asset Allocation
                    </h3>
                    <AssetAllocationDonut />
                </div>

                <!-- AI Insights -->
                <div class="bg-[#161a1e] rounded-3xl border border-white/5 p-6 shadow-2xl flex-1">
                    <h3 class="font-bold text-white mb-6 flex items-center gap-2 text-sm">
                        <Zap class="w-4 h-4 text-[#F0B90B]" />
                        Decision Insights
                    </h3>
                    <div class="space-y-4">
                        <div v-for="insight in insights" :key="insight.title" class="p-4 rounded-2xl bg-[#0b0e11]/50 border border-white/5 hover:border-white/10 transition-all">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="p-1.5 rounded-lg" :style="{ backgroundColor: insight.color + '20' }">
                                    <component :is="insight.icon" class="w-4 h-4" :style="{ color: insight.color }" />
                                </div>
                                <span class="font-bold text-xs" :style="{ color: insight.color }">{{ insight.title }}</span>
                            </div>
                            <p class="text-[11px] text-[#848e9c] leading-relaxed font-medium">{{ insight.desc }}</p>
                        </div>
                        <div v-if="insights.length === 0" class="text-center py-8 text-[#474d57] text-xs font-bold uppercase tracking-widest">
                            Collecting more data...
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Recent Trades -->
        <div class="mt-8 bg-[#161a1e] rounded-3xl border border-white/5 overflow-hidden">
            <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <h3 class="font-bold text-white flex items-center gap-2">
                    <History class="w-4 h-4 text-[#F0B90B]" />
                    Recent Activity
                </h3>
                <button class="text-[10px] font-black uppercase text-[#848e9c] hover:text-white transition-colors tracking-widest">View All Trades</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr class="text-[10px] font-black uppercase text-[#474d57] tracking-[0.15em] border-b border-white/5">
                            <th class="px-6 py-4">Symbol</th>
                            <th class="px-6 py-4">Side</th>
                            <th class="px-6 py-4">Entry / Close</th>
                            <th class="px-6 py-4">Size</th>
                            <th class="px-6 py-4">P&L (USDT)</th>
                            <th class="px-6 py-4">Status</th>
                            <th class="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody class="text-xs">
                        <tr v-for="trade in closedTrades.slice(-5).reverse()" :key="trade.id" class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td class="px-6 py-4 font-bold text-white">{{ trade.pair }}</td>
                            <td class="px-6 py-4">
                                <span :class="cn('px-2 py-0.5 rounded font-black text-[10px]', trade.type === 'LONG' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]')">
                                    {{ trade.type }}
                                </span>
                            </td>
                            <td class="px-6 py-4 font-mono text-[#848e9c]">
                                <div class="text-white">{{ trade.entry.toFixed(2) }}</div>
                                <div class="text-[10px]">{{ trade.closePrice.toFixed(2) }}</div>
                            </td>
                            <td class="px-6 py-4 font-mono text-white">{{ trade.size }} BTC</td>
                            <td :class="cn('px-6 py-4 font-black font-mono', trade.realizedPnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                                {{ trade.realizedPnl >= 0 ? '+' : '' }}{{ trade.realizedPnl.toFixed(2) }}
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-0.5 rounded bg-[#2b3139] text-[#848e9c] text-[10px] font-bold">Closed</span>
                            </td>
                            <td class="px-6 py-4">
                                <button class="text-[#474d57] hover:text-[#F0B90B] transition-colors">
                                    <ExternalLink class="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
