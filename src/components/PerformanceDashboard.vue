<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { analyticsData } from '../store/analyticsStore';
import { TrendingUp, TrendingDown, Target, Activity, DollarSign, BarChart3, ShieldAlert, Award, Zap } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { createChart, IChartApi, ISeriesApi, AreaSeries, Time } from 'lightweight-charts';

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
    if (!areaSeries || !stats.value.equityCurve.length) return;
    areaSeries.setData(stats.value.equityCurve as any);
    chart?.timeScale().fitContent();
};

watch(() => stats.value.equityCurve, updateChart, { deep: true });

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    initChart();
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
    if (chart) chart.remove();
    if (resizeObserver) resizeObserver.disconnect();
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
                <!-- AI Insights -->
                <div class="bg-[#161a1e] rounded-3xl border border-white/5 p-6 shadow-2xl">
                    <h3 class="font-bold text-white mb-6 flex items-center gap-2">
                        <Zap class="w-4 h-4 text-[#F0B90B]" />
                        Decision Insights
                    </h3>
                    <div class="space-y-4">
                        <div v-for="insight in insights" :key="insight.title" class="p-4 rounded-2xl bg-[#0b0e11]/50 border border-white/5 hover:border-white/10 transition-all">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="p-1.5 rounded-lg" :style="{ backgroundColor: insight.color + '20' }">
                                    <component :is="insight.icon" class="w-4 h-4" :style="{ color: insight.color }" />
                                </div>
                                <span class="font-bold text-sm" :style="{ color: insight.color }">{{ insight.title }}</span>
                            </div>
                            <p class="text-[11px] text-[#848e9c] leading-relaxed font-medium">{{ insight.desc }}</p>
                        </div>
                        <div v-if="insights.length === 0" class="text-center py-8 text-[#474d57] text-xs font-bold uppercase tracking-widest">
                            Collecting more data...
                        </div>
                    </div>
                </div>

                <!-- Drawdown & Efficiency -->
                <div class="bg-[#F0B90B] rounded-3xl p-6 text-[#0b0e11] shadow-2xl">
                    <h3 class="font-black text-[10px] uppercase tracking-[0.2em] mb-6 opacity-60">Risk Profile</h3>
                    <div class="space-y-6">
                        <div>
                            <div class="flex justify-between text-xs font-black uppercase mb-2">
                                <span>Max Drawdown</span>
                                <span>{{ stats.maxDrawdown.toFixed(2) }}%</span>
                            </div>
                            <div class="w-full bg-black/10 h-2 rounded-full overflow-hidden">
                                <div class="bg-black/40 h-full transition-all duration-1000" :style="{ width: Math.min(stats.maxDrawdown, 100) + '%' }"></div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-2 border-t border-black/10">
                            <span class="text-[10px] font-black uppercase tracking-widest opacity-60">System Stability</span>
                            <span class="text-sm font-black">HIGH</span>
                        </div>
                    </div>
                </div>
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
