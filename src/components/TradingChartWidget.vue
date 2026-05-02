<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { currentPrice, previousPrice, activePositions, selectedPrice } from '../store/tradeStore';
import { Maximize2, Camera, Settings2, BarChart3, TrendingUp as LineChartIcon, CandlestickChart, Info, Map as MapIcon } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, Time, CandlestickSeries, LineSeries, HistogramSeries, IPriceLine } from 'lightweight-charts';

const chartContainer = ref<HTMLDivElement | null>(null);
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<"Candlestick"> | null = null;
let lineSeries: ISeriesApi<"Line"> | null = null;
let volumeSeries: ISeriesApi<"Histogram"> | null = null;
let positionLines: IPriceLine[] = [];

const selectedInterval = ref('1D');
const chartType = ref<'candle' | 'line'>('candle');
const showVolume = ref(true);
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

const fetchKlines = async (interval: string) => {
    const symbol = 'BTCUSDT';
    // Map internal interval to Binance interval
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
        return generateMockData(interval);
    }
};

const generateMockData = (interval: string) => {
    const data: CandlestickData[] = [];
    const volumeData: any[] = [];
    let price = 65000 + Math.random() * 5000;
    let time = (Math.floor(Date.now() / 1000) - 300 * 24 * 60 * 60) as Time;
    const step = 24 * 60 * 60; // 1 day in seconds

    for (let i = 0; i < 300; i++) {
        const open = price;
        const change = (Math.random() - 0.5) * price * 0.02;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * price * 0.01;
        const low = Math.min(open, close) - Math.random() * price * 0.01;
        const volume = Math.random() * 1000 + 200;

        data.push({ time, open, high, low, close });
        volumeData.push({ 
            time, 
            value: volume, 
            color: close >= open ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)' 
        });

        price = close;
        time = (Number(time) + step) as Time;
    }
    return { candlestick: data, volume: volumeData };
};

const initChart = async () => {
    if (!chartContainer.value) return;

    chart = createChart(chartContainer.value, {
        layout: {
            background: { color: '#0b0e11' },
            textColor: '#848e9c',
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
        },
        grid: {
            vertLines: { color: 'rgba(43, 49, 57, 0.5)' },
            horzLines: { color: 'rgba(43, 49, 57, 0.5)' },
        },
        crosshair: {
            mode: 0,
            vertLine: {
                width: 1,
                color: 'rgba(132, 142, 156, 0.5)',
                style: 3,
                labelBackgroundColor: '#1e2329',
            },
            horzLine: {
                width: 1,
                color: 'rgba(132, 142, 156, 0.5)',
                style: 3,
                labelBackgroundColor: '#1e2329',
            },
        },
        timeScale: {
            borderColor: 'rgba(43, 49, 57, 0.5)',
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 15,
            barSpacing: 8,
            minBarSpacing: 4,
        },
        handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
        },
        handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
        },
        rightPriceScale: {
            borderColor: 'rgba(43, 49, 57, 0.5)',
            autoScale: true,
            scaleMargins: {
                top: 0.1,
                bottom: 0.25,
            },
        },
    });

    candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#0ecb81',
        downColor: '#f6465d',
        borderVisible: false,
        wickUpColor: '#0ecb81',
        wickDownColor: '#f6465d',
    });

    lineSeries = chart.addSeries(LineSeries, {
        color: '#F0B90B',
        lineWidth: 2,
        visible: false,
    });

    volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // set as an overlay
    });

    volumeSeries.priceScale().applyOptions({
        scaleMargins: {
            top: 0.8,
            bottom: 0,
        },
    });

    const data = await fetchKlines(selectedInterval.value);
    candleSeries.setData(data.candlestick);
    volumeSeries.setData(data.volume);
    lineSeries.setData(data.candlestick.map(d => ({ time: d.time, value: d.close })));

    // Update legend on crosshair move
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
        } else if (data.candlestick.length > 0) {
            const lastData = data.candlestick[data.candlestick.length - 1];
            const lastVol = data.volume[data.volume.length - 1];
            lastPriceData.value = {
                open: lastData.open,
                high: lastData.high,
                low: lastData.low,
                close: lastData.close,
                volume: lastVol.value,
                isUp: lastData.close >= lastData.open
            };
        }
    });

    chart.timeScale().fitContent();

    // Subscribe to clicks for price selection
    chart.subscribeClick((param) => {
        if (!param.point || !candleSeries) return;
        const price = candleSeries.coordinateToPrice(param.point.y);
        if (price) {
            selectedPrice.value = parseFloat(price.toFixed(2));
        }
    });
};

const handleResize = () => {
    if (chart && chartContainer.value) {
        chart.applyOptions({
            width: chartContainer.value.clientWidth,
            height: chartContainer.value.clientHeight
        });
    }
};

onMounted(() => {
    initChart();
    window.addEventListener('resize', handleResize);

    // Real-time Binance Kline updates
    const subscribeKline = (interval: string) => {
        const binanceInterval = interval.toLowerCase();
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${binanceInterval}`);
        
        ws.onmessage = (event) => {
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
        };

        return ws;
    };

    let currentWs = subscribeKline(selectedInterval.value);

    watch(selectedInterval, async (newVal) => {
        if (currentWs) currentWs.close();
        const data = await fetchKlines(newVal);
        if (candleSeries) candleSeries.setData(data.candlestick);
        if (volumeSeries) volumeSeries.setData(data.volume);
        if (lineSeries) lineSeries.setData(data.candlestick.map(d => ({ time: d.time, value: d.close })));
        currentWs = subscribeKline(newVal);
    });

    onUnmounted(() => {
        if (currentWs) currentWs.close();
        window.removeEventListener('resize', handleResize);
        if (chart) chart.remove();
    });

    // Sync active positions to chart lines
    watch(activePositions, (positions) => {
        if (!candleSeries) return;
        
        // Remove old lines
        positionLines.forEach(line => candleSeries?.removePriceLine(line));
        positionLines = [];

        // Add new lines for each position
        positions.forEach(pos => {
            const line = candleSeries?.createPriceLine({
                price: pos.entry,
                color: pos.type === 'LONG' ? '#0ecb81' : '#f6465d',
                lineWidth: 1,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
                title: `${pos.type} ${pos.size} BTC`,
            });
            if (line) positionLines.push(line);
        });
    }, { immediate: true, deep: true });
});

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
  <div class="flex flex-col h-full bg-[#0b0e11] text-[#EAECEF] overflow-hidden select-none">
    <!-- Top Toolbar -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-[#2b3139] bg-[#161a1e]">
      <div class="flex items-center gap-1">
        <div class="flex items-center gap-1.5 mr-4 border-r border-[#2b3139] pr-4">
            <span class="text-sm font-black tracking-tighter text-[#F0B90B]">BTCUSDT</span>
            <span class="text-[10px] font-bold px-1 py-0.5 rounded bg-[#2b3139] text-[#848e9c]">Perp</span>
        </div>
        
        <div class="flex items-center gap-0.5 sm:gap-1">
            <button 
                v-for="int in intervals" 
                :key="int"
                @click="selectedInterval = int"
                :class="cn(
                    'px-2 py-1 text-[10px] sm:text-xs font-bold rounded transition-colors',
                    selectedInterval === int ? 'text-[#F0B90B] bg-[#2b3139]' : 'text-[#848e9c] hover:text-[#EAECEF]'
                )"
            >
                {{ int }}
            </button>
        </div>
      </div>
      
      <div class="flex items-center gap-2 sm:gap-3">
        <div class="flex items-center bg-[#2b3139] rounded-lg p-0.5">
            <button 
                @click="chartType = 'candle'"
                :class="cn('p-1.5 rounded-md transition-all', chartType === 'candle' ? 'bg-[#1e2329] text-[#F0B90B] shadow-sm' : 'text-[#848e9c]')"
            >
                <CandlestickChart class="w-3.5 h-3.5" />
            </button>
            <button 
                @click="chartType = 'line'"
                :class="cn('p-1.5 rounded-md transition-all', chartType === 'line' ? 'bg-[#1e2329] text-[#F0B90B] shadow-sm' : 'text-[#848e9c]')"
            >
                <LineChartIcon class="w-3.5 h-3.5" />
            </button>
        </div>
        <button @click="showVolume = !showVolume" :class="cn('p-2 rounded-lg transition-colors', showVolume ? 'text-[#F0B90B]' : 'text-[#848e9c]')">
            <BarChart3 class="w-4 h-4" />
        </button>
        <button class="p-2 text-[#848e9c] hover:text-[#EAECEF] transition-colors hidden sm:block">
            <Settings2 class="w-4 h-4" />
        </button>
        <button class="p-2 text-[#848e9c] hover:text-[#EAECEF] transition-colors">
            <Maximize2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- OHLC Legend Overlay -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-[10px] sm:text-[11px] font-mono border-b border-[#2b3139]/30 bg-[#0b0e11]/50 backdrop-blur-md">
        <div class="flex items-center gap-1.5">
            <span class="text-[#848e9c] font-bold">O:</span>
            <span :class="lastPriceData.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ lastPriceData.open.toFixed(2) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
            <span class="text-[#848e9c] font-bold">H:</span>
            <span :class="lastPriceData.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ lastPriceData.high.toFixed(2) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
            <span class="text-[#848e9c] font-bold">L:</span>
            <span :class="lastPriceData.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ lastPriceData.low.toFixed(2) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
            <span class="text-[#848e9c] font-bold">C:</span>
            <span :class="lastPriceData.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ lastPriceData.close.toFixed(2) }}</span>
        </div>
        <div class="flex items-center gap-1.5 hidden md:flex">
            <span class="text-[#848e9c] font-bold">V:</span>
            <span class="text-[#EAECEF]">{{ (lastPriceData.volume / 1000).toFixed(2) }}K</span>
        </div>
        <div class="flex items-center gap-1 text-[#0ecb81] font-bold ml-auto">
            <div class="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse"></div>
            <span>LIVE</span>
        </div>
    </div>

    <!-- Chart Container -->
    <div class="flex-1 relative min-h-0">
      <div ref="chartContainer" class="w-full h-full"></div>
      
      <!-- Watermark -->
      <div class="absolute bottom-6 left-6 pointer-events-none opacity-5 select-none">
          <h1 class="text-6xl font-black italic tracking-tighter">TRADEX PRO</h1>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.tv-lightweight-charts) {
    z-index: 10;
}
</style>




