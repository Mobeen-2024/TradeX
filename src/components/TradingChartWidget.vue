<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { activePositions, selectedPrice, openOrders, alerts, createAlert, currentPrice, sharedSlPrice, isRiskModeActive } from '../store/tradeStore';
import { globalSymbol, workspacePanels, activeTool, setGlobalTool } from '../store/workspaceStore';
import { IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries, LineSeries, HistogramSeries, IPriceLine, createChart } from 'lightweight-charts';
import { calculateEMA, calculateRSI, calculateBollingerBands } from '../utils/indicators';
import { useChartData } from '../composables/useChartData';
import { FootprintRenderer } from '../lib/chart/FootprintRenderer';
import { DrawingManager } from '../lib/chart/DrawingManager';
import { OrderLinesRenderer } from '../lib/chart/OrderLinesRenderer';

// Sub-components
import ChartToolbar from './trading-chart/ChartToolbar.vue';
import ChartLegend from './trading-chart/ChartLegend.vue';
import DrawingToolbar from './trading-chart/DrawingToolbar.vue';
import FootprintSettings from './trading-chart/FootprintSettings.vue';
import TimeAndSales from './trading-chart/TimeAndSales.vue';

const props = defineProps<{
    panelId?: string;
    symbol: string;
    interval: string;
    isSynced: boolean;
}>();

const emit = defineEmits(['update:symbol', 'update:interval', 'update:isSynced', 'remove']);

const { allCandles, lastPriceData, fetchKlines, subscribeKline, subscribeTrades } = useChartData();

const chartContainer = ref<HTMLDivElement | null>(null);
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<"Candlestick"> | null = null;
let lineSeries: ISeriesApi<"Line"> | null = null;
let volumeSeries: ISeriesApi<"Histogram"> | null = null;
let emaSeries: ISeriesApi<"Line"> | null = null;
let rsiSeries: ISeriesApi<"Line"> | null = null;
let bbUpperSeries: ISeriesApi<"Line"> | null = null;
let bbMiddleSeries: ISeriesApi<"Line"> | null = null;
let bbLowerSeries: ISeriesApi<"Line"> | null = null;

const chartType = ref<'candle' | 'line'>('candle');
const showVolume = ref(true);
const activeIndicators = ref<string[]>([]);
const showFootprint = ref(false);
const showTape = ref(false);
const recentTrades = ref<any[]>([]);
const footprintDataMap = ref<Map<number, any>>(new Map());
const footprintSettings = ref({
    tickSize: 10,
    imbalanceRatio: 3,
    showShading: true,
    showImbalances: true,
    minTradeFilter: 0,
    stackedImbalanceCount: 3,
    showUnfinishedBusiness: true
});

const hoveredCell = ref<any>(null);
const tooltipPosition = ref({ x: 0, y: 0 });
const showFootprintSettings = ref(false);

watch(footprintSettings, () => {
    if (allCandles.value.length > 0) updateChartData();
}, { deep: true });

const drawings = ref<any[]>([]);
const fibStart = ref<{ price: number, time: any } | null>(null);
const trendStart = ref<{ price: number, time: any } | null>(null);
const heatmapData = ref<{ price: number, volume: number }[]>([]);
let drawingManager: DrawingManager | null = null;
let riskSlLine: IPriceLine | null = null;
let isDraggingSl = false;
const intervals = ['1s', '15m', '1H', '4H', '1D', '1W'];

watch([activePositions, openOrders, alerts, currentPrice], () => {
    renderHeatmap();
}, { deep: true });

const updateIndicators = (candlestick: CandlestickData[]) => {
    if (!chart || !candlestick.length) return;

    if (activeIndicators.value.includes('EMA')) {
        if (!emaSeries) emaSeries = chart.addSeries(LineSeries, { color: '#2962FF', lineWidth: 2, title: 'EMA 21' });
        emaSeries.setData(calculateEMA(candlestick, 21));
    } else if (emaSeries) { chart.removeSeries(emaSeries); emaSeries = null; }

    if (activeIndicators.value.includes('RSI')) {
        if (!rsiSeries) {
            rsiSeries = chart.addSeries(LineSeries, { color: '#E91E63', lineWidth: 2, priceScaleId: 'rsi', title: 'RSI 14' });
            chart.priceScale('rsi').applyOptions({ autoScale: true, scaleMargins: { top: 0.75, bottom: 0 } });
        }
        rsiSeries.setData(calculateRSI(candlestick, 14));
    } else if (rsiSeries) { chart.removeSeries(rsiSeries); rsiSeries = null; }

    if (activeIndicators.value.includes('BOLL')) {
        if (!bbUpperSeries || !bbMiddleSeries || !bbLowerSeries) {
            bbUpperSeries = chart.addSeries(LineSeries, { color: 'rgba(240, 185, 11, 0.4)', lineWidth: 1, title: 'BB Upper' });
            bbMiddleSeries = chart.addSeries(LineSeries, { color: 'rgba(240, 185, 11, 0.6)', lineWidth: 1, title: 'BB Middle' });
            bbLowerSeries = chart.addSeries(LineSeries, { color: 'rgba(240, 185, 11, 0.4)', lineWidth: 1, title: 'BB Lower' });
        }
        const { upper, middle, lower } = calculateBollingerBands(candlestick, 20);
        bbUpperSeries.setData(upper); bbMiddleSeries.setData(middle); bbLowerSeries.setData(lower);
    } else if (bbUpperSeries) {
        chart.removeSeries(bbUpperSeries); chart.removeSeries(bbMiddleSeries!); chart.removeSeries(bbLowerSeries!);
        bbUpperSeries = null; bbMiddleSeries = null; bbLowerSeries = null;
    }
};

const initChart = async () => {
    if (!chartContainer.value) return;
    if (chart) chart.remove();

    chart = createChart(chartContainer.value, {
        layout: { background: { color: '#0b0e11' }, textColor: '#848e9c', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        grid: { vertLines: { color: 'rgba(43, 49, 57, 0.1)' }, horzLines: { color: 'rgba(43, 49, 57, 0.1)' } },
        crosshair: { mode: 0, vertLine: { labelBackgroundColor: '#2b3139', color: '#848e9c' }, horzLine: { labelBackgroundColor: '#2b3139', color: '#848e9c' } },
        timeScale: { borderColor: '#2b3139', timeVisible: true, secondsVisible: true, barSpacing: 6 },
        rightPriceScale: { borderColor: '#2b3139', autoScale: true, scaleMargins: { top: 0.1, bottom: 0.2 } },
        handleScroll: true, handleScale: true
    });

    candleSeries = chart.addSeries(CandlestickSeries, { upColor: '#0ecb81', downColor: '#f6465d', borderVisible: false, wickUpColor: '#0ecb81', wickDownColor: '#f6465d' });
    lineSeries = chart.addSeries(LineSeries, { color: '#F0B90B', lineWidth: 2, visible: chartType.value === 'line' });
    volumeSeries = chart.addSeries(HistogramSeries, { color: '#26a69a', priceFormat: { type: 'volume' }, priceScaleId: '', visible: showVolume.value });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    drawingManager = new DrawingManager(chart, candleSeries);

    chart.subscribeCrosshairMove((param) => {
        if (!param.time || !candleSeries || !volumeSeries || !param.point) { hoveredCell.value = null; return; }
        const fp = footprintDataMap.value.get(param.time as number);
        if (showFootprint.value && fp) {
            const price = candleSeries.coordinateToPrice(param.point.y);
            if (price) {
                const targetPrice = Math.round(price / footprintSettings.value.tickSize) * footprintSettings.value.tickSize;
                const cell = fp.cells.find((c: any) => Math.abs(c.price - targetPrice) < footprintSettings.value.tickSize / 2);
                if (cell) {
                    hoveredCell.value = { ...cell, time: param.time, delta: cell.askVolume - cell.bidVolume };
                    tooltipPosition.value = { x: param.point.x, y: param.point.y };
                } else hoveredCell.value = null;
            }
        } else hoveredCell.value = null;
    });

    chart.subscribeClick((param) => {
        if (!param.point || !candleSeries) return;
        const price = candleSeries.coordinateToPrice(param.point.y);
        if (price) {
            if (activeTool.value === 'hline') addHorizontalLine(price);
            else if (activeTool.value === 'fib') handleFibClick(price, param.time);
            else if (activeTool.value === 'trend') handleTrendClick(price, param.time);
            else if (activeTool.value === 'alert') { createAlert(price); setGlobalTool('none'); }
            else selectedPrice.value = parseFloat(price.toFixed(2));
        }
    });

    chart.timeScale().subscribeVisibleTimeRangeChange(() => renderHeatmap());
    await updateChartData();
};

const renderHeatmap = () => {
    const canvas = document.getElementById(`heatmap-${props.panelId}`) as HTMLCanvasElement;
    if (!canvas || !chart || !candleSeries) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const container = canvas.parentElement!;
    if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
        canvas.width = container.clientWidth; canvas.height = container.clientHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const logicalRange = chart.timeScale().getVisibleLogicalRange();
    if (logicalRange) {
        const startIdx = Math.max(0, Math.floor(logicalRange.from));
        const endIdx = Math.min(allCandles.value.length - 1, Math.ceil(logicalRange.to));
        let candleWidth = 10;
        if (startIdx < endIdx && startIdx >= 0) {
            const x1 = chart.timeScale().timeToCoordinate(allCandles.value[startIdx].time);
            const x2 = chart.timeScale().timeToCoordinate(allCandles.value[startIdx+1]?.time || allCandles.value[startIdx].time);
            if (x1 !== null && x2 !== null) candleWidth = Math.abs(x2 - x1) || 50;
        }

        if (showFootprint.value) {
            for (let i = startIdx; i <= endIdx; i++) {
                const candle = allCandles.value[i];
                const fp = footprintDataMap.value.get(candle.time as number);
                const x = chart.timeScale().timeToCoordinate(candle.time);
                if (fp && x !== null) {
                    if (candleWidth > 40) FootprintRenderer.render(ctx, fp, x, candleWidth, candleSeries, footprintSettings.value);
                    else {
                        ctx.fillStyle = 'rgba(240, 185, 11, 0.3)';
                        const y = candleSeries.priceToCoordinate(fp.hvnPrice);
                        if (y !== null) ctx.fillRect(x - 2, y - 2, 4, 4);
                    }
                }
            }
        }
    }

    // Render Drawings and Heatmap (Simplified for this version)
    heatmapData.value.forEach(d => {
        const y = candleSeries!.priceToCoordinate(d.price);
        if (y !== null) {
            ctx.fillStyle = `rgba(240, 185, 11, ${Math.min(d.volume/100, 1) * 0.1})`;
            ctx.fillRect(0, y - 1, canvas.width, 2);
        }
    });

    renderDrawingsInternal(ctx);

    // 2. Render Order Lines (Positions, Orders, Alerts)
    OrderLinesRenderer.render(
        ctx, 
        chart, 
        candleSeries, 
        activePositions.value, 
        openOrders.value, 
        alerts.value, 
        currentPrice.value,
        canvas.width
    );
};

const renderDrawingsInternal = (ctx: CanvasRenderingContext2D) => {
    if (!candleSeries || !chart) return;
    drawings.value.forEach(draw => {
        if ((draw.type === 'fib' || draw.type === 'trend') && draw.points?.length === 2) {
            const x1 = chart!.timeScale().timeToCoordinate(draw.points[0].time);
            const y1 = candleSeries!.priceToCoordinate(draw.points[0].price);
            const x2 = chart!.timeScale().timeToCoordinate(draw.points[1].time);
            const y2 = candleSeries!.priceToCoordinate(draw.points[1].price);
            if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
                ctx.strokeStyle = '#F0B90B'; ctx.stroke();
            }
        }
    });
};

const updateChartData = async () => {
    if (!candleSeries || !volumeSeries || !lineSeries) return;
    const data = await fetchKlines(props.symbol, props.interval);
    candleSeries.setData(data.candlestick);
    volumeSeries.setData(data.volume);
    lineSeries.setData(data.candlestick.map(d => ({ time: d.time, value: d.close })));
    updateIndicators(data.candlestick);
    footprintDataMap.value.clear();
    let prevFp: any = null;
    data.candlestick.forEach((c, idx) => {
        const fp = FootprintRenderer.generateMock(c, data.volume[idx].value, footprintSettings.value, prevFp);
        footprintDataMap.value.set(c.time as number, fp);
        prevFp = fp;
    });
    if (chart) chart.timeScale().fitContent();
};

const internalSubscribe = () => {
    subscribeKline(props.symbol, props.interval, (update, k) => {
        candleSeries?.update(update);
        lineSeries?.update({ time: update.time, value: update.close });
        volumeSeries?.update({ time: update.time, value: parseFloat(k.v), color: update.close >= update.open ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)' });
        updateIndicators(allCandles.value);
        
        // For historical footprints, if they don't exist yet, we can mock them.
        // But for the active kline, we rely on the trades stream.
        if (!footprintDataMap.value.has(update.time as number)) {
            const allTimes = Array.from(footprintDataMap.value.keys()).sort((a, b) => a - b);
            const prevFp = allTimes.length > 0 ? footprintDataMap.value.get(allTimes[allTimes.length - 1]) : null;
            
            // Initialize empty footprint for the new kline
            footprintDataMap.value.set(update.time as number, {
                time: update.time as number,
                isUp: update.close >= update.open,
                cells: [],
                delta: 0,
                maxVolume: 0,
                hvnPrice: 0,
                isMultipleHVN: false
            });
        } else {
            const fp = footprintDataMap.value.get(update.time as number);
            fp.isUp = update.close >= update.open;
        }
        
        renderHeatmap();
    });

    subscribeTrades(props.symbol, (trade) => {
        // Update Recent Trades (Tape)
        recentTrades.value.unshift(trade);
        if (recentTrades.value.length > 50) recentTrades.value.pop();

        if (!showFootprint.value || allCandles.value.length === 0) return;
        
        const lastCandle = allCandles.value[allCandles.value.length - 1];
        let currentFp = footprintDataMap.value.get(lastCandle.time as number);
        
        if (!currentFp) {
            currentFp = {
                time: lastCandle.time as number,
                isUp: lastCandle.close >= lastCandle.open,
                cells: [],
                delta: 0,
                maxVolume: 0,
                hvnPrice: 0,
                isMultipleHVN: false
            };
            footprintDataMap.value.set(lastCandle.time as number, currentFp);
        }

        const allTimes = Array.from(footprintDataMap.value.keys()).sort((a, b) => a - b);
        const currIdx = allTimes.indexOf(lastCandle.time as number);
        const prevFp = currIdx > 0 ? footprintDataMap.value.get(allTimes[currIdx - 1]) : null;

        FootprintRenderer.updateLiveFootprint(currentFp, trade, footprintSettings.value, prevFp);
        renderHeatmap();
    });
};

const toggleIndicator = (type: string) => {
    const idx = activeIndicators.value.indexOf(type);
    if (idx === -1) activeIndicators.value.push(type);
    else activeIndicators.value.splice(idx, 1);
    updateIndicators(allCandles.value);
};

const addHorizontalLine = (price: number) => {
    const draw = { type: 'hline', price, id: Math.random().toString(36).slice(2) };
    drawings.value.push(draw);
    drawingManager?.addPriceLine(price, 'rgba(240, 185, 11, 0.5)', 'Level');
};

const handleFibClick = (price: number, time: any) => {
    if (!fibStart.value) fibStart.value = { price, time };
    else {
        drawings.value.push({ type: 'fib', points: [fibStart.value, { price, time }] });
        fibStart.value = null; setGlobalTool('none'); renderHeatmap();
    }
};

const handleTrendClick = (price: number, time: any) => {
    if (!trendStart.value) trendStart.value = { price, time };
    else {
        drawings.value.push({ type: 'trend', points: [trendStart.value, { price, time }] });
        trendStart.value = null; setGlobalTool('none'); renderHeatmap();
    }
};

let resizeObserver: ResizeObserver | null = null;
onMounted(async () => {
    await initChart();
    internalSubscribe();
    if (chartContainer.value) {
        resizeObserver = new ResizeObserver(() => {
            if (chart && chartContainer.value) {
                chart.applyOptions({ width: chartContainer.value.clientWidth, height: chartContainer.value.clientHeight });
                renderHeatmap();
            }
        });
        resizeObserver.observe(chartContainer.value);
    }
});

onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if (chart) chart.remove();
});

watch(() => props.symbol, () => { updateChartData(); internalSubscribe(); });
watch(() => props.interval, () => { updateChartData(); internalSubscribe(); });
watch(chartType, (val) => {
    candleSeries?.applyOptions({ visible: val === 'candle' });
    lineSeries?.applyOptions({ visible: val === 'line' });
});
watch(showVolume, (val) => volumeSeries?.applyOptions({ visible: val }));

</script>

<template>
  <div class="flex flex-col h-full bg-[#0b0e11]/60 backdrop-blur-md text-[#EAECEF] overflow-hidden select-none border border-white/5 hover:border-[#F0B90B]/30 transition-colors rounded-[16px] m-1 shadow-2xl relative">
    
    <div v-if="hoveredCell && showFootprint" 
         class="absolute z-50 bg-[#161a1e]/95 backdrop-blur-md border border-white/10 p-2.5 rounded-lg shadow-2xl pointer-events-none text-[10px] min-w-[120px]"
         :style="{ left: `${tooltipPosition.x + 15}px`, top: `${tooltipPosition.y + 15}px` }">
        <div class="flex justify-between border-b border-white/5 pb-1 mb-1">
            <span class="text-[#848e9c]">Price</span>
            <span class="font-bold text-[#F0B90B]">{{ hoveredCell.price }}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1">
            <span class="text-[#848e9c]">Bid Vol</span>
            <span class="text-right text-[#f6465d]">{{ hoveredCell.bidVolume }}</span>
            <span class="text-[#848e9c]">Ask Vol</span>
            <span class="text-right text-[#0ecb81]">{{ hoveredCell.askVolume }}</span>
            <span class="text-[#848e9c]">Total</span>
            <span class="text-right font-bold">{{ hoveredCell.totalVolume }}</span>
            <span class="text-[#848e9c]">Delta</span>
            <span :class="['text-right font-bold', hoveredCell.delta > 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]']">
                {{ hoveredCell.delta > 0 ? '+' : '' }}{{ hoveredCell.delta }}
            </span>
        </div>
    </div>

    <FootprintSettings v-if="showFootprintSettings" v-model="footprintSettings" @close="showFootprintSettings = false" />

    <DrawingToolbar :activeTool="activeTool" @setTool="setGlobalTool" />

    <ChartToolbar 
        :symbol="symbol" :interval="interval" :intervals="intervals" :isSynced="isSynced"
        :showFootprint="showFootprint" :showFootprintSettings="showFootprintSettings"
        :showTape="showTape"
        :activeIndicators="activeIndicators" :chartType="chartType" :showVolume="showVolume" :panelId="panelId"
        @update:symbol="s => emit('update:symbol', s)"
        @update:interval="i => emit('update:interval', i)"
        @update:isSynced="v => emit('update:isSynced', v)"
        @toggleFootprint="() => { showFootprint = !showFootprint; renderHeatmap(); }"
        @toggleTape="() => showTape = !showTape"
        @toggleFootprintSettings="showFootprintSettings = !showFootprintSettings"
        @toggleIndicator="toggleIndicator"
        @update:chartType="t => chartType = t"
        @toggleVolume="showVolume = !showVolume"
        @remove="emit('remove')"
    />

    <ChartLegend :data="lastPriceData" />

    <div class="flex-grow flex relative overflow-hidden bg-transparent">
        <div class="flex-grow relative h-full overflow-hidden">
            <canvas :id="`heatmap-${panelId}`" class="absolute inset-0 pointer-events-none z-10 w-full h-full"></canvas>
            <div ref="chartContainer" class="absolute inset-0"></div>
        </div>
        <transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="translate-x-full opacity-0" enter-to-class="translate-x-0 opacity-100" leave-active-class="transition-all duration-300 ease-in" leave-from-class="translate-x-0 opacity-100" leave-to-class="translate-x-full opacity-0">
            <TimeAndSales v-if="showTape" :trades="recentTrades" :minLargeTrade="footprintSettings.minTradeFilter" class="shrink-0 z-20" />
        </transition>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
