<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { activePositions, selectedPrice } from '../store/tradeStore';
import { globalSymbol, workspacePanels } from '../store/workspaceStore';
import { Maximize2, BarChart3, TrendingUp as LineChartIcon, CandlestickChart, Settings2, X, Link2, Link2Off, MousePointer2, Minus, TrendingUp, Trash2, Bell, GripHorizontal, PenTool } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries, LineSeries, HistogramSeries, IPriceLine } from 'lightweight-charts';
import { calculateEMA, calculateRSI, calculateBollingerBands } from '../utils/indicators';
import { alerts, createAlert, removeAlert, currentPrice, sharedSlPrice, isRiskModeActive } from '../store/tradeStore';

const props = defineProps<{
    panelId?: string;
    symbol: string;
    interval: string;
    isSynced: boolean;
}>();

const emit = defineEmits(['update:symbol', 'update:interval', 'update:isSynced', 'remove']);

const chartContainer = ref<HTMLDivElement | null>(null);
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<"Candlestick"> | null = null;
const allCandles = ref<CandlestickData[]>([]);
let lineSeries: ISeriesApi<"Line"> | null = null;
let volumeSeries: ISeriesApi<"Histogram"> | null = null;
let positionLines: IPriceLine[] = [];
let emaSeries: ISeriesApi<"Line"> | null = null;
let rsiSeries: ISeriesApi<"Line"> | null = null;
let bbUpperSeries: ISeriesApi<"Line"> | null = null;
let bbMiddleSeries: ISeriesApi<"Line"> | null = null;
let bbLowerSeries: ISeriesApi<"Line"> | null = null;

const chartType = ref<'candle' | 'line'>('candle');
const showVolume = ref(true);
const activeIndicators = ref<string[]>([]);
const showFootprint = ref(false);
const footprintDataMap = ref<Map<number, any>>(new Map());
const footprintSettings = ref({
    tickSize: 10,
    imbalanceRatio: 3,
    showShading: true,
    showImbalances: true
});

const hoveredCell = ref<any>(null);
const tooltipPosition = ref({ x: 0, y: 0 });
const showFootprintSettings = ref(false);

watch(footprintSettings, () => {
    if (allCandles.value.length > 0) {
        // Find volume data which is stored in volumeSeries (hard to get back, so we use a cache or just re-generate from allCandles if we store volume there)
        // Actually, updateChartData is easier, but let's just re-map from allCandles
        footprintDataMap.value.clear();
        allCandles.value.forEach((c: any) => {
            // We need the volume. Let's assume volume is stored in the candle or we re-fetch.
            // For now, let's just trigger updateChartData for simplicity as it's a mock.
            updateChartData();
        });
    }
}, { deep: true });

const generateMockFootprint = (candle: CandlestickData, volume: number) => {
    const tickSize = footprintSettings.value.tickSize;
    const minPrice = Math.floor(candle.low / tickSize) * tickSize;
    const maxPrice = Math.ceil(candle.high / tickSize) * tickSize;
    
    const cells = [];
    let delta = 0;
    let maxVol = 0;
    let hvnPrice = minPrice;
    
    const levelsCount = Math.max(1, (maxPrice - minPrice) / tickSize + 1);
    let remainingVol = volume;
    
    for (let p = maxPrice; p >= minPrice; p -= tickSize) {
        let cellVol = (Math.random() * (remainingVol / (levelsCount / 2)));
        if (p < minPrice + tickSize) cellVol = remainingVol;
        remainingVol -= cellVol;
        if(cellVol < 0) cellVol = 0;
        
        let bidVol = cellVol * (Math.random() * 0.6 + 0.2);
        let askVol = cellVol - bidVol;
        
        if (candle.close > candle.open) {
            askVol = cellVol * (Math.random() * 0.4 + 0.6);
            bidVol = cellVol - askVol;
        } else {
            bidVol = cellVol * (Math.random() * 0.4 + 0.6);
            askVol = cellVol - bidVol;
        }
        
        const bidV = Math.round(bidVol);
        const askV = Math.round(askVol);
        
        cells.push({
            price: p,
            bidVolume: bidV,
            askVolume: askV,
            totalVolume: Math.round(cellVol),
            isBuyImbalance: false,
            isSellImbalance: false
        });
        
        delta += (askV - bidV);
        if (cellVol > maxVol) {
            maxVol = cellVol;
            hvnPrice = p;
        }
    }
    
    const ratio = footprintSettings.value.imbalanceRatio;
    for (let i = 0; i < cells.length - 1; i++) {
        const askP = cells[i].askVolume;
        const bidPminus1 = cells[i+1].bidVolume;
        if (askP >= ratio * bidPminus1 && askP > 0) cells[i].isBuyImbalance = true;
        
        const bidP = cells[i+1].bidVolume;
        const askPplus1 = cells[i].askVolume;
        if (bidP >= ratio * askPplus1 && bidP > 0) cells[i+1].isSellImbalance = true;
    }
    
    return {
        time: candle.time as number,
        cells,
        delta,
        maxVolume: maxVol,
        hvnPrice
    };
};

import { activeTool, setGlobalTool } from '../store/workspaceStore';
const drawings = ref<any[]>([]);
const fibStart = ref<{ price: number, time: any } | null>(null);
const trendStart = ref<{ price: number, time: any } | null>(null);
const heatmapData = ref<{ price: number, volume: number }[]>([]);
let drawingPriceLines: IPriceLine[] = [];
let riskSlLine: IPriceLine | null = null;
let isDraggingSl = false;
const intervals = ['1s', '15m', '1H', '4H', '1D', '1W'];

// State for legend
const lastPriceData = ref({
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    volume: 0,
    isUp: true
});

const updateIndicators = (candlestick: CandlestickData[]) => {
    if (!chart || !candlestick.length) return;

    // Handle EMA
    if (activeIndicators.value.includes('EMA')) {
        if (!emaSeries) {
            emaSeries = chart.addSeries(LineSeries, {
                color: '#2962FF',
                lineWidth: 2,
                title: 'EMA 21',
            });
        }
        const emaData = calculateEMA(candlestick, 21);
        emaSeries.setData(emaData);
    } else if (emaSeries) {
        chart.removeSeries(emaSeries);
        emaSeries = null;
    }

    // Handle RSI
    if (activeIndicators.value.includes('RSI')) {
        if (!rsiSeries) {
            rsiSeries = chart.addSeries(LineSeries, {
                color: '#E91E63',
                lineWidth: 2,
                priceScaleId: 'rsi',
                title: 'RSI 14',
            });
            
            chart.priceScale('rsi').applyOptions({
                autoScale: true,
                scaleMargins: { top: 0.75, bottom: 0 },
            });
        }
        const rsiData = calculateRSI(candlestick, 14);
        rsiSeries.setData(rsiData);
    } else if (rsiSeries) {
        chart.removeSeries(rsiSeries);
        rsiSeries = null;
    }

    // Handle BOLL
    if (activeIndicators.value.includes('BOLL')) {
        if (!bbUpperSeries || !bbMiddleSeries || !bbLowerSeries) {
            bbUpperSeries = chart.addSeries(LineSeries, { color: 'rgba(240, 185, 11, 0.4)', lineWidth: 1, title: 'BB Upper' });
            bbMiddleSeries = chart.addSeries(LineSeries, { color: 'rgba(240, 185, 11, 0.6)', lineWidth: 1, title: 'BB Middle' });
            bbLowerSeries = chart.addSeries(LineSeries, { color: 'rgba(240, 185, 11, 0.4)', lineWidth: 1, title: 'BB Lower' });
        }
        const { upper, middle, lower } = calculateBollingerBands(candlestick, 20);
        bbUpperSeries.setData(upper);
        bbMiddleSeries.setData(middle);
        bbLowerSeries.setData(lower);
    } else {
        if (bbUpperSeries) { chart.removeSeries(bbUpperSeries); bbUpperSeries = null; }
        if (bbMiddleSeries) { chart.removeSeries(bbMiddleSeries); bbMiddleSeries = null; }
        if (bbLowerSeries) { chart.removeSeries(bbLowerSeries); bbLowerSeries = null; }
    }
};

const fetchKlines = async (symbol: string, interval: string) => {
    const binanceInterval = interval === '1s' ? '1s' : interval.toLowerCase();
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=500`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        const candlestick: CandlestickData[] = [];
        const volume: any[] = [];
        
        data.forEach((d: any) => {
            const time = (d[0] / 1000) as Time;
            const open = parseFloat(d[1]);
            const high = parseFloat(d[2]);
            const low = parseFloat(d[3]);
            const close = parseFloat(d[4]);
            const vol = parseFloat(d[5]);
            
            candlestick.push({ time, open, high, low, close });
            volume.push({
                time,
                value: vol,
                color: close >= open ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)'
            });
        });
        
        return { candlestick, volume };
    } catch (error) {
        console.error('Error fetching klines:', error);
        return { candlestick: [], volume: [] };
    }
};

const initChart = async () => {
    if (!chartContainer.value) return;

    // Clean up existing chart if re-initializing
    if (chart) {
        chart.remove();
        chart = null;
        candleSeries = null;
        lineSeries = null;
        volumeSeries = null;
        emaSeries = null;
        rsiSeries = null;
        bbUpperSeries = null;
        bbMiddleSeries = null;
        bbLowerSeries = null;
    }

    chart = createChart(chartContainer.value, {
        width: chartContainer.value.clientWidth,
        height: chartContainer.value.clientHeight,
        layout: {
            background: { color: '#0b0e11' },
            textColor: '#848e9c',
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
        },
        grid: {
            vertLines: { color: 'rgba(43, 49, 57, 0.2)' },
            horzLines: { color: 'rgba(43, 49, 57, 0.2)' },
        },
        crosshair: {
            mode: 0,
            vertLine: { width: 1, color: 'rgba(132, 142, 156, 0.5)', style: 3 },
            horzLine: { width: 1, color: 'rgba(132, 142, 156, 0.5)', style: 3 },
        },
        timeScale: {
            borderColor: 'rgba(43, 49, 57, 0.5)',
            timeVisible: true,
            rightOffset: 10,
            barSpacing: 8,
        },
        rightPriceScale: {
            borderColor: 'rgba(43, 49, 57, 0.5)',
            autoScale: true,
        },
    });

    candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#0ecb81',
        downColor: '#f6465d',
        borderVisible: false,
        wickUpColor: '#0ecb81',
        wickDownColor: '#f6465d',
    });

    candleSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.3 },
    });

    lineSeries = chart.addSeries(LineSeries, {
        color: '#F0B90B',
        lineWidth: 2,
        visible: false,
    });

    lineSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.3 },
    });

    volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', 
    });

    volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
    });

    await updateChartData();
    subscribeKline(props.symbol, props.interval);

    chart.subscribeCrosshairMove((param) => {
        if (param.time && candleSeries && volumeSeries) {
            const data = param.seriesData.get(candleSeries) as CandlestickData;
            const vol = param.seriesData.get(volumeSeries) as { value: number };
            if (data) {
                lastPriceData.value = {
                    open: data.open,
                    high: data.high,
                    low: data.low,
                    close: data.close,
                    volume: vol?.value || 0,
                    isUp: data.close >= data.open
                };
            }

            // Handle Footprint Hover
            if (showFootprint.value && param.point) {
                const fp = footprintDataMap.value.get(param.time as number);
                if (fp) {
                    const price = candleSeries.coordinateToPrice(param.point.y);
                    if (price) {
                        const tickSize = footprintSettings.value.tickSize;
                        const targetPrice = Math.round(price / tickSize) * tickSize;
                        const cell = fp.cells.find((c: any) => Math.abs(c.price - targetPrice) < tickSize / 2);
                        if (cell) {
                            hoveredCell.value = { ...cell, time: param.time, delta: cell.askVolume - cell.bidVolume };
                            tooltipPosition.value = { x: param.point.x, y: param.point.y };
                        } else {
                            hoveredCell.value = null;
                        }
                    }
                }
            } else {
                hoveredCell.value = null;
            }
        } else {
            hoveredCell.value = null;
        }
    });

    chart.subscribeClick((param) => {
        if (!param.point || !candleSeries) return;
        const price = candleSeries.coordinateToPrice(param.point.y);
        if (price) {
            if (activeTool.value === 'hline') {
                addHorizontalLine(price);
            } else if (activeTool.value === 'fib') {
                handleFibClick(price, param.time);
            } else if (activeTool.value === 'trend') {
                handleTrendClick(price, param.time);
            } else if (activeTool.value === 'alert') {
                createAlert(price);
                setGlobalTool('none');
            } else {
                selectedPrice.value = parseFloat(price.toFixed(2));
            }
        }
    });

    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
        renderHeatmap();
    });

    const handleMouseDown = (e: MouseEvent) => {
        if (!isRiskModeActive.value || !candleSeries || !chart || !chartContainer.value) return;
        
        const rect = chartContainer.value.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        // If SL price is null, set it on first click
        if (sharedSlPrice.value === null) {
            const initialPrice = candleSeries.coordinateToPrice(y);
            if (initialPrice) {
                sharedSlPrice.value = parseFloat(initialPrice.toFixed(2));
            }
            return;
        }

        // Check if we are near the SL line
        const slCoord = candleSeries.priceToCoordinate(sharedSlPrice.value);
        if (slCoord !== null && Math.abs(y - slCoord) < 15) {
            isDraggingSl = true;
            chart.applyOptions({ handleScroll: { mouseWheel: false, pressedMouseMove: false }, handleScale: { mouseWheel: false, pinch: false } });
            
            const onMouseMove = (moveEvent: MouseEvent) => {
                const moveY = moveEvent.clientY - rect.top;
                const newPrice = candleSeries!.coordinateToPrice(moveY);
                if (newPrice) {
                    sharedSlPrice.value = parseFloat(newPrice.toFixed(2));
                }
            };
            
            const onMouseUp = () => {
                isDraggingSl = false;
                chart?.applyOptions({ handleScroll: { mouseWheel: true, pressedMouseMove: true }, handleScale: { mouseWheel: true, pinch: true } });
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            e.stopPropagation();
        }
    };

    chartContainer.value.addEventListener('mousedown', handleMouseDown);

    watch([isRiskModeActive, sharedSlPrice], ([active, price]) => {
        if (!candleSeries) return;
        
        if (riskSlLine) {
            candleSeries.removePriceLine(riskSlLine);
            riskSlLine = null;
        }

        if (active && price) {
            riskSlLine = candleSeries.createPriceLine({
                price: price,
                color: '#f6465d',
                lineWidth: 2,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
                title: 'RISK SL',
            });
        }
    }, { immediate: true });

    onUnmounted(() => {
        if (chartContainer.value) {
            chartContainer.value.removeEventListener('mousedown', handleMouseDown);
        }
    });
};

const handleKeyDown = (e: KeyboardEvent) => {
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
    
    const key = e.key.toLowerCase();
    if (key === 'v') setGlobalTool('none');
    if (key === 'h') setGlobalTool('hline');
    if (key === 'f') setGlobalTool('fib');
    if (key === 't') setGlobalTool('trend');
    if (key === 'a') setGlobalTool('alert');
};

const handleFibClick = (price: number, time: any) => {
    if (!fibStart.value) {
        fibStart.value = { price, time };
    } else {
        const id = Math.random().toString(36).substring(7);
        const draw = { 
            id, 
            type: 'fib' as const, 
            points: [fibStart.value, { price, time }] 
        };
        drawings.value.push(draw);
        
        if (props.panelId) {
            const panel = workspacePanels.value.find(p => p.id === props.panelId);
            if (panel) {
                panel.drawings = [...(panel.drawings || []), draw];
            }
        }
        
        fibStart.value = null; 
        setGlobalTool('none'); 
        renderDrawings();
    }
};

const handleTrendClick = (price: number, time: any) => {
    if (!trendStart.value) {
        trendStart.value = { price, time };
    } else {
        const id = Math.random().toString(36).substring(7);
        const draw = { 
            id, 
            type: 'trend' as const, 
            points: [trendStart.value, { price, time }] 
        };
        drawings.value.push(draw);
        
        if (props.panelId) {
            const panel = workspacePanels.value.find(p => p.id === props.panelId);
            if (panel) {
                panel.drawings = [...(panel.drawings || []), draw];
            }
        }
        
        trendStart.value = null; 
        setGlobalTool('none'); 
        renderDrawings();
    }
};

const addHorizontalLine = (price: number) => {
    const id = Math.random().toString(36).substring(7);
    const draw = { type: 'hline' as const, price, id };
    drawings.value.push(draw);
    
    if (props.panelId) {
        const panel = workspacePanels.value.find(p => p.id === props.panelId);
        if (panel) {
            panel.drawings = [...(panel.drawings || []), draw];
        }
    }
    renderDrawings();
};

const renderDrawings = () => {
    if (!candleSeries) return;
    
    // Clear existing
    drawingPriceLines.forEach(line => candleSeries?.removePriceLine(line));
    drawingPriceLines = [];

    // Render hlines and fib levels
    drawings.value.forEach(draw => {
        if (draw.type === 'hline') {
            const line = candleSeries?.createPriceLine({
                price: draw.price,
                color: 'rgba(240, 185, 11, 0.5)',
                lineWidth: 1,
                lineStyle: 0,
                axisLabelVisible: true,
                title: 'Level',
            });
            if (line) drawingPriceLines.push(line);
        } else if (draw.type === 'fib' && draw.points) {
            const start = draw.points[0].price;
            const end = draw.points[1].price;
            const diff = end - start;
            const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
            const colors = ['#f6465d', '#848e9c', '#848e9c', '#0ecb81', '#848e9c', '#848e9c', '#0ecb81'];

            levels.forEach((lvl, idx) => {
                const price = start + (diff * lvl);
                const line = candleSeries?.createPriceLine({
                    price: price,
                    color: colors[idx] || 'rgba(132, 142, 156, 0.3)',
                    lineWidth: 1,
                    lineStyle: lvl === 0 || lvl === 1 ? 0 : 2,
                    axisLabelVisible: true,
                    title: `Fib ${lvl}`,
                });
                if (line) drawingPriceLines.push(line);
            });
        }
    });

    // Render alerts from store
    alerts.value.filter(a => !a.triggered).forEach(alert => {
        const line = candleSeries?.createPriceLine({
            price: alert.price,
            color: '#fcd535',
            lineWidth: 1,
            lineStyle: 3, // Dotted
            axisLabelVisible: true,
            title: 'Alert',
        });
        if (line) drawingPriceLines.push(line);
    });
    renderHeatmap();
};

const renderHeatmap = () => {
    const canvas = document.getElementById(`heatmap-${props.panelId}`) as HTMLCanvasElement;
    if (!canvas || !chart || !candleSeries) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const container = canvas.parentElement;
    if (container && (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight)) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Render Heatmap (Liquidity)
    const maxVol = Math.max(...heatmapData.value.map(d => d.volume), 1);
    heatmapData.value.forEach(d => {
        const y = candleSeries?.priceToCoordinate(d.price);
        if (y === null || y < 0 || y > canvas.height) return;
        
        const intensity = d.volume / maxVol;
        ctx.fillStyle = d.price > currentPrice.value 
            ? `rgba(246, 70, 93, ${intensity * 0.12})`
            : `rgba(14, 203, 129, ${intensity * 0.12})`;
            
        ctx.fillRect(0, y - 1, canvas.width, 2);
    });

    // 1.5 Render Footprints if active
    if (showFootprint.value) {
        const logicalRange = chart.timeScale().getVisibleLogicalRange();
        if (logicalRange) {
            const startIdx = Math.max(0, Math.floor(logicalRange.from));
            const endIdx = Math.min(allCandles.value.length - 1, Math.ceil(logicalRange.to));
            
            // Calculate candle width to see if we should render footprint
            let candleWidth = 10;
            if (startIdx < endIdx && startIdx >= 0 && startIdx + 1 < allCandles.value.length) {
                const x1 = chart.timeScale().timeToCoordinate(allCandles.value[startIdx].time);
                const x2 = chart.timeScale().timeToCoordinate(allCandles.value[startIdx+1].time);
                if (x1 !== null && x2 !== null) {
                    candleWidth = Math.abs(x2 - x1);
                }
            } else {
                candleWidth = 50; // fallback if only 1 candle
            }
            
            if (candleWidth > 40) {
                ctx.font = '10px "JetBrains Mono"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                for (let i = startIdx; i <= endIdx; i++) {
                    const candle = allCandles.value[i];
                    if (!candle) continue;
                    const fp = footprintDataMap.value.get(candle.time as number);
                    const x = chart.timeScale().timeToCoordinate(candle.time);
                    if (!fp || x === null) continue;
                    
                    const cellHeight = 16;
                    const halfWidth = candleWidth / 2 - 2;
                    
                    fp.cells.forEach(cell => {
                        const y = candleSeries?.priceToCoordinate(cell.price);
                        if (y === null) return;
                        
                        // Background shading
                        if (footprintSettings.value.showShading) {
                            const intensity = cell.totalVolume / fp.maxVolume;
                            const isAskStronger = cell.askVolume > cell.bidVolume;
                            
                            ctx.fillStyle = isAskStronger 
                                ? `rgba(14, 203, 129, ${intensity * 0.5})`
                                : `rgba(246, 70, 93, ${intensity * 0.5})`;
                            ctx.fillRect(x - halfWidth, y - cellHeight/2, candleWidth - 4, cellHeight);
                        }
                        
                        // HVN Highlight
                        if (cell.price === fp.hvnPrice) {
                            ctx.strokeStyle = '#000000';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(x - halfWidth, y - cellHeight/2, candleWidth - 4, cellHeight);
                            ctx.strokeStyle = '#FFFFFF';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(x - halfWidth - 1, y - cellHeight/2 - 1, candleWidth - 2, cellHeight + 2);
                        }
                        
                        // Text: Bid
                        ctx.fillStyle = cell.isSellImbalance ? '#3b82f6' : '#EAECEF';
                        ctx.fillText(cell.bidVolume.toString(), x - halfWidth/2, y);
                        
                        // Text: Ask
                        ctx.fillStyle = cell.isBuyImbalance ? '#3b82f6' : '#EAECEF';
                        ctx.fillText(cell.askVolume.toString(), x + halfWidth/2, y);
                    });
                    
                    // Delta
                    if (fp.cells.length > 0) {
                        const lowestCellY = candleSeries?.priceToCoordinate(fp.cells[fp.cells.length - 1].price);
                        if (lowestCellY !== null) {
                            ctx.fillStyle = fp.delta > 0 ? '#0ecb81' : '#f6465d';
                            ctx.fillText(`Δ ${fp.delta}`, x, lowestCellY + cellHeight + 4);
                        }
                    }
                }
            } else {
                // If zoomed out, just show HVN outline or nothing
                for (let i = startIdx; i <= endIdx; i++) {
                    const candle = allCandles.value[i];
                    if (!candle) continue;
                    const fp = footprintDataMap.value.get(candle.time as number);
                    const x = chart.timeScale().timeToCoordinate(candle.time);
                    if (!fp || x === null) continue;
                    
                    const cellHeight = 4;
                    const y = candleSeries?.priceToCoordinate(fp.hvnPrice);
                    if (y !== null && candleWidth > 5) {
                        ctx.fillStyle = '#F0B90B';
                        ctx.fillRect(x - candleWidth/2 + 1, y - cellHeight/2, candleWidth - 2, cellHeight);
                    }
                }
            }
        }
    }

    // 2. Render Drawings (Trends & Fib Diagonals)
    ctx.lineWidth = 1.5;
    drawings.value.forEach(draw => {
        if ((draw.type === 'fib' || draw.type === 'trend') && draw.points && draw.points.length === 2) {
            const p1 = draw.points[0];
            const p2 = draw.points[1];
            
            const x1 = chart?.timeScale().timeToCoordinate(p1.time);
            const y1 = candleSeries?.priceToCoordinate(p1.price);
            const x2 = chart?.timeScale().timeToCoordinate(p2.time);
            const y2 = candleSeries?.priceToCoordinate(p2.price);
            
            if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                ctx.beginPath();
                ctx.setLineDash(draw.type === 'fib' ? [5, 5] : []);
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = draw.type === 'fib' ? 'rgba(240, 185, 11, 0.4)' : '#F0B90B';
                ctx.stroke();
                ctx.setLineDash([]);
                
                // End circles
                ctx.fillStyle = '#F0B90B';
                ctx.beginPath(); ctx.arc(x1, y1, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(x2, y2, 2, 0, Math.PI * 2); ctx.fill();
            }
        }
    });
};

// Sync alerts
watch(alerts, () => renderDrawings(), { deep: true });

const clearDrawings = () => {
    drawings.value = [];
    if (props.panelId) {
        const panel = workspacePanels.value.find(p => p.id === props.panelId);
        if (panel) panel.drawings = [];
    }
    renderDrawings();
};

const updateChartData = async () => {
    if (!candleSeries || !volumeSeries || !lineSeries) return;
    const data = await fetchKlines(props.symbol, props.interval);
    allCandles.value = data.candlestick;
    candleSeries.setData(data.candlestick);
    volumeSeries.setData(data.volume);
    lineSeries.setData(data.candlestick.map(d => ({ time: d.time, value: d.close })));
    updateIndicators(data.candlestick);
    
    footprintDataMap.value.clear();
    data.candlestick.forEach((c, idx) => {
        footprintDataMap.value.set(c.time as number, generateMockFootprint(c, data.volume[idx].value));
    });

    if (chart) chart.timeScale().fitContent();
};

const toggleIndicator = (type: string) => {
    const index = activeIndicators.value.indexOf(type);
    if (index === -1) {
        activeIndicators.value.push(type);
    } else {
        activeIndicators.value.splice(index, 1);
    }
    initChart(); // Re-init to apply pane changes if needed
};

let currentWs: WebSocket | null = null;

const subscribeKline = (symbol: string, interval: string) => {
    if (currentWs) currentWs.close();
    const binanceInterval = interval.toLowerCase();
    const lowSymbol = symbol.toLowerCase();
    currentWs = new WebSocket(`wss://stream.binance.com:9443/ws/${lowSymbol}@kline_${binanceInterval}`);
    
    currentWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const k = data.k;
        if (!k) return;

        const update = {
            time: (k.t / 1000) as Time,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c)
        };

        if (candleSeries) candleSeries.update(update);
        if (lineSeries) lineSeries.update({ time: update.time, value: update.close });
        if (volumeSeries) {
            volumeSeries.update({
                time: update.time,
                value: parseFloat(k.v),
                color: update.close >= update.open ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)'
            });
        }

        lastPriceData.value = {
            ...update,
            volume: parseFloat(k.v),
            isUp: update.close >= update.open
        };

        // Update indicators in real-time
        const lastIdx = allCandles.value.findIndex(c => c.time === update.time);
        if (lastIdx !== -1) {
            allCandles.value[lastIdx] = update;
        } else {
            allCandles.value.push(update);
            if (allCandles.value.length > 1000) allCandles.value.shift();
        }
        updateIndicators(allCandles.value);
        
        // Mock footprint update
        footprintDataMap.value.set(update.time as number, generateMockFootprint(update, parseFloat(k.v)));
        
        renderHeatmap();
    };
};



const updateLiquidity = () => {
    if (currentPrice.value === 0) return;
    const base = Math.round(currentPrice.value / 10) * 10;
    const newData = [];
    for (let i = -40; i <= 40; i++) {
        const p = base + i * 5;
        const vol = Math.random() > 0.85 ? Math.random() * 100 : Math.random() * 5;
        newData.push({ price: p, volume: vol });
    }
    heatmapData.value = newData;
};

let resizeObserver: ResizeObserver | null = null;

watch(currentPrice, () => {
    if (Math.random() > 0.95 || heatmapData.value.length === 0) updateLiquidity();
});

onMounted(() => {
    // Load drawings from store
    if (props.panelId) {
        const panel = workspacePanels.value.find(p => p.id === props.panelId);
        if (panel && panel.drawings) {
            drawings.value = [...panel.drawings];
        }
    }
    
    initChart();

    if (chartContainer.value) {
        resizeObserver = new ResizeObserver((entries) => {
            if (chart && entries[0].contentRect) {
                chart.applyOptions({
                    width: entries[0].contentRect.width,
                    height: entries[0].contentRect.height
                });
                renderHeatmap();
            }
        });
        resizeObserver.observe(chartContainer.value);
    }

    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    if (currentWs) currentWs.close();
    if (resizeObserver) resizeObserver.disconnect();
    window.removeEventListener('keydown', handleKeyDown);
    if (chart) chart.remove();
});

watch(() => props.symbol, (newSymbol) => {
    updateChartData();
    subscribeKline(newSymbol, props.interval);
});

watch(() => props.interval, (newInterval) => {
    updateChartData();
    subscribeKline(props.symbol, newInterval);
});

watch(globalSymbol, (newSymbol) => {
    if (props.isSynced && newSymbol !== props.symbol) {
        emit('update:symbol', newSymbol);
    }
});

watch(activePositions, (positions) => {
    if (!candleSeries) return;
    positionLines.forEach(line => candleSeries?.removePriceLine(line));
    positionLines = [];

    positions.filter(p => p.pair === props.symbol).forEach(pos => {
        // Entry Line
        const line = candleSeries?.createPriceLine({
            price: pos.entry,
            color: pos.type === 'LONG' ? '#0ecb81' : '#f6465d',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: `${pos.type} ${pos.size}`,
        });
        if (line) positionLines.push(line);

        // TP Line
        if (pos.tp) {
            const tpLine = candleSeries?.createPriceLine({
                price: pos.tp,
                color: '#0ecb81',
                lineWidth: 1,
                lineStyle: 1, // Dotted
                axisLabelVisible: true,
                title: `TP ${pos.id.substring(0,4)}`,
            });
            if (tpLine) positionLines.push(tpLine);
        }

        // SL Line
        if (pos.sl) {
            const slLine = candleSeries?.createPriceLine({
                price: pos.sl,
                color: '#f6465d',
                lineWidth: 1,
                lineStyle: 1, // Dotted
                axisLabelVisible: true,
                title: `SL ${pos.id.substring(0,4)}`,
            });
            if (slLine) positionLines.push(slLine);
        }
    });
}, { immediate: true, deep: true });

watch(chartType, (val) => {
    if (candleSeries && lineSeries) {
        candleSeries.applyOptions({ visible: val === 'candle' });
        lineSeries.applyOptions({ visible: val === 'line' });
    }
});

watch(showVolume, (val) => {
    if (volumeSeries) volumeSeries.applyOptions({ visible: val });
});
</script>


<template>
  <div class="flex flex-col h-full bg-[#0b0e11] text-[#EAECEF] overflow-hidden select-none border border-[#2b3139]/50 hover:border-[#F0B90B]/30 transition-colors rounded-xl m-1 shadow-2xl relative">
    
    <!-- Footprint Tooltip Overlay -->
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

    <!-- Footprint Settings Panel -->
    <div v-if="showFootprintSettings" 
         class="absolute top-12 right-4 z-40 bg-[#161a1e] border border-white/10 p-4 rounded-xl shadow-2xl w-64 animate-in fade-in slide-in-from-top-2">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-xs font-bold text-[#F0B90B] uppercase tracking-wider">Footprint Settings</h3>
            <button @click="showFootprintSettings = false" class="text-[#848e9c] hover:text-white">
                <X class="w-4 h-4" />
            </button>
        </div>
        
        <div class="space-y-4">
            <div class="space-y-1.5">
                <div class="flex justify-between text-[10px]">
                    <span class="text-[#848e9c]">Tick Size</span>
                    <span class="text-[#F0B90B] font-mono">{{ footprintSettings.tickSize }}</span>
                </div>
                <input type="range" min="1" max="50" step="1" v-model.number="footprintSettings.tickSize" class="w-full accent-[#F0B90B]">
            </div>

            <div class="space-y-1.5">
                <div class="flex justify-between text-[10px]">
                    <span class="text-[#848e9c]">Imbalance Ratio</span>
                    <span class="text-[#F0B90B] font-mono">{{ footprintSettings.imbalanceRatio }}x</span>
                </div>
                <input type="range" min="1.5" max="10" step="0.5" v-model.number="footprintSettings.imbalanceRatio" class="w-full accent-[#F0B90B]">
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-white/5">
                <span class="text-[10px] text-[#848e9c]">Show Shading</span>
                <button @click="footprintSettings.showShading = !footprintSettings.showShading" 
                        :class="cn('w-8 h-4 rounded-full transition-all relative', footprintSettings.showShading ? 'bg-[#F0B90B]' : 'bg-[#2b3139]')">
                    <div :class="cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', footprintSettings.showShading ? 'left-4.5' : 'left-0.5')"></div>
                </button>
            </div>
        </div>
    </div>

    <!-- Drawing Toolbar (Floating Sidebar) -->
    <div class="absolute left-1 md:left-3 top-16 md:top-20 z-20 flex flex-col gap-1 bg-[#161a1e]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl transform scale-[0.8] md:scale-100 origin-top-left">
        <button 
            @click="setGlobalTool('none')"
            :class="cn('p-2 rounded-lg transition-all', activeTool === 'none' ? 'bg-[#F0B90B] text-[#0b0e11]' : 'text-[#848e9c] hover:bg-white/5')"
            title="Select (V)"
        >
            <MousePointer2 class="w-4 h-4" />
        </button>
        <button 
            @click="setGlobalTool('hline')"
            :class="cn('p-2 rounded-lg transition-all', activeTool === 'hline' ? 'bg-[#F0B90B] text-[#0b0e11]' : 'text-[#848e9c] hover:bg-white/5')"
            title="Horizontal Line (H)"
        >
            <Minus class="w-4 h-4" />
        </button>
        <button 
            @click="setGlobalTool('fib')"
            :class="cn('p-2 rounded-lg transition-all', activeTool === 'fib' ? 'bg-[#F0B90B] text-[#0b0e11]' : 'text-[#848e9c] hover:bg-white/5')"
            title="Fibonacci Retracement (F)"
        >
            <GripHorizontal class="w-4 h-4" />
        </button>
        <button 
            @click="setGlobalTool('trend')"
            :class="cn('p-2 rounded-lg transition-all', activeTool === 'trend' ? 'bg-[#F0B90B] text-[#0b0e11]' : 'text-[#848e9c] hover:bg-white/5')"
            title="Trendline (T)"
        >
            <PenTool class="w-4 h-4" />
        </button>
        <button 
            @click="setGlobalTool('alert')"
            :class="cn('p-2 rounded-lg transition-all', activeTool === 'alert' ? 'bg-[#fcd535] text-[#0b0e11]' : 'text-[#848e9c] hover:bg-white/5')"
            title="Price Alert (A)"
        >
            <Bell class="w-4 h-4" />
        </button>
        <div class="h-px bg-white/10 my-1"></div>
        <button 
            @click="clearDrawings"
            class="p-2 rounded-lg text-[#f6465d] hover:bg-[#f6465d]/10 transition-all"
            title="Clear All Drawings"
        >
            <Trash2 class="w-4 h-4" />
        </button>
    </div>

    <!-- Top Toolbar -->
    <div class="flex items-center justify-between px-3 py-1.5 border-b border-[#2b3139] bg-[#161a1e]">
      <div class="flex items-center gap-1 min-w-0 overflow-hidden">
        <div class="flex items-center gap-1.5 mr-2 border-r border-[#2b3139] pr-3 flex-shrink-0">
            <input 
                :value="symbol" 
                @change="e => emit('update:symbol', (e.target as HTMLInputElement).value.toUpperCase())"
                class="bg-transparent border-none outline-none text-sm font-black tracking-tighter text-[#F0B90B] w-20 uppercase focus:ring-0"
            />
            <span class="text-[9px] font-bold px-1 py-0.5 rounded bg-[#2b3139] text-[#848e9c]">Perp</span>
        </div>
        
        <div class="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
            <button 
                v-for="int in intervals" 
                :key="int"
                @click="emit('update:interval', int)"
                :class="cn(
                    'px-2 py-0.5 text-[10px] font-bold rounded transition-colors whitespace-nowrap',
                    interval === int ? 'text-[#F0B90B] bg-[#2b3139]' : 'text-[#848e9c] hover:text-[#EAECEF]'
                )"
            >
                {{ int }}
            </button>
        </div>

        <!-- Indicators Toggle -->
        <div class="flex items-center gap-1 border-l border-white/10 pl-2 ml-1">
            <button 
                @click="() => { showFootprint = !showFootprint; renderHeatmap(); }"
                :class="cn(
                    'px-1.5 py-0.5 rounded-l text-[9px] font-bold transition-all',
                    showFootprint ? 'bg-[#9C27B0]/20 text-[#9C27B0]' : 'text-[#848e9c] hover:bg-[#2b3139]'
                )"
            >FP</button>
            <button 
                @click="showFootprintSettings = !showFootprintSettings"
                :class="cn(
                    'px-1 py-0.5 rounded-r border-l border-white/10 text-[9px] font-bold transition-all',
                    showFootprintSettings ? 'bg-[#9C27B0]/20 text-[#9C27B0]' : 'text-[#848e9c] hover:bg-[#2b3139]'
                )"
            >
                <Settings2 class="w-3 h-3" />
            </button>
            <button 
                @click="toggleIndicator('EMA')"
                :class="cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-bold transition-all',
                    activeIndicators.includes('EMA') ? 'bg-[#2962FF]/20 text-[#2962FF]' : 'text-[#848e9c] hover:bg-[#2b3139]'
                )"
            >EMA</button>
            <button 
                @click="toggleIndicator('RSI')"
                :class="cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-bold transition-all',
                    activeIndicators.includes('RSI') ? 'bg-[#E91E63]/20 text-[#E91E63]' : 'text-[#848e9c] hover:bg-[#2b3139]'
                )"
            >RSI</button>
            <button 
                @click="toggleIndicator('BOLL')"
                :class="cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-bold transition-all',
                    activeIndicators.includes('BOLL') ? 'bg-[#F0B90B]/20 text-[#F0B90B]' : 'text-[#848e9c] hover:bg-[#2b3139]'
                )"
            >BOLL</button>
        </div>
      </div>
      
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <button 
            @click="emit('update:isSynced', !isSynced)"
            :class="cn(
                'p-1.5 rounded-md transition-all',
                isSynced ? 'text-[#F0B90B] bg-[#2b3139]' : 'text-[#848e9c] hover:bg-[#2b3139]/50'
            )"
            title="Sync Symbol"
        >
            <component :is="isSynced ? Link2 : Link2Off" class="w-3.5 h-3.5" />
        </button>

        <div class="flex items-center bg-[#2b3139] rounded-lg p-0.5 hidden sm:flex">
            <button 
                @click="chartType = 'candle'"
                :class="cn('p-1.5 rounded-md transition-all', chartType === 'candle' ? 'bg-[#1e2329] text-[#F0B90B]' : 'text-[#848e9c]')"
            >
                <CandlestickChart class="w-3.5 h-3.5" />
            </button>
            <button 
                @click="chartType = 'line'"
                :class="cn('p-1.5 rounded-md transition-all', chartType === 'line' ? 'bg-[#1e2329] text-[#F0B90B]' : 'text-[#848e9c]')"
            >
                <LineChartIcon class="w-3.5 h-3.5" />
            </button>
        </div>
        
        <button @click="showVolume = !showVolume" :class="cn('p-1.5 rounded-md transition-colors', showVolume ? 'text-[#F0B90B]' : 'text-[#848e9c]')">
            <BarChart3 class="w-3.5 h-3.5" />
        </button>
        
        <button 
            v-if="panelId"
            @click="emit('remove')"
            class="p-1.5 text-[#848e9c] hover:text-[#f6465d] transition-colors"
        >
            <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- OHLC Legend Overlay -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1 text-[9px] font-mono border-b border-[#2b3139]/30 bg-[#0b0e11]/50 backdrop-blur-md">
        <div class="flex items-center gap-1">
            <span class="text-[#848e9c]">O</span>
            <span :class="lastPriceData.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ lastPriceData.open.toFixed(1) }}</span>
        </div>
        <div class="flex items-center gap-1">
            <span class="text-[#848e9c]">H</span>
            <span :class="lastPriceData.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ lastPriceData.high.toFixed(1) }}</span>
        </div>
        <div class="flex items-center gap-1">
            <span class="text-[#848e9c]">L</span>
            <span :class="lastPriceData.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ lastPriceData.low.toFixed(1) }}</span>
        </div>
        <div class="flex items-center gap-1">
            <span class="text-[#848e9c]">C</span>
            <span :class="lastPriceData.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ lastPriceData.close.toFixed(1) }}</span>
        </div>
        <div class="flex items-center gap-1 text-[#0ecb81] ml-auto">
            <div class="w-1 h-1 rounded-full bg-[#0ecb81] animate-pulse"></div>
            <span>LIVE</span>
        </div>
    </div>

    <!-- Chart Container -->
    <div class="flex-1 relative min-h-0">
      <div ref="chartContainer" class="w-full h-full"></div>
      
      <!-- Heatmap Canvas -->
      <canvas 
        :id="`heatmap-${panelId}`" 
        class="absolute inset-0 z-0 pointer-events-none opacity-60"
      ></canvas>
      
      <!-- Watermark -->
      <div class="absolute bottom-4 right-4 pointer-events-none opacity-[0.03] select-none text-right">
          <h1 class="text-3xl font-black italic tracking-tighter">{{ symbol }}</h1>
          <p class="text-[10px] font-bold">TRADEX TERMINAL</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.tv-lightweight-charts) {
    z-index: 10;
}
</style>




