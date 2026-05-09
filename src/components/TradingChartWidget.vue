<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { activePositions, selectedPrice, openOrders, alerts, createAlert, currentPrice, sharedSlPrice, isRiskModeActive, chartInterval } from '../store/tradeStore';
import { globalSymbol, workspacePanels, activeTool, setGlobalTool, updateGlobalInterval, type Drawing } from '../store/workspaceStore';
import { IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries, LineSeries, HistogramSeries, IPriceLine, createChart } from 'lightweight-charts';
import { calculateEMA, calculateRSI, calculateBollingerBands } from '../utils/indicators';
import { useChartData } from '../composables/useChartData';
import { FootprintRenderer, FootprintData } from '../lib/chart/FootprintRenderer';
import { DrawingManager } from '../lib/chart/DrawingManager';
import { OrderLinesRenderer } from '../lib/chart/OrderLinesRenderer';
import { aiLevels, initAIStore } from '../store/aiStore';

// Strict Type Definitions
interface DrawingPoint {
    price: number;
    time: any;
}

interface TradeUpdate {
    p: number;
    q: number;
    m: boolean;
    t: number;
}

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

const { 
    allCandles, 
    lastPriceData, 
    fetchKlines, 
    subscribeKline, 
    subscribeTrades,
    currentState,
    lastError
} = useChartData();

// Internal Lifecycle State
let isUnmounted = false;
let latestIndicatorRequestId = 0;
const chartContainer = ref<HTMLDivElement | null>(null);
const heatmapCanvas = ref<HTMLCanvasElement | null>(null);
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<"Candlestick"> | null = null;
let lineSeries: ISeriesApi<"Line"> | null = null;
let volumeSeries: ISeriesApi<"Histogram"> | null = null;
let emaSeries: ISeriesApi<"Line"> | null = null;
let rsiSeries: ISeriesApi<"Line"> | null = null;
let bbUpperSeries: ISeriesApi<"Line"> | null = null;
let bbMiddleSeries: ISeriesApi<"Line"> | null = null;
let bbLowerSeries: ISeriesApi<"Line"> | null = null;

const activeIndicators = ref<string[]>([]);
const chartType = ref<'candle' | 'line'>('candle');
const showVolume = ref(true);
const showFootprint = ref(false);
const showTape = ref(false);
const recentTrades = ref<TradeUpdate[]>([]);
const footprintDataMap = ref<Map<number, FootprintData>>(new Map());
const footprintSettings = ref({
    tickSize: 10,
    imbalanceRatio: 3,
    showShading: true,
    showImbalances: true,
    minTradeFilter: 0,
    stackedImbalanceCount: 3,
    showUnfinishedBusiness: true
});

const hoveredCell = ref<{
    price: number;
    bidVolume: number;
    askVolume: number;
    totalVolume: number;
    time: number;
    delta: number;
} | null>(null);
const tooltipPosition = ref({ x: 0, y: 0 });
const showFootprintSettings = ref(false);

const isLoading = computed(() => currentState.value === 'FETCHING' || currentState.value === 'PROCESSING');
const hasError = computed(() => currentState.value === 'FAILURE');
const isEmpty = ref(false);

watch(footprintSettings, () => {
    if (allCandles.value.length > 0) updateChartData();
}, { deep: true });

const drawings = ref<Drawing[]>([]);

// Task 5.1 — Persist drawings to workspace store
watch(drawings, (newDrawings) => {
    if (!props.panelId) return;
    const panel = workspacePanels.value.find(p => p.id === props.panelId);
    if (panel) panel.drawings = newDrawings;
}, { deep: true });
const fibStart = ref<{ price: number, time: any } | null>(null);
const trendStart = ref<{ price: number, time: any } | null>(null);
const heatmapData = ref<{ price: number, volume: number }[]>([]);
let drawingManager: DrawingManager | null = null;
let ohlcvWorker: Worker | null = null;
let heatmapRafId: number | null = null;

const scheduleHeatmap = () => {
    if (heatmapRafId || isUnmounted) return;
    heatmapRafId = requestAnimationFrame(() => {
        heatmapRafId = null;
        if (!isUnmounted) renderHeatmap();
    });
};

let riskSlLine: IPriceLine | null = null;
let isDraggingSl = false;
const intervals = ['1s', '1m', '5m', '15m', '1H', '4H', '1D', '1W'];

watch([activePositions, openOrders, alerts, currentPrice, aiLevels], () => {
    scheduleHeatmap();
}, { deep: true });

const updateIndicators = (candlestick: CandlestickData[]) => {
    if (!ohlcvWorker || !candlestick.length || activeIndicators.value.length === 0) return;

    const requestId = ++latestIndicatorRequestId;
    ohlcvWorker.postMessage({
        type: 'compute_indicators',
        requestId,
        candles: candlestick,
        config: {
            ema: activeIndicators.value.includes('EMA'),
            rsi: activeIndicators.value.includes('RSI'),
            bollinger: activeIndicators.value.includes('BOLL'),
            emaPeriod: 21,
            rsiPeriod: 14,
            bbPeriod: 20
        }
    });
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

    // Initialize Indicator Series
    emaSeries = chart.addSeries(LineSeries, {
        color: '#F0B90B',
        lineWidth: 1,
        lineStyle: 2,
        visible: activeIndicators.value.includes('EMA')
    });
    
    rsiSeries = chart.addSeries(LineSeries, {
        color: '#627EEA',
        lineWidth: 1,
        priceScaleId: 'rsi',
        visible: activeIndicators.value.includes('RSI')
    });
    rsiSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
        autoScale: true
    });

    bbUpperSeries = chart.addSeries(LineSeries, { color: 'rgba(100,100,255,0.4)', lineWidth: 1, visible: activeIndicators.value.includes('BOLL') });
    bbMiddleSeries = chart.addSeries(LineSeries, { color: 'rgba(100,100,255,0.7)', lineWidth: 1, visible: activeIndicators.value.includes('BOLL') });
    bbLowerSeries = chart.addSeries(LineSeries, { color: 'rgba(100,100,255,0.4)', lineWidth: 1, visible: activeIndicators.value.includes('BOLL') });

    drawingManager = new DrawingManager(chart, candleSeries);

    chart.subscribeCrosshairMove((param) => {
        if (!param.time || !candleSeries || !volumeSeries || !param.point) { hoveredCell.value = null; return; }
        const timeVal = param.time as any;
        const fp = footprintDataMap.value.get(timeVal);
        if (showFootprint.value && fp) {
            const price = candleSeries.coordinateToPrice(param.point.y);
            if (price) {
                const targetPrice = Math.round(price / footprintSettings.value.tickSize) * footprintSettings.value.tickSize;
                const cell = fp.cells.find((c: any) => Math.abs(c.price - targetPrice) < footprintSettings.value.tickSize / 2);
                if (cell) {
                    hoveredCell.value = { 
                        price: cell.price,
                        bidVolume: cell.bidVolume,
                        askVolume: cell.askVolume,
                        totalVolume: cell.totalVolume,
                        time: timeVal, 
                        delta: cell.askVolume - cell.bidVolume 
                    };
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

    chart.timeScale().subscribeVisibleTimeRangeChange(() => scheduleHeatmap());
    
    if (!isUnmounted) {
        await updateChartData();
    }
};

const renderHeatmap = () => {
    const canvas = heatmapCanvas.value;
    if (!canvas || !chart || !candleSeries || isUnmounted) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement!;
    const cssW = container.clientWidth;
    const cssH = container.clientHeight;

    const targetWidth = Math.floor(cssW * dpr);
    const targetHeight = Math.floor(cssH * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);
    
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
            ctx.fillRect(0, y - 1, cssW, 2);
        }
    });

    renderDrawingsInternal(ctx);
    renderAILevels(ctx);

    // 2. Render Order Lines (Positions, Orders, Alerts)
    OrderLinesRenderer.render(
        ctx, 
        chart, 
        candleSeries, 
        activePositions.value, 
        openOrders.value, 
        alerts.value, 
        currentPrice.value,
        cssW
    );
    ctx.restore();
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

const renderAILevels = (ctx: CanvasRenderingContext2D) => {
    if (!candleSeries || !chart || !aiLevels.value.length) return;

    aiLevels.value.forEach(level => {
        const yUpper = candleSeries!.priceToCoordinate(level.upperBound);
        const yLower = candleSeries!.priceToCoordinate(level.lowerBound);
        const canvas = ctx.canvas;

        if (yUpper !== null && yLower !== null) {
            // Zone shading
            const color = level.type === 'supply' ? 'rgba(246, 70, 93, 0.15)' : 
                          level.type === 'demand' ? 'rgba(14, 203, 129, 0.15)' : 
                          'rgba(240, 185, 11, 0.15)';
            
            ctx.fillStyle = color;
            ctx.fillRect(0, yUpper, canvas.width, yLower - yUpper);

            // Bounds
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = color.replace('0.15', '0.4');
            ctx.lineWidth = 1;
            
            ctx.beginPath(); ctx.moveTo(0, yUpper); ctx.lineTo(canvas.width, yUpper); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, yLower); ctx.lineTo(canvas.width, yLower); ctx.stroke();
            ctx.setLineDash([]); // Reset
            
            // Label
            ctx.fillStyle = color.replace('0.15', '0.8');
            ctx.font = 'bold 9px Inter';
            ctx.fillText(`${level.type.toUpperCase()} ST:${level.strength}`, 10, yUpper - 4);
        }
    });
};

const updateChartData = async () => {
    if (!candleSeries || !volumeSeries || !lineSeries || !chart) return;
    
    isEmpty.value = false;

    // fetchKlines now internally handles currentState and retry logic
    const data = await fetchKlines(props.symbol, props.interval);
    
    if (isUnmounted) return;

    if (!data || !data.candlestick || data.candlestick.length === 0) {
        isEmpty.value = true;
        return;
    }

    if (!chart) return;
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

    // Memory Guard: Prune old footprint data if map is too large
    if (footprintDataMap.value.size > 2000) {
        const sortedTimes = Array.from(footprintDataMap.value.keys()).sort((a, b) => a - b);
        const toRemove = sortedTimes.slice(0, 500);
        toRemove.forEach(t => footprintDataMap.value.delete(t));
    }

    if (chart) chart.timeScale().fitContent();
};

let disconnectKline: (() => void) | null = null;
let disconnectTrades: (() => void) | null = null;

const internalSubscribe = () => {
    disconnectKline?.();
    disconnectTrades?.();

    disconnectKline = subscribeKline(props.symbol, props.interval, (update, k) => {
        candleSeries?.update(update);
        lineSeries?.update({ time: update.time, value: update.close });
        volumeSeries?.update({ time: update.time, value: parseFloat(k.v), color: update.close >= update.open ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)' });
        updateIndicators(allCandles.value);
        
        // For historical footprints, if they don't exist yet, we can mock them.
        // But for the active kline, we rely on the trades stream.
        if (!footprintDataMap.value.has(update.time as any)) {
            const allTimes = Array.from(footprintDataMap.value.keys()).sort((a: any, b: any) => (a as number) - (b as number));
            const prevFp = allTimes.length > 0 ? footprintDataMap.value.get(allTimes[allTimes.length - 1] as any) : null;
            
            // Initialize empty footprint for the new kline
            footprintDataMap.value.set(update.time as any, {
                time: update.time as any,
                isUp: update.close >= update.open,
                cells: [],
                delta: 0,
                maxVolume: 0,
                hvnPrice: 0,
                isMultipleHVN: false
            });
        } else {
            const fp = footprintDataMap.value.get(update.time as any);
            if (fp) fp.isUp = update.close >= update.open;
        }
        
        renderHeatmap();
    });

    disconnectTrades = subscribeTrades(props.symbol, (trade) => {
        // Update Recent Trades (Tape)
        recentTrades.value.unshift(trade);
        if (recentTrades.value.length > 50) recentTrades.value.pop();

        if (!showFootprint.value || allCandles.value.length === 0) return;
        
        const lastCandle = allCandles.value[allCandles.value.length - 1];
        let currentFp = footprintDataMap.value.get(lastCandle.time as any);
        
        if (!currentFp) {
            currentFp = {
                time: lastCandle.time as any,
                isUp: lastCandle.close >= lastCandle.open,
                cells: [],
                delta: 0,
                maxVolume: 0,
                hvnPrice: 0,
                isMultipleHVN: false
            };
            footprintDataMap.value.set(lastCandle.time as any, currentFp);
        }

        const allTimes = Array.from(footprintDataMap.value.keys()).sort((a: any, b: any) => (a as number) - (b as number));
        const currIdx = allTimes.indexOf(lastCandle.time as any);
        const prevFp = currIdx > 0 ? footprintDataMap.value.get(allTimes[currIdx - 1] as any) : null;

        FootprintRenderer.updateLiveFootprint(currentFp, trade, footprintSettings.value, prevFp);
        scheduleHeatmap();
    });
};

const toggleIndicator = (type: string) => {
    const idx = activeIndicators.value.indexOf(type);
    if (idx === -1) activeIndicators.value.push(type);
    else activeIndicators.value.splice(idx, 1);

    const isVisible = activeIndicators.value.includes(type);
    if (type === 'EMA') emaSeries?.applyOptions({ visible: isVisible });
    if (type === 'RSI') rsiSeries?.applyOptions({ visible: isVisible });
    if (type === 'BOLL') {
        bbUpperSeries?.applyOptions({ visible: isVisible });
        bbMiddleSeries?.applyOptions({ visible: isVisible });
        bbLowerSeries?.applyOptions({ visible: isVisible });
    }

    updateIndicators(allCandles.value);
};

const addHorizontalLine = (price: number) => {
    const draw: Drawing = { type: 'hline', price, id: Math.random().toString(36).slice(2) };
    drawings.value.push(draw);
    drawingManager?.addPriceLine(price, 'rgba(240, 185, 11, 0.5)', 'Level');
};

const handleFibClick = (price: number, time: any) => {
    if (!fibStart.value) fibStart.value = { price, time };
    else {
        const drawing: Drawing = { 
            type: 'fib', 
            id: Math.random().toString(36).slice(2),
            points: [
                { price: fibStart.value.price, time: fibStart.value.time },
                { price, time }
            ] 
        };
        drawings.value.push(drawing);
        fibStart.value = null; setGlobalTool('none'); scheduleHeatmap();
    }
};

const handleTrendClick = (price: number, time: any) => {
    if (!trendStart.value) trendStart.value = { price, time };
    else {
        const drawing: Drawing = { 
            type: 'trend', 
            id: Math.random().toString(36).slice(2),
            points: [
                { price: trendStart.value.price, time: trendStart.value.time },
                { price, time }
            ] 
        };
        drawings.value.push(drawing);
        trendStart.value = null; setGlobalTool('none'); scheduleHeatmap();
    }
};

let resizeObserver: ResizeObserver | null = null;
onMounted(async () => {
    ohlcvWorker = new Worker(
        new URL('../workers/ohlcvWorker.ts', import.meta.url),
        { type: 'module' }
    );

    ohlcvWorker.onmessage = ({ data }) => {
        if (isUnmounted || data.requestId !== latestIndicatorRequestId) return;
        
        if (data.type === 'indicators_ready') {
            if (data.ema && emaSeries) emaSeries.setData(data.ema);
            if (data.rsi && rsiSeries) rsiSeries.setData(data.rsi);
            if (data.bollinger) {
                bbUpperSeries?.setData(data.bollinger.upper);
                bbMiddleSeries?.setData(data.bollinger.middle);
                bbLowerSeries?.setData(data.bollinger.lower);
            }
        }
    };

    await initChart();
    
    // Task 5.2 — Rehydrate drawings
    const panel = workspacePanels.value.find(p => p.id === props.panelId);
    if (panel?.drawings) {
        drawings.value = JSON.parse(JSON.stringify(panel.drawings));
        drawings.value.forEach(draw => {
            if (draw.type === 'hline' && draw.price !== undefined) {
                drawingManager?.addPriceLine(draw.price, draw.color || 'rgba(240, 185, 11, 0.5)', draw.label || 'Level');
            }
        });
        scheduleHeatmap();
    }

    internalSubscribe();
    if (chartContainer.value) {
        resizeObserver = new ResizeObserver(() => {
            if (chart && chartContainer.value) {
                chart.applyOptions({ width: chartContainer.value.clientWidth, height: chartContainer.value.clientHeight });
                scheduleHeatmap();
            }
        });
        resizeObserver.observe(chartContainer.value);
    }
});

onUnmounted(() => {
    isUnmounted = true;
    disconnectKline?.();
    disconnectTrades?.();
    if (ohlcvWorker) ohlcvWorker.terminate();
    if (resizeObserver) resizeObserver.disconnect();
    if (heatmapRafId) cancelAnimationFrame(heatmapRafId);
    
    if (chart) {
        chart.remove();
        chart = null;
    }
    
    footprintDataMap.value.clear();
    recentTrades.value = [];
});

watch(() => props.symbol, () => { updateChartData(); internalSubscribe(); }, { flush: 'sync' });
watch(() => props.interval, (newInt) => { 
    if (props.isSynced) updateGlobalInterval(newInt);
    updateChartData(); 
    internalSubscribe(); 
}, { flush: 'sync' });
watch(chartType, (val) => {
    candleSeries?.applyOptions({ visible: val === 'candle' });
    lineSeries?.applyOptions({ visible: val === 'line' });
});
watch(showVolume, (val) => volumeSeries?.applyOptions({ visible: val }));

</script>

<template>
  <div class="flex flex-col h-full bg-[#06080C]/80 backdrop-blur-3xl text-slate-100 overflow-hidden select-none border border-white/[0.08] hover:border-white/[0.15] transition-colors duration-500 rounded-2xl m-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative group">
    
    <!-- Loading Overlay -->
    <div v-if="isLoading" class="absolute inset-0 z-40 bg-[#06080C]/50 backdrop-blur-md flex flex-col items-center justify-center fade-in">
        <div class="relative w-16 h-16 flex items-center justify-center">
            <div class="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin opacity-80"></div>
            <div class="absolute inset-2 rounded-full border-r-2 border-indigo-400 animate-[spin_1.5s_reverse_infinite] opacity-60"></div>
            <div class="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></div>
        </div>
        <p class="mt-4 text-xs font-bold tracking-widest text-slate-400 uppercase">Loading Data Feed</p>
    </div>

    <!-- Error State Overlay -->
    <div v-if="hasError" class="absolute inset-0 z-40 bg-[#06080C]/80 backdrop-blur-xl flex flex-col items-center justify-center border border-red-500/20 m-4 rounded-xl">
        <div class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <p class="text-sm font-bold text-white tracking-wider mb-2">Connection Disturbed</p>
        <p class="text-xs text-slate-400 max-w-[250px] text-center mb-6">Unable to sync the live data feed. Please verify network status.</p>
        <button @click="updateChartData" class="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all">Retry Connection</button>
    </div>

    <!-- Empty State Overlay -->
    <div v-if="isEmpty && !isLoading && !hasError" class="absolute inset-0 z-40 bg-[#06080C]/50 backdrop-blur-sm flex flex-col items-center justify-center">
        <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10 shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)]">
            <svg class="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
        </div>
        <p class="text-sm font-bold text-slate-300 tracking-wider">No Data Available</p>
        <p class="text-xs text-slate-500 mt-1">Select a valid symbol or timeframe</p>
    </div>

    <!-- Footprint Hover Tooltip -->
    <div v-if="hoveredCell && showFootprint" 
         class="absolute z-50 bg-[#0A0C10]/90 backdrop-blur-2xl border border-white/10 p-3 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] pointer-events-none text-[10px] min-w-[140px]"
         :style="{ left: `${tooltipPosition.x + 15}px`, top: `${tooltipPosition.y + 15}px` }">
        <div class="flex justify-between border-b border-white/5 pb-1.5 mb-2">
            <span class="text-slate-500 font-medium">Price</span>
            <span class="font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{{ hoveredCell.price }}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <span class="text-slate-500 font-medium">Bid Vol</span>
            <span class="text-right font-bold text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]">{{ hoveredCell.bidVolume }}</span>
            <span class="text-slate-500 font-medium">Ask Vol</span>
            <span class="text-right font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">{{ hoveredCell.askVolume }}</span>
            <div class="col-span-2 h-px bg-white/5 my-0.5"></div>
            <span class="text-slate-400 font-medium">Total</span>
            <span class="text-right font-black text-white">{{ hoveredCell.totalVolume }}</span>
            <span class="text-slate-400 font-medium">Delta</span>
            <span :class="['text-right font-black', hoveredCell.delta > 0 ? 'text-emerald-400' : 'text-red-400']">
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
        @toggleFootprint="() => { showFootprint = !showFootprint; scheduleHeatmap(); }"
        @toggleTape="() => showTape = !showTape"
        @toggleFootprintSettings="showFootprintSettings = !showFootprintSettings"
        @toggleIndicator="toggleIndicator"
        @update:chartType="t => chartType = t"
        @toggleVolume="showVolume = !showVolume"
        @remove="emit('remove')"
    />

    <ChartLegend :data="lastPriceData" />

    <div class="flex-grow flex relative overflow-hidden bg-transparent">
        <div class="flex-grow relative h-full overflow-hidden" style="width: 898px;">
            <canvas ref="heatmapCanvas" class="absolute inset-0 pointer-events-none z-10 w-full h-full"></canvas>
            <div ref="chartContainer" class="absolute inset-0" style="height: 450px;"></div>
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
