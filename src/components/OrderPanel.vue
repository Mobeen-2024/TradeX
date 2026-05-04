<script setup lang="ts">
import { ChevronDown, Plus, Minus, ArrowUp, ArrowDown, Info, Edit2, X, Check, TrendingDown, CornerDownRight, Activity, Waypoints, GitCommit, Shield } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { placeOrder, activePositions, currentPrice, previousPrice, orderBook, selectedPrice, availableUsdt, availableBtc, sharedSlPrice, isRiskModeActive } from '../store/tradeStore';
import { useOrderExecution } from '../composables/useOrderExecution';

const { isPending, availableMargin, executeTrade: runTrade } = useOrderExecution();
const orderPrice = ref(75000.00);
const lastOrderPrice = ref(75000.00);
const orderAmount = ref<number | null>(null);
const orderSide = ref<'Buy' | 'Sell'>('Buy');
const priceChangeClass = ref('');
const isRiskMode = isRiskModeActive;
const riskPercentOfBalance = ref(1); // 1% default
const riskAmountAbsolute = ref(100); // $100 default

const currentTime = ref('');
let timer: any;
const riskInputMode = ref<'percent' | 'absolute'>('percent');

// Extra specific fields for complex types
const stopPrice = ref<number | null>(null);
const limitPrice = ref<number | null>(null);
const callbackRate = ref<number | null>(1.0);
const activationPrice = ref<number | null>(null);

const orderBookAsks = computed(() => {
  return orderBook.value.asks.slice(0, 15).map(a => ({ price: a[0], amount: a[1] }));
});
const orderBookBids = computed(() => {
  return orderBook.value.bids.slice(0, 15).map(b => ({ price: b[0], amount: b[1] }));
});

const maxOrderBookAmount = computed(() => {
  const maxAsk = Math.max(...orderBookAsks.value.map(a => a.amount), 0);
  const maxBid = Math.max(...orderBookBids.value.map(b => b.amount), 0);
  return Math.max(maxAsk, maxBid, 0.001);
});

const marketSentiment = computed(() => {
  const totalBids = orderBookBids.value.reduce((acc, b) => acc + b.amount, 0);
  const totalAsks = orderBookAsks.value.reduce((acc, a) => acc + a.amount, 0);
  if (totalBids + totalAsks === 0) return 50;
  return (totalBids / (totalBids + totalAsks)) * 100;
});

watch(currentPrice, (newPrice, oldPrice) => {
    if (newPrice > oldPrice) {
      priceChangeClass.value = 'animate-price-up';
    } else if (newPrice < oldPrice) {
      priceChangeClass.value = 'animate-price-down';
    }
    setTimeout(() => { priceChangeClass.value = ''; }, 300);

    lastOrderPrice.value = newPrice;
    if (orderType.value === 'Market') {
      orderPrice.value = newPrice;
    }
});

watch(selectedPrice, (newPrice) => {
    if (newPrice) {
        orderPrice.value = newPrice;
        if (orderType.value === 'Market') {
            orderType.value = 'Limit';
        }
    }
});

const orderTypes = ['Limit', 'Market', 'Stop-Limit', 'Stop Market', 'Trailing Stop', 'OCO'] as const;
const orderType = ref<typeof orderTypes[number]>('Limit');

const orderTypeDetails = {
  'Limit': { desc: 'Buy or Sell at a specific price or better', icon: CornerDownRight },
  'Market': { desc: 'Buy or Sell at the best available market price', icon: TrendingDown },
  'Stop-Limit': { desc: 'Triggers a Limit order when Stop price is reached.', icon: GitCommit },
  'Stop Market': { desc: 'Triggers a Market order when Stop price is reached.', icon: Activity },
  'Trailing Stop': { desc: 'Places an order when the price reaches the predefined point', icon: Activity },
  'OCO': { desc: 'Places two orders at once. When either is triggered, the other is canceled.', icon: Waypoints }
};

const showOrderTypeDropdown = ref(false);
const marginEnabled = ref(false);
const leverage = ref(10);
const viewMode = ref<'orderbook' | 'depth'>('orderbook');

const depthCanvas = ref<HTMLCanvasElement | null>(null);

const drawDepthChart = () => {
    if (!depthCanvas.value) return;
    const ctx = depthCanvas.value.getContext('2d');
    if (!ctx) return;

    const w = depthCanvas.value.width;
    const h = depthCanvas.value.height;
    ctx.clearRect(0, 0, w, h);

    const bids = orderBook.value.bids;
    const asks = orderBook.value.asks;
    if (bids.length === 0 || asks.length === 0) return;

    // Normalize prices
    const minPrice = bids[bids.length - 1][0];
    const maxPrice = asks[asks.length - 1][0];
    const range = maxPrice - minPrice;

    const getX = (p: number) => ((p - minPrice) / range) * w;

    // Calculate cumulative volume
    let bidVol = 0;
    const bidPoints = bids.map(b => {
        bidVol += b[1];
        return { x: getX(b[0]), y: bidVol };
    });

    let askVol = 0;
    const askPoints = asks.map(a => {
        askVol += a[1];
        return { x: getX(a[0]), y: askVol };
    });

    const maxVol = Math.max(bidVol, askVol);
    const getY = (v: number) => h - (v / maxVol) * h * 0.8;

    // Draw Bids
    ctx.beginPath();
    ctx.moveTo(0, h);
    bidPoints.forEach(p => ctx.lineTo(p.x, getY(p.y)));
    ctx.lineTo(getX(bids[0][0]), h);
    ctx.fillStyle = 'rgba(14, 203, 129, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#0ecb81';
    ctx.stroke();

    // Draw Asks
    ctx.beginPath();
    ctx.moveTo(w, h);
    askPoints.forEach(p => ctx.lineTo(p.x, getY(p.y)));
    ctx.lineTo(getX(asks[0][0]), h);
    ctx.fillStyle = 'rgba(246, 70, 93, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#f6465d';
    ctx.stroke();
};

watch([orderBook, viewMode], () => {
    if (viewMode.value === 'depth') {
        nextTick(drawDepthChart);
    }
}, { deep: true });
const iceberg = ref(false);
const percentage = ref(0);

// Load Preferences
onMounted(() => {
  const savedType = localStorage.getItem('defaultOrderType');
  if (savedType && orderTypes.includes(savedType as any)) {
      orderType.value = savedType as any;
  }
  const savedMargin = localStorage.getItem('defaultMarginEnabled');
  if (savedMargin !== null) marginEnabled.value = savedMargin === 'true';
  
  const savedLeverage = localStorage.getItem('defaultLeverage');
  if (savedLeverage !== null) leverage.value = parseInt(savedLeverage);
});

// Save Preferences
watch(orderType, (val) => localStorage.setItem('defaultOrderType', val));
watch(marginEnabled, (val) => localStorage.setItem('defaultMarginEnabled', String(val)));
watch(leverage, (val) => localStorage.setItem('defaultLeverage', String(val)));

watch(isRiskModeActive, (val) => {
    if (val && sharedSlPrice.value === null && orderPrice.value) {
        setSlPercent(5);
    }
});

const tpSl = ref(false);
const isTpSlOpen = ref(false);
const tpPrice = ref<number | null>(null);
const slPrice = sharedSlPrice;
const tpPercent = ref<number | null>(5);
const slPercent = ref<number | null>(5);
const riskUsdt = ref<number | null>(100);

const shadowBorrowValue = ref(0.00);



const borrowValue = computed(() => {
    if (!marginEnabled.value) return 0.00;
    return totalCostNumber.value * (leverage.value - 1) / leverage.value;
});

const maxAmount = computed(() => {
  const mult = marginEnabled.value ? leverage.value : 1;
  const currentPrice = orderType.value === 'Market' ? lastOrderPrice.value : orderPrice.value;
  const usdtBase = marginEnabled.value ? availableMargin.value : availableUsdt.value;
  if (orderSide.value === 'Buy') {
    return currentPrice > 0 ? ((usdtBase * mult) / currentPrice) : 0;
  }
  return availableBtc.value * mult;
});

const totalCostNumber = computed(() => {
  if (!orderAmount.value || isNaN(orderAmount.value)) return 0;
  const currentPrice = (orderType.value === 'Market' || orderType.value === 'Trailing Stop') ? lastOrderPrice.value : orderPrice.value;
  return currentPrice * orderAmount.value;
});

const totalCost = computed(() => {
  return totalCostNumber.value.toFixed(2);
});

const tpError = computed(() => {
  if (!tpPrice.value || !orderPrice.value) return false;
  return orderSide.value === 'Buy' ? tpPrice.value <= orderPrice.value : tpPrice.value >= orderPrice.value;
});

const slError = computed(() => {
  if (!slPrice.value || !orderPrice.value) return false;
  return orderSide.value === 'Buy' ? slPrice.value >= orderPrice.value : slPrice.value <= orderPrice.value;
});

const orderPriceError = computed(() => {
  if (['Limit', 'Stop-Limit', 'OCO'].includes(orderType.value)) {
     if (orderPrice.value === null || orderPrice.value <= 0) return 'Price must be greater than 0';
  }
  if (['Stop-Limit', 'OCO'].includes(orderType.value)) {
     if (stopPrice.value === null || stopPrice.value <= 0) return 'Stop Price must be greater than 0';
  }
  if (orderType.value === 'OCO') {
     if (limitPrice.value === null || limitPrice.value <= 0) return 'Limit Price must be greater than 0';
  }
  if (orderType.value === 'Trailing Stop') {
     if (callbackRate.value === null || callbackRate.value < 0.1 || callbackRate.value > 5) return 'Callback must be 0.1% - 5.0%';
  }
  return null;
});

const orderAmountError = computed(() => {
  if (orderAmount.value === null) return null;
  if (orderAmount.value <= 0) return 'Amount must be greater than 0';
  if (orderAmount.value > maxAmount.value) {
    return orderSide.value === 'Buy' ? 'Exceeds max buy amount/margin' : 'Exceeds available balance';
  }
  return null;
});

const isFormValid = computed(() => {
  if (isRiskMode.value) {
    if (!slPrice.value || slError.value) return false;
    if (calculatedRiskSize.value <= 0) return false;
    if (requiredRiskMargin.value > availableUsdt.value) return false;
    return true;
  }
  if (!orderAmount.value || orderAmount.value <= 0) return false;
  if (orderPriceError.value) return false;
  if (orderAmountError.value) return false;
  if (tpSl.value) {
    if (tpError.value || slError.value) return false;
  }
  return true;
});

const calculatedRiskAmount = computed(() => {
    if (riskInputMode.value === 'percent') {
        return (availableUsdt.value * riskPercentOfBalance.value) / 100;
    }
    return riskAmountAbsolute.value;
});

const calculatedRiskSize = computed(() => {
    if (!slPrice.value || !orderPrice.value) return 0;
    const priceDiff = Math.abs(orderPrice.value - slPrice.value);
    if (priceDiff === 0) return 0;
    return parseFloat((calculatedRiskAmount.value / priceDiff).toFixed(4));
});

const requiredRiskMargin = computed(() => {
    return (calculatedRiskSize.value * (orderType.value === 'Market' ? lastOrderPrice.value : orderPrice.value)) / leverage.value;
});

const executeTrade = async () => {
  if (!isFormValid.value) return;

  const typeMapping: Record<string, string> = {
    'Limit': 'LIMIT',
    'Market': 'MARKET',
    'Stop-Limit': 'STOP',
    'Stop Market': 'STOP_MARKET',
    'Trailing Stop': 'TRAILING_STOP_MARKET',
    'OCO': 'OCO'
  };

  const finalAmount = isRiskMode.value ? calculatedRiskSize.value : orderAmount.value!;
  const finalSl = isRiskMode.value ? slPrice.value : (tpSl.value ? slPrice.value : undefined);
  const finalTp = tpSl.value ? tpPrice.value : undefined;

  const result = await runTrade({
    side: orderSide.value,
    type: typeMapping[orderType.value] || 'MARKET',
    amount: finalAmount,
    price: orderPrice.value,
    leverage: leverage.value,
    marginEnabled: marginEnabled.value,
    stopPrice: stopPrice.value || undefined,
    callbackRate: callbackRate.value || undefined,
    activationPrice: activationPrice.value || undefined,
    takeProfitPrice: finalTp || undefined,
    stopLossPrice: finalSl || undefined,
    iceberg: iceberg.value,
  });

  if (result?.success) {
    orderAmount.value = null; // reset
    tpSl.value = false;
    percentage.value = 0;
  }
};

const isUpdatingAmountAutomatically = ref(false);

const setPercentage = (pct: number) => {
  isUpdatingAmountAutomatically.value = true;
  percentage.value = pct;
  orderAmount.value = parseFloat(((maxAmount.value * pct) / 100).toFixed(4));
  setTimeout(() => { isUpdatingAmountAutomatically.value = false; }, 0);
};

watch(orderAmount, (val) => {
  if (isUpdatingAmountAutomatically.value) return;
  if (val === null || isNaN(val)) {
    percentage.value = 0;
    return;
  }
  if (maxAmount.value === 0) {
    percentage.value = 0;
    return;
  }
  percentage.value = Math.min(100, Math.max(0, (val / maxAmount.value) * 100));
});

const updateTpFromPercent = () => {
  if (tpPercent.value !== null && orderPrice.value) {
    const isBuy = orderSide.value === 'Buy';
    tpPrice.value = parseFloat((orderPrice.value * (1 + (isBuy ? tpPercent.value : -tpPercent.value) / 100)).toFixed(2));
  } else {
    tpPrice.value = null;
  }
};

const updateTpFromPrice = () => {
  if (tpPrice.value !== null && orderPrice.value) {
    const isBuy = orderSide.value === 'Buy';
    const dp = ((tpPrice.value - orderPrice.value) / orderPrice.value) * 100;
    tpPercent.value = parseFloat((isBuy ? dp : -dp).toFixed(2));
  } else {
    tpPercent.value = null;
  }
};

const updateSlFromPercent = () => {
  if (slPercent.value !== null && orderPrice.value) {
    const isBuy = orderSide.value === 'Buy';
    slPrice.value = parseFloat((orderPrice.value * (1 + (isBuy ? -slPercent.value : slPercent.value) / 100)).toFixed(2));
  } else {
    slPrice.value = null;
  }
};

const updateSlFromPrice = () => {
  if (slPrice.value !== null && orderPrice.value) {
    const isBuy = orderSide.value === 'Buy';
    const dp = ((slPrice.value - orderPrice.value) / orderPrice.value) * 100;
    slPercent.value = parseFloat((isBuy ? -dp : dp).toFixed(2));
  } else {
    slPercent.value = null;
  }
};

const updateAmountFromRisk = () => {
    if (riskUsdt.value && slPrice.value && orderPrice.value) {
        const diff = Math.abs(orderPrice.value - slPrice.value);
        if (diff > 0) {
            orderAmount.value = parseFloat((riskUsdt.value / diff).toFixed(4));
            isTpSlOpen.value = false;
        }
    }
};

watch([orderPrice, orderSide], () => {
  if (tpSl.value) {
    if (tpPercent.value !== null) updateTpFromPercent();
    if (slPercent.value !== null) updateSlFromPercent();
  }
});

const handleTpSlToggle = () => {
  if (tpSl.value) {
    isTpSlOpen.value = true;
  }
};

const setTpPercent = (pct: number) => {
  tpPercent.value = pct;
  updateTpFromPercent();
};

const setSlPercent = (pct: number) => {
  slPercent.value = pct;
  updateSlFromPercent();
};

watch(tpSl, (val) => {
  if (val) {
    if (tpPercent.value === null) tpPercent.value = 5;
    if (slPercent.value === null) slPercent.value = 5;
    updateTpFromPercent();
    updateSlFromPercent();
    isTpSlOpen.value = true;
  } else {
    isTpSlOpen.value = false;
  }
});

onMounted(() => {
  const updateTime = () => {
    const d = new Date();
    currentTime.value = d.toLocaleTimeString('en-US', { hour12: false });
  };
  updateTime();
  timer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});

</script>

<template>
  <div class="flex flex-row gap-1 sm:gap-2 h-[460px] lg:h-full w-full">
    <!-- Left: Order Book / Trades Panel -->
    <div class="bg-[#0b0e11]/60 backdrop-blur-2xl border border-white/5 rounded-[16px] flex flex-col overflow-hidden w-[calc(40%-0.5rem)] shrink-0">
        <!-- View Mode Toggle -->
        <div class="flex items-center justify-between px-1 sm:px-2 py-1.5 sm:py-2 border-b border-[#1e2329] bg-[#161a1e]/30">
          <div class="flex items-center gap-1 sm:gap-2">
            <button 
              @click="viewMode = 'orderbook'"
              :class="cn('px-2 py-1 text-[9px] sm:text-[10px] font-bold uppercase rounded transition-all', viewMode === 'orderbook' ? 'bg-[#2b3139] text-[#F0B90B] shadow-sm' : 'text-[#848e9c] hover:text-[#EAECEF]')"
            >
              Order Book
            </button>
            <button 
              @click="viewMode = 'depth'"
              :class="cn('px-2 py-1 text-[9px] sm:text-[10px] font-bold uppercase rounded transition-all', viewMode === 'depth' ? 'bg-[#2b3139] text-[#F0B90B] shadow-sm' : 'text-[#848e9c] hover:text-[#EAECEF]')"
            >
              Depth Chart
            </button>
          </div>
          <div class="text-[#848e9c] text-[9px] sm:text-[10px] font-mono mr-1">
            {{ currentTime }}
          </div>
        </div>

        <div v-if="viewMode === 'orderbook'" class="flex-1 flex flex-col overflow-hidden p-1 sm:p-2">
          <table class="w-full text-[11px] sm:text-[12px] text-right h-full border-collapse" style="table-layout: fixed">
            <thead class="text-[#848e9c] sticky top-0 bg-[#0b0e11] z-20">
              <tr>
                <th class="font-normal pb-1 sm:pb-1.5 pt-1 text-left w-1/2 text-[9px] sm:text-[10px] pl-1">Price(USDT)</th>
                <th class="font-normal pb-1 sm:pb-1.5 pt-1 w-1/2 text-[9px] sm:text-[10px] pr-1">Amount(BTC)</th>
              </tr>
            </thead>
            <tbody class="font-mono tracking-tight">
              <tr v-for="(ask, i) in orderBookAsks" :key="`ask-${i}`" class="hover:bg-[#1e2329]/80 cursor-pointer group relative transition-colors duration-150">
                <td class="py-[2px] sm:py-[3px] text-left text-[#f6465d] border-none pl-1 relative z-10 w-1/2">
                  <div class="absolute inset-y-0 right-0 bg-gradient-to-l from-[#f6465d]/20 to-transparent group-hover:from-[#f6465d]/30 -z-10 transition-all duration-300 ease-out" :style="`width: ${(ask.amount / maxOrderBookAmount) * 100}%`"></div>
                  {{ ask.price.toFixed(2) }}
                </td>
                <td class="py-[2px] sm:py-[3px] text-[#EAECEF] border-none pr-1 relative z-10 w-1/2">{{ ask.amount.toFixed(4) }}</td>
              </tr>
              
              <!-- Middle: Market Price -->
              <tr>
                <td colspan="2" class="py-1 sm:py-2 border-y border-[#1e2329] my-0.5 text-center relative bg-transparent transition-all duration-300" :class="priceChangeClass">
                  <div class="flex flex-col items-center justify-center py-0.5 sm:py-1">
                    <div class="flex items-center gap-1 sm:gap-2">
                      <span :class="cn('font-bold text-base sm:text-xl transition-colors duration-300 flex items-center', currentPrice >= previousPrice ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                        {{ currentPrice.toFixed(2) }} 
                        <ArrowUp v-if="currentPrice >= previousPrice" class="w-3 h-3 sm:w-5 sm:h-5 ml-1" />
                        <ArrowDown v-else class="w-3 h-3 sm:w-5 sm:h-5 ml-1" />
                      </span>
                    </div>
                  </div>
                </td>
              </tr>

              <tr v-for="(bid, i) in orderBookBids" :key="`bid-${i}`" class="hover:bg-[#1e2329]/80 cursor-pointer group relative transition-colors duration-150">
                <td class="py-[2px] sm:py-[3px] text-left text-[#0ecb81] border-none pl-1 relative z-10 w-1/2">
                  <div class="absolute inset-y-0 right-0 bg-gradient-to-l from-[#0ecb81]/20 to-transparent group-hover:from-[#0ecb81]/30 -z-10 transition-all duration-300 ease-out" :style="`width: ${(bid.amount / maxOrderBookAmount) * 100}%`"></div>
                  {{ bid.price.toFixed(2) }}
                </td>
                <td class="py-[2px] sm:py-[3px] text-[#EAECEF] border-none pr-1 relative z-10 w-1/2">{{ bid.amount.toFixed(4) }}</td>
              </tr>
            </tbody>
          </table>
          
          <!-- Sentiment Bar -->
          <div class="px-2 py-1.5 border-t border-[#1e2329] bg-[#0b0e11] shrink-0">
              <div class="flex justify-between text-[9px] font-bold uppercase tracking-wider mb-1">
                  <span class="text-[#0ecb81]">{{ marketSentiment.toFixed(1) }}% Buy</span>
                  <span class="text-[#f6465d]">{{ (100 - marketSentiment).toFixed(1) }}% Sell</span>
              </div>
              <div class="h-1.5 w-full bg-[#1e2329] rounded-full overflow-hidden flex">
                  <div class="h-full bg-[#0ecb81] transition-all duration-500 ease-out" :style="`width: ${marketSentiment}%`"></div>
                  <div class="h-full bg-[#f6465d] transition-all duration-500 ease-out" :style="`width: ${100 - marketSentiment}%`"></div>
              </div>
          </div>
        </div>

        <!-- Depth Chart View -->
        <div v-else class="flex-1 flex flex-col min-h-[250px] relative p-2 bg-[#0b0e11]">
            <canvas ref="depthCanvas" class="w-full h-full" width="400" height="300"></canvas>
            <div class="absolute top-2 left-2 text-[9px] text-[#848e9c] font-mono">LIQUIDITY DEPTH</div>
        </div>
      </div>

    <!-- Right: Order Panel -->
    <div class="bg-[#0b0e11]/60 backdrop-blur-2xl border border-white/5 rounded-[16px] p-1.5 sm:p-4 flex flex-col flex-1 shrink-0 text-[#EAECEF] relative overflow-y-auto no-scrollbar">
      <!-- Header -->
      <div class="flex items-center justify-between mb-2 sm:mb-4 border-b border-[#1e2329] pb-2 sm:pb-3 transition-all duration-300">
        <span class="text-white text-[17px] leading-[22.2857px] font-mono font-normal pl-[10px] text-left no-underline truncate">
          {{ marginEnabled ? 'Margin' : 'Spot' }}
        </span>
        <div class="flex items-center justify-center gap-1 sm:gap-2 text-[16px] text-[#848e9c] w-[97.4219px] h-[24.8438px] text-center">
          Margin
          <button 
            @click="marginEnabled = !marginEnabled"
            class="w-[30px] h-[15px] text-[35px] leading-[34.8571px] text-right rounded-full relative transition-colors duration-200 shrink-0"
            :class="marginEnabled ? 'bg-[#F0B90B]' : 'bg-[#2b3139]'"
          >
            <div 
              class="w-[11px] h-[11px] rounded-full bg-white absolute top-[2px] transition-all duration-200"
              :class="marginEnabled ? 'left-[17px]' : 'left-[2px]'"
            ></div>
          </button>
        </div>
      </div>

      <!-- Buy / Sell Tabs -->
      <div class="flex rounded-xl bg-[#0b0e11]/50 backdrop-blur-md border border-white/5 p-1 mb-2 sm:mb-4">
        <button 
          @click="orderSide = 'Buy'"
          class="flex-1 py-1.5 sm:py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all duration-300 text-center"
          :class="orderSide === 'Buy' ? 'bg-[#0ecb81] text-[#0b0e11] shadow-lg shadow-[#0ecb81]/20' : 'text-[#848e9c] hover:text-[#EAECEF] hover:bg-white/5'"
        >
          Buy
        </button>
        <button 
          @click="orderSide = 'Sell'"
          class="flex-1 py-1.5 sm:py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all duration-300 text-center"
          :class="orderSide === 'Sell' ? 'bg-[#f6465d] text-white shadow-lg shadow-[#f6465d]/20' : 'text-[#848e9c] hover:text-[#EAECEF] hover:bg-white/5'"
        >
          Sell
        </button>
      </div>

      <!-- Leverage Slider (Margin Only) -->
      <div v-if="marginEnabled" class="flex flex-col gap-2 mb-4 px-1">
        <div class="flex justify-between items-center text-[10px] text-[#848e9c] font-bold uppercase tracking-wider">
          <span>Leverage</span>
          <span class="text-[#F0B90B]">{{ leverage }}x</span>
        </div>
        <input 
          type="range" 
          v-model="leverage" 
          min="1" 
          max="100" 
          step="1"
          class="w-full h-1.5 bg-[#1e2329] rounded-lg appearance-none cursor-pointer accent-[#F0B90B]"
        />
        <div class="flex justify-between text-[8px] text-[#474d57] px-0.5">
          <span>1x</span>
          <span>25x</span>
          <span>50x</span>
          <span>75x</span>
          <span>100x</span>
        </div>
      </div>

      <!-- Order Type -->
      <div class="flex items-center justify-between mb-2 sm:mb-4 relative">
        <div 
          @click="showOrderTypeDropdown = !showOrderTypeDropdown"
          class="cursor-pointer text-[#EAECEF] font-semibold text-xs flex items-center border-b border-dashed border-[#848e9c] pb-0.5 hover:text-[#F0B90B]"
        >
          {{ orderType }} <ChevronDown class="w-3 h-3 ml-0.5" />
        </div>
        
        <!-- Desktop Dropdown -->
        <div v-if="showOrderTypeDropdown" class="hidden sm:block absolute top-full left-0 mt-1 w-32 bg-[#2b3139] border border-[#474d57] rounded shadow-lg z-50 py-1">
          <div 
            v-for="type in orderTypes" 
            :key="type"
            @click="orderType = type as any; showOrderTypeDropdown = false"
            class="px-3 py-1.5 text-xs hover:bg-[#1e2329] cursor-pointer transition-colors"
            :class="orderType === type ? 'text-[#F0B90B]' : 'text-[#EAECEF]'"
          >
            {{ type }}
          </div>
        </div>

        <!-- Mobile Bottom Sheet -->
        <Teleport to="body">
          <div v-if="showOrderTypeDropdown" class="fixed inset-0 z-[100] flex sm:hidden flex-col justify-end pointer-events-auto">
            <!-- Backdrop -->
            <div 
              class="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity" 
              @click="showOrderTypeDropdown = false"
            ></div>
            
            <!-- Bottom Sheet -->
            <div class="relative bg-white dark:bg-[#1e2329] rounded-t-[20px] w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-full duration-300 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
              <!-- Handle -->
              <div class="w-full flex justify-center pt-3 pb-2">
                <div class="w-10 h-1 bg-[#eaecef] dark:bg-[#2b3139] rounded-full"></div>
              </div>
              
              <!-- Header -->
              <div class="px-5 py-2 flex items-center text-[#1e2329] dark:text-[#EAECEF]">
                <div class="flex items-center gap-1 font-bold text-[18px]">
                  Order Type 
                  <Info class="w-4 h-4 text-[#848e9c] hover:text-inherit cursor-pointer" />
                </div>
              </div>
              
              <!-- Options List -->
              <div class="flex flex-col overflow-y-auto pb-8 pt-2">
                <div 
                  v-for="type in orderTypes" 
                  :key="type"
                  @click="orderType = type as any; showOrderTypeDropdown = false"
                  class="px-5 py-3.5 flex items-start gap-4 cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#2b3139]/50 transition-colors relative"
                >
                  <!-- Icon -->
                  <div class="mt-0.5 shrink-0">
                    <component :is="orderTypeDetails[type].icon" class="w-[18px] h-[18px] text-[#1e2329] dark:text-[#EAECEF]" stroke-width="1.5" />
                  </div>
                  
                  <!-- Text -->
                  <div class="flex flex-col pr-8">
                    <div class="text-[15px] font-semibold text-[#1e2329] dark:text-[#EAECEF]">{{ type }}</div>
                    <div class="text-[13px] text-[#707a8a] dark:text-[#848e9c] leading-snug mt-0.5 pr-2">
                      {{ orderTypeDetails[type].desc }}
                    </div>
                  </div>
                  
                  <!-- Checkmark (absolute to right) -->
                  <div v-if="orderType === type" class="absolute right-5 top-1/2 -translate-y-1/2">
                    <Check class="w-[22px] h-[22px] text-[#1e2329] dark:text-[#EAECEF]" stroke-width="2.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Teleport>
      </div>

      <!-- Calculator Toggle -->
      <div class="flex rounded bg-[#1e2329] p-0.5 mb-3">
        <button 
          @click="isRiskMode = false"
          class="flex-1 py-1 rounded text-[10px] font-bold transition-all uppercase tracking-tight"
          :class="!isRiskMode ? 'bg-[#2b3139] text-[#F0B90B] shadow-sm' : 'text-[#848e9c] hover:text-[#EAECEF]'"
        >
          Standard
        </button>
        <button 
          @click="isRiskMode = true"
          class="flex-1 py-1 rounded text-[10px] font-bold transition-all uppercase tracking-tight flex items-center justify-center gap-1"
          :class="isRiskMode ? 'bg-[#2b3139] text-[#F0B90B] shadow-sm' : 'text-[#848e9c] hover:text-[#EAECEF]'"
        >
          <Shield class="w-3 h-3" />
          Risk-Based
        </button>
      </div>

      <!-- Inputs -->
      <div class="flex flex-col gap-3 min-h-[120px]">
        
        <!-- Risk-Based Sizing Inputs -->
        <template v-if="isRiskMode">
           <div class="flex flex-col gap-2 p-3 rounded-lg bg-[#F0B90B]/5 border border-[#F0B90B]/10">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-[#F0B90B] uppercase">Risk Per Trade</span>
                <div class="flex rounded bg-[#161a1e] p-0.5">
                    <button @click="riskInputMode = 'percent'" :class="cn('px-2 py-0.5 text-[8px] font-bold rounded', riskInputMode === 'percent' ? 'bg-[#F0B90B] text-[#0b0e11]' : 'text-[#848e9c]')">%</button>
                    <button @click="riskInputMode = 'absolute'" :class="cn('px-2 py-0.5 text-[8px] font-bold rounded', riskInputMode === 'absolute' ? 'bg-[#F0B90B] text-[#0b0e11]' : 'text-[#848e9c]')">$</button>
                </div>
              </div>

              <div v-if="riskInputMode === 'percent'" class="flex items-center gap-2 bg-[#0b0e11] rounded px-3 py-1.5 border border-[#2b3139] focus-within:border-[#F0B90B]">
                <input type="number" v-model="riskPercentOfBalance" step="0.1" class="w-full bg-transparent outline-none text-xs font-mono text-[#EAECEF]" />
                <span class="text-[10px] text-[#848e9c] font-bold">% Balance</span>
              </div>
              <div v-else class="flex items-center gap-2 bg-[#0b0e11] rounded px-3 py-1.5 border border-[#2b3139] focus-within:border-[#F0B90B]">
                <input type="number" v-model="riskAmountAbsolute" step="1" class="w-full bg-transparent outline-none text-xs font-mono text-[#EAECEF]" />
                <span class="text-[10px] text-[#848e9c] font-bold">USDT</span>
              </div>

              <div class="flex flex-col gap-1 mt-1">
                <span class="text-[10px] font-bold text-[#848e9c] uppercase">Stop Loss Price</span>
                <div :class="cn('flex items-center transition-colors rounded-lg w-full h-[36px] px-2 bg-[#0b0e11] border', slError ? 'border-[#f6465d]' : 'border-[#2b3139] focus-within:border-[#F0B90B]')">
                    <input type="number" step="0.1" v-model="slPrice" placeholder="Exit Price" class="flex-1 bg-transparent outline-none text-[#EAECEF] font-mono text-xs text-center" />
                </div>
                <div class="flex items-center justify-between px-1">
                    <span class="text-[8px] text-[#848e9c] italic">Tip: Drag line on chart</span>
                    <div class="flex gap-1">
                        <button v-for="pct in [1, 2, 5, 10]" :key="pct" @click="setSlPercent(pct)" class="text-[8px] font-bold px-2 py-0.5 bg-[#2b3139] text-[#848e9c] rounded hover:text-white transition-colors">{{ pct }}%</button>
                    </div>
                </div>
              </div>

              <!-- Calculation Result -->
              <div class="mt-2 pt-2 border-t border-[#F0B90B]/10 flex flex-col gap-1.5">
                <div class="flex justify-between items-center">
                    <span class="text-[10px] text-[#848e9c]">Position Size</span>
                    <span class="text-xs font-mono font-bold text-[#EAECEF]">{{ calculatedRiskSize }} BTC</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[10px] text-[#848e9c]">Required Margin</span>
                    <span :class="cn('text-xs font-mono font-bold', requiredRiskMargin > availableUsdt ? 'text-[#f6465d]' : 'text-[#0ecb81]')">{{ requiredRiskMargin.toFixed(2) }} USDT</span>
                </div>
              </div>
           </div>
        </template>

        <!-- Setup Inputs based on Type -->
        <template v-if="!isRiskMode">
        
        <!-- Stop Price (for Stop-Limit and OCO) -->
        <div v-if="orderType === 'Stop-Limit' || orderType === 'Stop Market' || orderType === 'OCO'" class="flex flex-col gap-1">
          <div :class="cn('flex items-center transition-colors rounded-lg w-full h-[40px] px-2 sm:px-3 bg-[#1e2329] hover:bg-[#2b3139] border', orderPriceError && (stopPrice === null || stopPrice <= 0) ? 'border-[#f6465d]' : 'border-[#2b3139] focus-within:border-[#F0B90B]')">
            <Minus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="stopPrice = Math.max(0, parseFloat(((stopPrice || 0) - 0.1).toFixed(2)))" />
            <div class="flex-1 flex flex-col justify-center items-center h-full relative">
              <div v-show="stopPrice !== null && stopPrice > 0" class="text-[9px] text-[#848e9c] leading-none absolute top-1">Stop (USDT)</div>
              <input type="number" step="0.01" min="0" v-model="stopPrice" placeholder="Stop (USDT)" :class="cn('text-center bg-transparent outline-none text-[#EAECEF] font-mono text-xs sm:text-[14px] w-full px-2 placeholder-[#474d57]', stopPrice !== null && stopPrice > 0 ? 'mt-2.5' : '')" />
            </div>
            <Plus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="stopPrice = parseFloat(((stopPrice || 0) + 0.1).toFixed(2))" />
          </div>
        </div>
        
        <!-- Limit Price (for OCO) -->
        <div v-if="orderType === 'OCO'" class="flex flex-col gap-1">
          <div :class="cn('flex items-center transition-colors rounded-lg w-full h-[40px] px-2 sm:px-3 bg-[#1e2329] hover:bg-[#2b3139] border', orderPriceError && (limitPrice === null || limitPrice <= 0) ? 'border-[#f6465d]' : 'border-[#2b3139] focus-within:border-[#F0B90B]')">
            <Minus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="limitPrice = Math.max(0, parseFloat(((limitPrice || 0) - 0.1).toFixed(2)))" />
            <div class="flex-1 flex flex-col justify-center items-center h-full relative">
              <div v-show="limitPrice !== null && limitPrice > 0" class="text-[9px] text-[#848e9c] leading-none absolute top-1">Limit (USDT)</div>
              <input type="number" step="0.01" min="0" v-model="limitPrice" placeholder="Limit (USDT)" :class="cn('text-center bg-transparent outline-none text-[#EAECEF] font-mono text-xs sm:text-[14px] w-full px-2 placeholder-[#474d57]', limitPrice !== null && limitPrice > 0 ? 'mt-2.5' : '')" />
            </div>
            <Plus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="limitPrice = parseFloat(((limitPrice || 0) + 0.1).toFixed(2))" />
          </div>
        </div>

        <!-- Callback Rate (for Trailing Stop) -->
        <div v-if="orderType === 'Trailing Stop'" class="flex flex-col gap-1">
          <div :class="cn('flex items-center transition-colors rounded-lg w-full h-[40px] px-2 sm:px-3 bg-[#1e2329] hover:bg-[#2b3139] border', orderPriceError && (callbackRate === null || callbackRate < 0.1 || callbackRate > 5) ? 'border-[#f6465d]' : 'border-[#2b3139] focus-within:border-[#F0B90B]')">
            <Minus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="callbackRate = Math.max(0.1, parseFloat(((callbackRate || 1) - 0.1).toFixed(1)))" />
            <div class="flex-1 flex flex-col justify-center items-center h-full relative">
              <div v-show="callbackRate !== null && callbackRate > 0" class="text-[9px] text-[#848e9c] leading-none absolute top-1">Callback Rate (%)</div>
              <input type="number" step="0.1" min="0.1" max="5.0" v-model="callbackRate" placeholder="Callback Rate (%)" :class="cn('text-center bg-transparent outline-none text-[#EAECEF] font-mono text-xs sm:text-[14px] w-full px-2 placeholder-[#474d57]', callbackRate !== null && callbackRate > 0 ? 'mt-2.5' : '')" />
            </div>
            <Plus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="callbackRate = Math.min(5.0, parseFloat(((callbackRate || 1) + 0.1).toFixed(1)))" />
          </div>
        </div>
        
        <!-- Activation Price (for Trailing Stop) -->
        <div v-if="orderType === 'Trailing Stop'" class="flex flex-col gap-1">
          <div class="flex items-center transition-colors rounded-lg w-full h-[40px] px-2 sm:px-3 bg-[#1e2329] hover:bg-[#2b3139] border border-[#2b3139] focus-within:border-[#F0B90B]">
            <Minus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="activationPrice = Math.max(0, parseFloat(((activationPrice || 0) - 0.1).toFixed(2)))" />
            <div class="flex-1 flex flex-col justify-center items-center h-full relative">
              <div v-show="activationPrice !== null && activationPrice > 0" class="text-[9px] text-[#848e9c] leading-none absolute top-1">Activation (USDT)</div>
              <input type="number" step="0.01" min="0" v-model="activationPrice" placeholder="Activation Price" :class="cn('text-center bg-transparent outline-none text-[#EAECEF] font-mono text-xs sm:text-[14px] w-full px-2 placeholder-[#474d57]', activationPrice !== null && activationPrice > 0 ? 'mt-2.5' : '')" />
            </div>
            <Plus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="activationPrice = parseFloat(((activationPrice || 0) + 0.1).toFixed(2))" />
          </div>
        </div>

        <!-- Price Input (for Limit, Stop-Limit, OCO) -->
        <div v-if="['Limit', 'Stop-Limit', 'OCO'].includes(orderType)" class="flex gap-2">
          <div class="flex-1 flex flex-col gap-1">
            <div :class="cn('flex items-center transition-colors rounded-lg h-[40px] px-2 sm:px-3 bg-[#1e2329] hover:bg-[#2b3139] border', orderPriceError && (orderPrice === null || orderPrice <= 0) ? 'border-[#f6465d]' : 'border-[#2b3139] focus-within:border-[#F0B90B]')">
              <Minus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="orderPrice = Math.max(0, parseFloat(((orderPrice || 0) - 0.1).toFixed(2)))" />
              <div class="flex-1 flex flex-col justify-center items-center h-full relative">
                <div v-show="orderPrice !== null && orderPrice > 0" class="text-[9px] text-[#848e9c] leading-none absolute top-1">Limit (USDT)</div>
                <input type="number" step="0.01" min="0" v-model="orderPrice" placeholder="Limit (USDT)" :class="cn('text-center bg-transparent outline-none text-[#EAECEF] font-mono text-xs sm:text-[14px] w-full px-2 placeholder-[#474d57]', orderPrice !== null && orderPrice > 0 ? 'mt-2.5' : '')" />
              </div>
              <Plus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="orderPrice = parseFloat(((orderPrice || 0) + 0.1).toFixed(2))" />
            </div>
            <span v-if="orderPriceError" class="text-[#f6465d] text-[10px]">{{ orderPriceError }}</span>
          </div>
          <button @click="orderPrice = orderSide === 'Buy' ? currentPrice : currentPrice + 0.5" class="h-[40px] px-3 sm:px-4 bg-[#1e2329] hover:bg-[#2b3139] border border-[#2b3139] text-[#EAECEF] rounded-lg font-semibold text-xs transition-colors shrink-0">BBO</button>
        </div>

        <!-- Amount Input -->
        <div class="flex flex-col gap-1">
          <div :class="cn('flex items-center transition-colors rounded-lg w-full h-[40px] px-2 sm:px-3 bg-[#1e2329] hover:bg-[#2b3139] border', orderAmountError ? 'border-[#f6465d]' : 'border-[#2b3139] focus-within:border-[#F0B90B]')">
            <Minus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="orderAmount = Math.max(0, parseFloat(((orderAmount || 0) - 1).toFixed(4)))" />
            <div class="flex-1 flex flex-col justify-center items-center h-full relative">
              <div v-show="orderAmount !== null && orderAmount > 0" class="text-[9px] text-[#848e9c] leading-none absolute top-1">Amount (BTC)</div>
              <input type="number" v-model="orderAmount" placeholder="Amount (BTC)" :class="cn('text-center bg-transparent outline-none text-[#EAECEF] font-mono text-xs sm:text-[14px] w-full px-2 placeholder-[#474d57]', orderAmount !== null && orderAmount > 0 ? 'mt-2.5' : '')" />
            </div>
            <Plus class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="orderAmount = parseFloat(((orderAmount || 0) + 1).toFixed(4))" />
          </div>
          <span v-if="orderAmountError" class="text-[#f6465d] text-[10px] ml-1">{{ orderAmountError }}</span>
        </div>

        <!-- Market Price Field (Read Only) -->
        <div v-if="orderType === 'Market'" class="flex gap-2">
          <div class="flex-1 flex items-center justify-center bg-[#1e2329] text-[#848e9c] opacity-80 cursor-not-allowed rounded-lg h-[40px] px-2 sm:px-3 border border-[#2b3139] text-xs font-mono">
            Market Price (USDT)
          </div>
          <div class="h-[40px] px-3 sm:px-4 bg-[#1e2329]/50 border border-[#2b3139] text-[#EAECEF]/50 rounded-lg font-semibold text-xs shrink-0 cursor-not-allowed opacity-50 flex items-center justify-center">BBO</div>
        </div>

        </template>

        <!-- Total -->
        <div class="flex items-center bg-[#1e2329] hover:bg-[#2b3139] transition-colors rounded-lg w-full h-[40px] px-1.5 sm:px-3 border border-transparent focus-within:ring-1 focus-within:ring-[#F0B90B]">
          <div class="text-[10px] sm:text-[12px] text-[#848e9c] shrink-0">Total</div>
          <input type="number" :value="totalCost" readonly placeholder="0.00" class="flex-1 text-center ml-1 sm:ml-2 bg-transparent outline-none text-[#EAECEF] font-mono text-xs sm:text-[14px] w-full min-w-0 placeholder:text-[#474d57]" />
          <div class="text-[#EAECEF] font-medium text-[10px] sm:text-[12px] ml-1.5 sm:ml-3 shrink-0">USDT</div>
        </div>
      </div>
      
      <!-- Percentage Slider -->
      <div class="w-full relative h-[20px] flex items-center justify-between mt-1 sm:mt-2 mb-2 sm:mb-4 px-1">
         <!-- Track -->
         <div class="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-1 bg-[#2b3139] rounded">
           <div class="h-full bg-[#2ebd85] rounded pointer-events-none transition-all" :style="`width: ${percentage}%`" v-if="orderSide === 'Buy'"></div>
           <div class="h-full bg-[#f6465d] rounded pointer-events-none transition-all" :style="`width: ${percentage}%`" v-else></div>
         </div>
         
         <!-- Marks -->
         <div class="relative w-3 h-3 bg-[#1e2329] border-2 rounded rotate-45 cursor-pointer hover:scale-125 transition-transform z-10" :class="percentage >= 0 ? (orderSide === 'Buy' ? 'border-[#2ebd85] bg-[#2ebd85]' : 'border-[#f6465d] bg-[#f6465d]') : 'border-[#474d57]'" @click="setPercentage(0)"></div>
         <div class="relative w-3 h-3 bg-[#1e2329] border-2 rounded rotate-45 cursor-pointer hover:scale-125 transition-transform z-10" :class="percentage >= 25 ? (orderSide === 'Buy' ? 'border-[#2ebd85]' : 'border-[#f6465d]') : 'border-[#474d57]'" @click="setPercentage(25)"></div>
         <div class="relative w-3 h-3 bg-[#1e2329] border-2 rounded rotate-45 cursor-pointer hover:scale-125 transition-transform z-10" :class="percentage >= 50 ? (orderSide === 'Buy' ? 'border-[#2ebd85]' : 'border-[#f6465d]') : 'border-[#474d57]'" @click="setPercentage(50)"></div>
         <div class="relative w-3 h-3 bg-[#1e2329] border-2 rounded rotate-45 cursor-pointer hover:scale-125 transition-transform z-10" :class="percentage >= 75 ? (orderSide === 'Buy' ? 'border-[#2ebd85]' : 'border-[#f6465d]') : 'border-[#474d57]'" @click="setPercentage(75)"></div>
         <div class="relative w-3 h-3 bg-[#1e2329] border-2 rounded rotate-45 cursor-pointer hover:scale-125 transition-transform z-10" :class="percentage >= 100 ? (orderSide === 'Buy' ? 'border-[#2ebd85]' : 'border-[#f6465d]') : 'border-[#474d57]'" @click="setPercentage(100)"></div>
      </div>
      
      <!-- TP/SL and Iceberg -->
      <div class="flex flex-col gap-2 mb-2 sm:mb-4">
         <div class="flex items-center justify-between group">
             <label class="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" v-model="tpSl" class="hidden" @change="handleTpSlToggle" />
               <div class="w-4 h-4 rounded-sm border flex items-center justify-center transition-colors" :class="tpSl ? 'bg-[#F0B90B] border-[#F0B90B]' : 'border-[#848e9c] group-hover:border-[#EAECEF] bg-transparent'">
                 <svg v-if="tpSl" viewBox="0 0 14 14" class="w-3 h-3 fill-[#181a20]"><path d="M5.533 10.68L2 7.147l1.067-1.067 2.466 2.453L10.933 3.14l1.067 1.067-6.467 6.473z"/></svg>
               </div>
               <div class="flex items-center gap-1.5">
                 <span class="text-[#848e9c] hover:text-[#EAECEF] text-xs font-semibold transition-colors">TP/SL</span>
                 <span v-if="tpSl && !tpError && !slError" class="text-[10px] text-[#2ebd85] font-medium hidden sm:inline-block">Active</span>
                 <span v-if="tpSl && (tpError || slError)" class="text-[10px] text-[#f6465d] font-medium hidden sm:inline-block">Invalid</span>
               </div>
             </label>
             <button v-if="tpSl" class="text-[#848e9c] hover:text-white" @click="isTpSlOpen = true"><Edit2 class="w-3 h-3"/></button>
         </div>


         <label class="flex items-center gap-2 cursor-pointer group mt-1">
           <input type="checkbox" v-model="iceberg" class="hidden" />
           <div class="w-4 h-4 rounded-sm border flex items-center justify-center transition-colors" :class="iceberg ? 'bg-[#F0B90B] border-[#F0B90B]' : 'border-[#848e9c] group-hover:border-[#EAECEF] bg-transparent'">
             <svg v-if="iceberg" viewBox="0 0 14 14" class="w-3 h-3 fill-[#181a20]"><path d="M5.533 10.68L2 7.147l1.067-1.067 2.466 2.453L10.933 3.14l1.067 1.067-6.467 6.473z"/></svg>
           </div>
           <span class="text-[#848e9c] hover:text-[#EAECEF] text-[10px] sm:text-xs font-semibold">Iceberg <span class="text-[#474d57] font-normal ml-1 xl:inline hidden">(Hide)</span></span>
         </label>
      </div>

      <!-- Balances -->
      <div class="flex flex-col gap-1 sm:gap-2 mt-auto">
        <div class="flex justify-between text-[10px] sm:text-xs items-center">
           <span class="text-[#848e9c] font-medium flex items-center gap-1 hover:text-white cursor-pointer">Avbl <Edit2 class="w-2.5 h-2.5 text-[#F0B90B]" /></span>
           <span class="text-[#EAECEF] font-mono font-bold text-[9px] sm:text-xs">{{ orderSide === 'Buy' ? availableUsdt.toFixed(2) + ' USDT' : availableBtc.toFixed(4) + ' BTC' }}</span>
        </div>
        <div v-if="marginEnabled" class="flex justify-between text-[10px] sm:text-xs items-center">
           <span class="text-[#848e9c] font-medium">Available Margin</span>
           <span class="text-[#EAECEF] font-mono font-bold text-[9px] sm:text-xs">{{ availableMargin.toFixed(2) }} USDT</span>
        </div>
        <div class="flex justify-between text-[10px] sm:text-xs items-center">
           <span class="text-[#848e9c] font-medium">Borrow</span>
           <span class="text-[#EAECEF] font-mono font-bold text-[9px] sm:text-xs">{{ borrowValue.toFixed(2) }} USDT</span>
        </div>
      </div>

      <!-- Action Button -->
      <button 
        @click="executeTrade"
        :disabled="!isFormValid"
        class="w-full py-2.5 sm:py-3.5 rounded-xl font-black text-xs sm:text-sm tracking-[0.1em] uppercase transition-all duration-300 transform active:scale-[0.97] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed shadow-lg overflow-hidden group relative mt-4"
        :class="orderSide === 'Buy' ? 'bg-gradient-to-r from-[#0ecb81] to-[#0ecb81]/80 text-[#0b0e11] shadow-[#0ecb81]/20' : 'bg-gradient-to-r from-[#f6465d] to-[#f6465d]/80 text-white shadow-[#f6465d]/20'"
      >
        <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <span class="relative z-10 flex items-center justify-center gap-2">
          {{ orderSide === 'Buy' ? 'Open Long' : 'Open Short' }}
          <ArrowUp v-if="orderSide === 'Buy'" class="w-4 h-4" />
          <ArrowDown v-else class="w-4 h-4" />
        </span>
      </button>

      <!-- TP/SL Popup Overlay -->
      <div v-if="isTpSlOpen" class="absolute inset-0 z-50 bg-[#0b0e11]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div class="bg-[#1e2329] border border-[#2b3139] rounded-lg shadow-2xl w-full p-4 flex flex-col gap-4">
              <div class="flex justify-between items-center text-[#EAECEF] font-semibold text-sm">
                  <span>TP/SL Settings</span>
                  <button @click="isTpSlOpen = false" class="text-[#848e9c] hover:text-white"><X class="w-4 h-4" /></button>
              </div>
              
              <div class="flex flex-col gap-2">
                  <div class="flex justify-between items-center"><span class="text-xs text-[#848e9c]">Take Profit</span></div>
                  <div class="flex gap-2">
                      <div class="flex-1 bg-[#0b0e11] border border-[#2b3139] rounded flex items-center px-2 hover:border-[#474d57] focus-within:border-[#F0B90B] !focus-within:hover:border-[#F0B90B] transition-colors duration-200 relative">
                        <input type="number" step="0.1" v-model="tpPrice" @input="updateTpFromPrice" class="w-full bg-transparent py-1.5 text-xs text-[#EAECEF] outline-none" placeholder="Price"/>
                      </div>
                      <div class="w-12 bg-[#0b0e11] border border-[#2b3139] rounded flex items-center px-1 hover:border-[#474d57] focus-within:border-[#F0B90B] !focus-within:hover:border-[#F0B90B] transition-colors duration-200">
                        <input type="number" step="0.1" v-model="tpPercent" @input="updateTpFromPercent" class="w-full bg-transparent py-1.5 text-xs text-[#EAECEF] outline-none text-right" placeholder="%"/>
                        <span class="text-[#848e9c] text-[10px] ml-0.5">%</span>
                      </div>
                  </div>
                  <div class="flex justify-between gap-1 mt-0.5">
                      <button v-for="pct in [1, 2, 3, 4, 5]" :key="pct" @click="setTpPercent(pct)" class="flex-1 bg-[#2b3139] hover:bg-[#474d57] hover:shadow-md text-[#848e9c] hover:text-[#EAECEF] rounded py-1 text-[10px] transition-all duration-200 hover:-translate-y-0.5">{{ pct }}%</button>
                  </div>
                  <span v-if="tpError" class="text-[#f6465d] text-[10px] mt-0.5 leading-tight">Must be {{ orderSide === 'Buy' ? 'greater' : 'less' }} than order price</span>
              </div>

              <div class="flex flex-col gap-2">
                  <div class="flex justify-between items-center"><span class="text-xs text-[#848e9c]">Stop Loss</span></div>
                  <div class="flex gap-2">
                      <div class="flex-1 bg-[#0b0e11] border border-[#2b3139] rounded flex items-center px-2 hover:border-[#474d57] focus-within:border-[#F0B90B] !focus-within:hover:border-[#F0B90B] transition-colors duration-200 relative">
                        <input type="number" step="0.1" v-model="slPrice" @input="updateSlFromPrice" class="w-full bg-transparent py-1.5 text-xs text-[#EAECEF] outline-none" placeholder="Price"/>
                      </div>
                      <div class="w-12 bg-[#0b0e11] border border-[#2b3139] rounded flex items-center px-1 hover:border-[#474d57] focus-within:border-[#F0B90B] !focus-within:hover:border-[#F0B90B] transition-colors duration-200">
                        <input type="number" step="0.1" v-model="slPercent" @input="updateSlFromPercent" class="w-full bg-transparent py-1.5 text-xs text-[#EAECEF] outline-none text-right" placeholder="%"/>
                        <span class="text-[#848e9c] text-[10px] ml-0.5">%</span>
                      </div>
                  </div>
                   <div class="flex justify-between gap-1 mt-0.5">
                      <button v-for="pct in [1, 2, 3, 4, 5]" :key="pct" @click="setSlPercent(pct)" class="flex-1 bg-[#2b3139] hover:bg-[#474d57] hover:shadow-md text-[#848e9c] hover:text-[#EAECEF] rounded py-1 text-[10px] transition-all duration-200 hover:-translate-y-0.5">{{ pct }}%</button>
                  </div>
                  <span v-if="slError" class="text-[#f6465d] text-[10px] mt-0.5 leading-tight">Must be {{ orderSide === 'Buy' ? 'less' : 'greater' }} than order price</span>
              </div>

              <!-- Risk Management Section -->
              <div class="mt-2 pt-4 border-t border-[#2b3139] flex flex-col gap-3">
                  <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-lg bg-[#F0B90B]/10 flex items-center justify-center text-[#F0B90B]">
                        <Shield class="w-4 h-4" />
                      </div>
                      <span class="text-xs font-bold text-[#EAECEF] uppercase tracking-wider">Risk Management</span>
                  </div>
                  <div class="flex items-center gap-3">
                      <div class="flex-1 bg-[#0b0e11] border border-[#2b3139] rounded flex items-center px-3 hover:border-[#474d57] focus-within:border-[#F0B90B] transition-colors duration-200">
                        <span class="text-[#848e9c] text-[10px] mr-2">RISK</span>
                        <input type="number" v-model="riskUsdt" class="w-full bg-transparent py-2 text-xs text-[#EAECEF] outline-none font-mono" placeholder="Risk (USDT)"/>
                        <span class="text-[#848e9c] text-[10px] ml-2">USDT</span>
                      </div>
                      <button 
                        @click="updateAmountFromRisk"
                        class="bg-[#F0B90B] hover:bg-[#FCD535] text-[#181a20] px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-lg shadow-[#F0B90B]/10"
                      >
                        Auto-Size
                      </button>
                  </div>
                  <p class="text-[9px] text-[#848e9c] leading-relaxed italic">
                    * Calculates position size so you only lose ${{ riskUsdt || 0 }} if the Stop Loss is hit.
                  </p>
              </div>

              <button @click="isTpSlOpen = false" class="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold rounded py-2 text-xs mt-1 transition-colors">Confirm</button>
          </div>
      </div>
    </div>
  </div>
</template>

