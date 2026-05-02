<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { activePositions, selectedPrice } from '../store/tradeStore';
import { globalSymbol } from '../store/workspaceStore';
import { Maximize2, BarChart3, TrendingUp as LineChartIcon, CandlestickChart, Settings2, X, Link2, Link2Off } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries, LineSeries, HistogramSeries, IPriceLine } from 'lightweight-charts';

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
let lineSeries: ISeriesApi<"Line"> | null = null;
let volumeSeries: ISeriesApi<"Histogram"> | null = null;
let positionLines: IPriceLine[] = [];

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

    chart = createChart(chartContainer.value, {
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

    lineSeries = chart.addSeries(LineSeries, {
        color: '#F0B90B',
        lineWidth: 2,
        visible: false,
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
        }
    });

    chart.subscribeClick((param) => {
        if (!param.point || !candleSeries) return;
        const price = candleSeries.coordinateToPrice(param.point.y);
        if (price) {
            selectedPrice.value = parseFloat(price.toFixed(2));
        }
    });
};

const updateChartData = async () => {
    if (!candleSeries || !volumeSeries || !lineSeries) return;
    const data = await fetchKlines(props.symbol, props.interval);
    candleSeries.setData(data.candlestick);
    volumeSeries.setData(data.volume);
    lineSeries.setData(data.candlestick.map(d => ({ time: d.time, value: d.close })));
    if (chart) chart.timeScale().fitContent();
};

const handleResize = () => {
    if (chart && chartContainer.value) {
        chart.applyOptions({
            width: chartContainer.value.clientWidth,
            height: chartContainer.value.clientHeight
        });
    }
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
    };
};

onMounted(() => {
    initChart();
    window.addEventListener('resize', handleResize);
    subscribeKline(props.symbol, props.interval);
});

onUnmounted(() => {
    if (currentWs) currentWs.close();
    window.removeEventListener('resize', handleResize);
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
        const line = candleSeries?.createPriceLine({
            price: pos.entry,
            color: pos.type === 'LONG' ? '#0ecb81' : '#f6465d',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: `${pos.type} ${pos.size}`,
        });
        if (line) positionLines.push(line);
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
  <div class="flex flex-col h-full bg-[#0b0e11] text-[#EAECEF] overflow-hidden select-none border border-[#2b3139]/50 hover:border-[#F0B90B]/30 transition-colors rounded-xl m-1 shadow-2xl">
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




