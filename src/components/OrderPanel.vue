<script setup lang="ts">
import { ChevronDown, Plus, Minus, ArrowUp, ArrowDown, Info, Edit2, X, Check, TrendingDown, CornerDownRight, Activity, Waypoints, GitCommit, Shield, Settings } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { placeOrder, activePositions, currentPrice, previousPrice, orderBook, selectedPrice, availableUsdt, availableBtc, sharedSlPrice, isRiskModeActive } from '../store/tradeStore';
import OrderBookPanel from './OrderBookPanel.vue';
import { vaultAccounts, fetchVaultAccounts } from '../store/accountStore';
import { useOrderExecution } from '../composables/useOrderExecution';

const { isPending, availableMargin, executeTrade: runTrade } = useOrderExecution();

const orderPrice = ref(75000.00);
const lastOrderPrice = ref(75000.00);
const orderAmount = ref<number | null>(null);
const orderSide = ref<'Buy' | 'Sell'>('Buy');
const isRiskMode = isRiskModeActive;
const riskPercentOfBalance = ref(1); // 1% default
const riskAmountAbsolute = ref(100); // $100 default

const riskInputMode = ref<'percent' | 'absolute'>('percent');

// Extra specific fields for complex types
const stopPrice = ref<number | null>(null);
const limitPrice = ref<number | null>(null);
const callbackRate = ref<number | null>(1.0);
const activationPrice = ref<number | null>(null);

// Institutional / SOR state
const selectedAccountIds = ref<string[]>(['master_main']);
const sorStrategy = ref<'market' | 'iceberg' | 'twap'>('market');
const icebergSlices = ref(10);
const twapDuration = ref(5); // minutes
const showInstitutionalSettings = ref(false);
const isInstitutionalMode = ref(false);

const percentage = ref(0);
const marginEnabled = ref(false);
const leverage = ref(10);
const showOrderTypeDropdown = ref(false);

const orderTypeDropdownRef = ref<HTMLElement | null>(null);
onClickOutside(orderTypeDropdownRef, () => {
    showOrderTypeDropdown.value = false;
});

const orderTypes = ['Limit', 'Market', 'Stop-Limit', 'Stop Market', 'Trailing Stop', 'OCO'] as const;
const orderType = ref<typeof orderTypes[number]>('Limit');

const orderTypeDetails = {
  'Limit': { desc: 'Buy or Sell at a specific price', icon: CornerDownRight },
  'Market': { desc: 'Buy or Sell at best market price', icon: TrendingDown },
  'Stop-Limit': { desc: 'Triggers Limit order when Stop hits', icon: GitCommit },
  'Stop Market': { desc: 'Triggers Market order when Stop hits', icon: Activity },
  'Trailing Stop': { desc: 'Follows price to lock in profits', icon: Activity },
  'OCO': { desc: 'One Cancels the Other', icon: Waypoints }
};

watch(currentPrice, (newPrice, oldPrice) => {
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

  fetchVaultAccounts();
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
  const currentPriceForCalc = orderType.value === 'Market' ? lastOrderPrice.value : orderPrice.value;
  const usdtBase = marginEnabled.value ? availableMargin.value : availableUsdt.value;
  if (orderSide.value === 'Buy') {
    return currentPriceForCalc > 0 ? ((usdtBase * mult) / currentPriceForCalc) : 0;
  }
  return availableBtc.value * mult;
});

const totalCostNumber = computed(() => {
  if (!orderAmount.value || isNaN(orderAmount.value)) return 0;
  const currentPriceForCalc = (orderType.value === 'Market' || orderType.value === 'Trailing Stop') ? lastOrderPrice.value : orderPrice.value;
  return currentPriceForCalc * orderAmount.value;
});

const totalCost = computed(() => {
  return totalCostNumber.value.toFixed(2);
});

const tpError = computed(() => {
  if (!tpPrice.value || !orderPrice.value) return false;
  if (tpPrice.value <= 0 || tpPrice.value > 10000000) return true;
  return orderSide.value === 'Buy' ? tpPrice.value <= orderPrice.value : tpPrice.value >= orderPrice.value;
});

const slError = computed(() => {
  if (!slPrice.value || !orderPrice.value) return false;
  if (slPrice.value <= 0 || slPrice.value > 10000000) return true;
  return orderSide.value === 'Buy' ? slPrice.value >= orderPrice.value : slPrice.value <= orderPrice.value;
});

const orderPriceError = computed(() => {
  if (['Limit', 'Stop-Limit', 'OCO'].includes(orderType.value)) {
     if (orderPrice.value === null || orderPrice.value <= 0) return 'Price must be greater than 0';
     if (orderPrice.value > 10000000) return 'Price exceeds max limit';
  }
  if (['Stop-Limit', 'Stop Market', 'OCO'].includes(orderType.value)) {
     if (stopPrice.value === null || stopPrice.value <= 0) return 'Stop Price > 0';
     if (stopPrice.value > 10000000) return 'Stop Price exceeds limit';
  }
  if (orderType.value === 'OCO') {
     if (limitPrice.value === null || limitPrice.value <= 0) return 'Limit Price > 0';
     if (limitPrice.value > 10000000) return 'Limit Price exceeds limit';
  }
  if (orderType.value === 'Trailing Stop') {
     if (callbackRate.value === null || callbackRate.value < 0.1 || callbackRate.value > 5) return 'Callback 0.1% - 5.0%';
     if (activationPrice.value !== null && (activationPrice.value <= 0 || activationPrice.value > 10000000)) return 'Activation Price invalid';
  }
  return null;
});

const orderAmountError = computed(() => {
  if (orderAmount.value === null) return null;
  if (orderAmount.value <= 0) return 'Amount > 0';
  if (orderAmount.value > 10000) return 'Amount exceeds limit';
  if (orderAmount.value > maxAmount.value) {
    return orderSide.value === 'Buy' ? 'Exceeds buying power' : 'Exceeds balance';
  }
  return null;
});

const isFormValid = computed(() => {
  if (isRiskMode.value) {
    if (!slPrice.value || slError.value) return false;
    if (calculatedRiskSize.value <= 0) return false;
    if (requiredRiskMargin.value > availableUsdt.value) return false;
    if (riskInputMode.value === 'percent' && (riskPercentOfBalance.value <= 0 || riskPercentOfBalance.value > 100)) return false;
    if (riskInputMode.value === 'absolute' && riskAmountAbsolute.value <= 0) return false;
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
    accountIds: isInstitutionalMode.value ? selectedAccountIds.value : undefined,
    sorConfig: isInstitutionalMode.value ? {
        strategy: sorStrategy.value,
        icebergSlices: sorStrategy.value === 'iceberg' ? icebergSlices.value : undefined,
        twapWindowMs: sorStrategy.value === 'twap' ? twapDuration.value * 60 * 1000 : undefined
    } : undefined,
    stopPrice: stopPrice.value || undefined,
    callbackRate: callbackRate.value || undefined,
    activationPrice: activationPrice.value || undefined,
    takeProfitPrice: finalTp || undefined,
    stopLossPrice: finalSl || undefined,
    iceberg: sorStrategy.value === 'iceberg'
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

</script>

<template>
  <div class="flex flex-col lg:flex-row gap-4 h-full w-full font-sans relative">
    
    <!-- Left: Order Book / Trades Panel -->
    <div class="hidden lg:flex flex-col w-[45%] max-w-[320px] shrink-0 h-full relative z-10 transition-all duration-300">
        <OrderBookPanel class="h-full rounded-2xl" />
    </div>

    <!-- Right: Order Panel - Fully Glassmorphism -->
    <div class="bg-gradient-to-br from-white/[0.04] to-transparent backdrop-blur-[60px] border border-white/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.5)] rounded-[24px] p-5 lg:p-6 flex flex-col flex-1 shrink text-[#EAECEF] relative overflow-y-auto no-scrollbar gpu-glass z-20 overflow-hidden transform-gpu">
      
      <!-- Liquid Background Ambient Glow Inside Container -->
      <div 
        class="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] opacity-[0.08] blur-[80px] rounded-full pointer-events-none transition-all duration-1000 mix-blend-screen" 
        :class="orderSide === 'Buy' ? 'bg-[#0ecb81]' : 'bg-[#f6465d]'">
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between mb-5 border-b border-white/[0.05] pb-4 transition-all duration-300 relative z-10">
        
        <div class="flex flex-col gap-1">
          <span class="text-white text-[20px] font-bold tracking-tight text-left">
            {{ marginEnabled ? 'Margin Trading' : 'Spot Trading' }}
          </span>
          <span class="text-[11px] text-[#848e9c] uppercase tracking-widest font-medium">Place your order</span>
        </div>

        <div class="flex items-center gap-3 bg-black/20 p-1.5 rounded-full border border-white/5 shadow-inner">
          <span class="text-[11px] font-bold uppercase tracking-wider pl-2 text-[#848e9c]" :class="marginEnabled ? 'text-white' : ''">Margin</span>
          <button 
            @click="marginEnabled = !marginEnabled"
            class="w-10 h-5 rounded-full relative transition-all duration-300 shrink-0 shadow-sm border border-white/10"
            :class="marginEnabled ? 'bg-gradient-to-r from-[#F0B90B] to-[#FCD535]' : 'bg-[#2b3139] hover:bg-[#323942]'"
          >
            <div 
              class="w-3.5 h-3.5 rounded-full bg-white absolute top-[2px] transition-all duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
              :class="marginEnabled ? 'left-[22px]' : 'left-[3px]'"
            ></div>
          </button>
        </div>
      </div>

      <!-- Buy / Sell Segmented Control -->
      <div class="flex p-1.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5 mb-5 relative z-10 shadow-inner">
        <button 
          @click="orderSide = 'Buy'"
          class="flex-1 py-3 rounded-xl font-black text-[13px] uppercase tracking-widest transition-all duration-500 text-center relative overflow-hidden group"
          :class="orderSide === 'Buy' ? 'text-white shadow-[0_8px_30px_rgba(14,203,129,0.3)] bg-gradient-to-r from-[#0ecb81]/80 to-[#2ebd85]/80 border border-[#0ecb81]/40' : 'text-[#848e9c] hover:text-[#EAECEF] hover:bg-white/5 border border-transparent'"
        >
          Buy
        </button>
        <button 
          @click="orderSide = 'Sell'"
          class="flex-1 py-3 rounded-xl font-black text-[13px] uppercase tracking-widest transition-all duration-500 text-center relative overflow-hidden group"
          :class="orderSide === 'Sell' ? 'text-white shadow-[0_8px_30px_rgba(246,70,93,0.3)] bg-gradient-to-r from-[#f6465d]/80 to-[#eb3b51]/80 border border-[#f6465d]/40' : 'text-[#848e9c] hover:text-[#EAECEF] hover:bg-white/5 border border-transparent'"
        >
          Sell
        </button>
      </div>

      <!-- Leverage Slider (Margin Only) -->
      <div v-if="marginEnabled" class="flex flex-col gap-2.5 mb-6 px-1 relative z-10 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div class="flex justify-between items-center text-[11px] text-[#848e9c] font-bold uppercase tracking-widest">
          <span>Leverage Cross</span>
          <span class="text-[#F0B90B] bg-[#F0B90B]/10 px-2 py-0.5 rounded shadow-sm">{{ leverage }}x</span>
        </div>
        <input 
          type="range" 
          v-model="leverage" 
          min="1" 
          max="100" 
          step="1"
          class="w-full h-1.5 bg-[#1e2329] rounded-lg appearance-none cursor-pointer hover:bg-white/10 transition-colors accent-[#F0B90B]"
        />
        <div class="flex justify-between text-[9px] text-[#474d57] font-medium tracking-wider px-0.5">
          <span>1x</span>
          <span>25x</span>
          <span>50x</span>
          <span>75x</span>
          <span>100x</span>
        </div>
      </div>

      <!-- Type Select & Params -->
      <div class="flex flex-col gap-4 relative z-10 flex-1 min-h-[0]">
        
        <!-- Strategy / Type Select -->
        <div class="flex justify-between items-center mb-2">
           <!-- Order Type Dropdown Trigger -->
           <div class="relative" ref="orderTypeDropdownRef">
             <button 
               @click="showOrderTypeDropdown = !showOrderTypeDropdown"
               class="flex items-center gap-1.5 text-white font-bold text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all shadow-sm focus:ring-2 focus:ring-[#F0B90B]/50 outline-none"
             >
               {{ orderType }}
               <ChevronDown class="w-4 h-4 text-[#848e9c]" />
             </button>
             
             <!-- Desktop Dropdown -->
             <transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="transform scale-95 opacity-0"
                enter-to-class="transform scale-100 opacity-100"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="transform scale-100 opacity-100"
                leave-to-class="transform scale-95 opacity-0"
             >
               <div v-if="showOrderTypeDropdown" class="flex flex-col absolute top-full left-0 mt-2 w-64 bg-[#181a20]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                 <div 
                   v-for="type in orderTypes" 
                   :key="type"
                   @click="orderType = type as any; showOrderTypeDropdown = false"
                   class="px-4 py-3 text-sm hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-3 border-b border-white/5 last:border-0"
                   :class="orderType === type ? 'text-[#F0B90B] bg-white/[0.02]' : 'text-[#EAECEF]'"
                 >
                   <component :is="orderTypeDetails[type].icon" class="w-4 h-4 opacity-70" />
                   <div class="flex flex-col">
                      <span class="font-bold">{{ type }}</span>
                      <span class="text-[10px] text-[#848e9c] leading-tight mt-0.5">{{ orderTypeDetails[type].desc }}</span>
                   </div>
                 </div>
               </div>
             </transition>
           </div>
           
           <!-- Setup Toggle Grid -->
           <div class="flex bg-black/20 p-1 rounded-xl border border-white/5" >
             <button 
                @click="isRiskMode = false"
                class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                :class="!isRiskMode ? 'bg-[#F0B90B] text-black shadow-md' : 'text-[#848e9c] hover:text-white'"
                
             >Standard</button>
             <button 
                @click="isRiskMode = true"
                class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                :class="isRiskMode ? 'bg-gradient-to-br from-[#0ecb81] to-[#2ebd85] text-white shadow-md' : 'text-[#848e9c] hover:text-white'"
                
             ><Shield class="w-3 h-3" /> Risk Setup</button>
           </div>
        </div>

        <!-- Scrollable Inputs Area -->
        <div class="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3.5 pb-4">
            
            <!-- Risk Setup Inputs -->
            <div v-if="isRiskMode" class="flex flex-col gap-4 p-4 rounded-2xl bg-[#0ecb81]/[0.03] border border-[#0ecb81]/10">
                <div class="flex flex-col gap-2">
                   <div class="flex items-center justify-between">
                     <span class="text-[11px] font-bold text-[#0ecb81] uppercase tracking-widest flex items-center gap-1.5"><Activity class="w-3.5 h-3.5"/> Risk Per Trade</span>
                     <div class="flex rounded-lg bg-black/20 border border-white/5 p-0.5">
                         <button @click="riskInputMode = 'percent'" :class="cn('px-2.5 py-1 text-[9px] font-bold rounded-md uppercase', riskInputMode === 'percent' ? 'bg-[#0ecb81] text-white shadow-sm' : 'text-[#848e9c] hover:text-white')">% Bal</button>
                         <button @click="riskInputMode = 'absolute'" :class="cn('px-2.5 py-1 text-[9px] font-bold rounded-md uppercase', riskInputMode === 'absolute' ? 'bg-[#0ecb81] text-white shadow-sm' : 'text-[#848e9c] hover:text-white')">Abs $</button>
                     </div>
                   </div>

                   <div v-if="riskInputMode === 'percent'" class="flex items-center bg-black/30 rounded-xl px-4 py-3 border focus-within:border-[#0ecb81] transition-colors" :class="riskPercentOfBalance <= 0 || riskPercentOfBalance > 100 ? 'border-[#f6465d]' : 'border-white/5'">
                     <input type="number" :min="0" :step="0.1" :max="100" v-model="riskPercentOfBalance" class="w-full bg-transparent outline-none font-mono text-base text-white" />
                     <span class="text-[11px] text-[#848e9c] font-bold">%</span>
                   </div>
                   <div v-else class="flex items-center bg-black/30 rounded-xl px-4 py-3 border focus-within:border-[#0ecb81] transition-colors" :class="riskAmountAbsolute <= 0 ? 'border-[#f6465d]' : 'border-white/5'">
                     <input type="number" :min="0" :step="1" v-model="riskAmountAbsolute" class="w-full bg-transparent outline-none font-mono text-base text-white" />
                     <span class="text-[11px] text-[#848e9c] font-bold">USDT</span>
                   </div>
                </div>

                <div class="flex flex-col gap-2">
                   <span class="text-[10px] font-bold text-[#848e9c] uppercase tracking-widest pl-1">Stop Loss Price</span>
                   <div class="flex items-center bg-black/30 rounded-xl px-4 py-3 border focus-within:border-[#F0B90B] transition-colors" :class="slError ? 'border-[#f6465d]' : 'border-white/5'">
                       <input type="number" step="0.1" v-model="slPrice" placeholder="Enter Exit Price" class="flex-1 bg-transparent outline-none font-mono text-base text-white text-center" />
                   </div>
                   <div class="flex items-center justify-between px-1">
                       <span class="text-[9px] text-[#474d57] italic">Drag line on chart to set</span>
                       <div class="flex gap-1.5">
                           <button v-for="pct in [1, 2, 5, 10]" :key="pct" @click="setSlPercent(pct)" class="text-[10px] font-bold px-2 py-1 bg-white/5 border border-white/5 hover:border-white/20 text-[#848e9c] rounded-lg hover:text-white hover:bg-white/10 transition-all">{{ pct }}%</button>
                       </div>
                   </div>
                </div>

                <!-- Live Calc -->
                <div class="pt-4 border-t border-white/10 flex flex-col gap-2.5">
                   <div class="flex justify-between items-center bg-white/[0.02] px-3 py-2 rounded-lg">
                       <span class="text-[11px] text-[#848e9c] font-medium">Position Size</span>
                       <span class="text-sm font-mono font-bold text-white">{{ calculatedRiskSize }} <span class="text-[10px] text-[#848e9c] ml-1">BTC</span></span>
                   </div>
                   <div class="flex justify-between items-center bg-white/[0.02] px-3 py-2 rounded-lg border border-transparent transition-colors" :class="requiredRiskMargin > availableUsdt ? 'border-[#f6465d]/50 bg-[#f6465d]/10' : ''">
                       <span class="text-[11px] text-[#848e9c] font-medium">Req Margin</span>
                       <span class="text-sm font-mono font-bold" :class="requiredRiskMargin > availableUsdt ? 'text-[#f6465d]' : 'text-[#0ecb81]'">{{ requiredRiskMargin.toFixed(2) }} <span class="text-[10px] text-[#848e9c] ml-1">USDT</span></span>
                   </div>
                </div>
            </div>

            <!-- Standard Inputs setup -->
            <template v-else>
               
               <!-- Dynamic Pre-Price Inputs -->
               <div v-if="['Stop-Limit', 'Stop Market', 'OCO'].includes(orderType)" class="flex flex-col gap-1.5 group">
                  <div class="flex items-center bg-black/20 hover:bg-black/30 border rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-[#F0B90B]/30" :class="orderPriceError && orderPriceError.includes('Stop Price') ? 'border-[#f6465d]' : 'border-white/10'">
                     <Minus class="w-4 h-4 text-[#848e9c] cursor-pointer hover:text-white" @click="stopPrice = Math.max(0, parseFloat(((stopPrice || 0) - 0.1).toFixed(2)))" />
                     <div class="flex-1 flex flex-col justify-center items-center relative gap-0.5">
                        <span class="text-[10px] text-[#848e9c] font-medium uppercase tracking-widest">Stop trigger</span>
                        <input type="number" v-model="stopPrice" placeholder="0.00" class="w-full text-center bg-transparent outline-none font-mono text-base text-white placeholder-[#474d57]" />
                     </div>
                     <Plus class="w-4 h-4 text-[#848e9c] cursor-pointer hover:text-white" @click="stopPrice = parseFloat(((stopPrice || 0) + 0.1).toFixed(2))" />
                  </div>
               </div>

               <div v-if="orderType === 'OCO'" class="flex flex-col gap-1.5 group">
                  <div class="flex items-center bg-black/20 hover:bg-black/30 border rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-[#F0B90B]/30" :class="orderPriceError && orderPriceError.includes('Limit Price') ? 'border-[#f6465d]' : 'border-white/10'">
                     <Minus class="w-4 h-4 text-[#848e9c] cursor-pointer hover:text-white" @click="limitPrice = Math.max(0, parseFloat(((limitPrice || 0) - 0.1).toFixed(2)))" />
                     <div class="flex-1 flex flex-col justify-center items-center relative gap-0.5">
                        <span class="text-[10px] text-[#848e9c] font-medium uppercase tracking-widest">Limit order</span>
                        <input type="number" v-model="limitPrice" placeholder="0.00" class="w-full text-center bg-transparent outline-none font-mono text-base text-white placeholder-[#474d57]" />
                     </div>
                     <Plus class="w-4 h-4 text-[#848e9c] cursor-pointer hover:text-white" @click="limitPrice = parseFloat(((limitPrice || 0) + 0.1).toFixed(2))" />
                  </div>
               </div>

               <!-- Trailing Stop Specs -->
               <div v-if="orderType === 'Trailing Stop'" class="grid grid-cols-2 gap-3">
                  <div class="flex items-center bg-black/20 hover:bg-black/30 border rounded-xl px-3 py-2 transition-all" :class="orderPriceError && orderPriceError.includes('Activation') ? 'border-[#f6465d]' : 'border-white/10'">
                       <div class="flex-1 flex flex-col justify-center items-center relative gap-0.5">
                          <span class="text-[9px] text-[#848e9c] font-medium uppercase tracking-widest text-center">Activation</span>
                          <input type="number" v-model="activationPrice" placeholder="Market" class="w-full text-center bg-transparent outline-none font-mono text-sm text-white placeholder-[#474d57]" />
                       </div>
                  </div>
                  <div class="flex items-center bg-black/20 hover:bg-black/30 border rounded-xl px-3 py-2 transition-all" :class="orderPriceError && orderPriceError.includes('Callback') ? 'border-[#f6465d]' : 'border-white/10'">
                       <div class="flex-1 flex flex-col justify-center items-center relative gap-0.5">
                          <span class="text-[9px] text-[#848e9c] font-medium uppercase tracking-widest text-center">Callback Rate (%)</span>
                          <input type="number" min="0.1" max="5.0" step="0.1" v-model="callbackRate" placeholder="1.0" class="w-full text-center bg-transparent outline-none font-mono text-sm text-white placeholder-[#474d57]" />
                       </div>
                  </div>
               </div>
               
               <!-- Price -->
               <div v-if="['Limit', 'Stop-Limit', 'OCO'].includes(orderType)" class="flex flex-col gap-1.5 group">
                  <div 
                    class="flex items-center bg-white/[0.02] hover:bg-white/[0.05] border rounded-2xl p-1 transition-all duration-300 focus-within:border-[#F0B90B]/50 focus-within:bg-white/[0.08] focus-within:shadow-[0_0_20px_rgba(240,185,11,0.05)]"
                    :class="orderPriceError && orderPriceError.startsWith('Price') ? 'border-[#f6465d]/50 bg-[#f6465d]/5' : 'border-white/10'"
                  >
                     <button 
                        @click="orderPrice = Math.max(0, parseFloat(((orderPrice || 0) - 0.1).toFixed(2)))"
                        class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-[#848e9c] hover:text-white transition-all active:scale-90"
                     >
                        <Minus class="w-4 h-4" />
                     </button>
                     <div class="flex-1 flex flex-col justify-center items-center py-1">
                        <span class="text-[9px] text-[#848e9c] font-black uppercase tracking-[0.2em] mb-0.5">Price (USDT)</span>
                        <input type="number" v-model="orderPrice" placeholder="0.00" class="w-full text-center bg-transparent outline-none font-mono text-lg text-white font-bold placeholder-[#474d57]" />
                     </div>
                     <button 
                        @click="orderPrice = parseFloat(((orderPrice || 0) + 0.1).toFixed(2))"
                        class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-[#848e9c] hover:text-white transition-all active:scale-90"
                     >
                        <Plus class="w-4 h-4" />
                     </button>
                  </div>
               </div>

               <!-- Market Price Fake Field -->
               <div v-if="orderType === 'Market'" class="flex items-center bg-[#1e2329]/50 border border-white/5 rounded-xl px-4 py-4 cursor-not-allowed">
                  <span class="flex-1 text-center text-[#848e9c] font-mono text-sm italic">Execute at Best Market Price</span>
               </div>

               <!-- Amount -->
               <div class="flex flex-col group">
                  <div 
                    class="flex items-center bg-white/[0.02] hover:bg-white/[0.05] border rounded-2xl p-1 transition-all duration-300 focus-within:border-[#F0B90B]/50 focus-within:bg-white/[0.08] focus-within:shadow-[0_0_20px_rgba(240,185,11,0.05)]"
                    :class="orderAmountError ? 'border-[#f6465d]/50 bg-[#f6465d]/5' : 'border-white/10'"
                  >
                     <button 
                        @click="orderAmount = Math.max(0, parseFloat(((orderAmount || 0) - 0.001).toFixed(4)))"
                        class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-[#848e9c] hover:text-white transition-all active:scale-90"
                     >
                        <Minus class="w-4 h-4" />
                     </button>
                     <div class="flex-1 flex flex-col justify-center items-center py-1">
                        <span class="text-[9px] text-[#848e9c] font-black uppercase tracking-[0.2em] mb-0.5">Amount (BTC)</span>
                        <input type="number" v-model="orderAmount" placeholder="0.00" class="w-full text-center bg-transparent outline-none font-mono text-lg text-white font-bold placeholder-[#474d57]" />
                     </div>
                     <button 
                        @click="orderAmount = parseFloat(((orderAmount || 0) + 0.001).toFixed(4))"
                        class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-[#848e9c] hover:text-white transition-all active:scale-90"
                     >
                        <Plus class="w-4 h-4" />
                     </button>
                  </div>
                  <div v-if="orderAmountError" class="text-[#f6465d] text-[10px] font-black mt-1.5 pl-4 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle class="w-3 h-3" /> {{ orderAmountError }}
                  </div>
               </div>

               <!-- Optional Total -->
               <div class="flex items-center justify-between text-[#848e9c] bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 shadow-inner">
                 <span class="text-[11px] font-bold uppercase tracking-widest">Total</span>
                 <span class="font-mono text-[14px] text-white">{{ totalCost }} <span class="text-[10px] text-[#848e9c]">USDT</span></span>
               </div>

            </template>
            <!-- /Standard Inputs ends -->
            
            <!-- Quick Percentage Slider -->
            <div class="group relative px-2 pt-6 pb-2">
              <div class="absolute inset-0 bg-white/[0.02] rounded-xl group-hover:bg-white/[0.04] transition-colors -z-10"></div>
              <div class="w-full h-1.5 bg-[#1e2329] rounded-full relative">
                 <div class="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-300" :class="orderSide === 'Buy' ? 'bg-[#0ecb81]' : 'bg-[#f6465d]'" :style="`width: ${percentage}%`"></div>
                 
                 <div 
                   v-for="p in [0, 25, 50, 75, 100]" :key="p"
                   @click="setPercentage(p)"
                   class="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-[3px] bg-[#1e2329] cursor-pointer hover:scale-125 transition-transform z-10 shadow-sm"
                   :class="percentage >= p ? (orderSide === 'Buy' ? 'border-[#0ecb81]' : 'border-[#f6465d]') : 'border-[#474d57] hover:border-white'"
                   :style="`left: ${p === 100 ? 'calc(100% - 16px)' : p + '%'}`"
                 ></div>
              </div>
            </div>

            <!-- Extra Tools: TP/SL and Institutional -->
            <div class="flex flex-col gap-2 mt-2 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
               <!-- TP/SL Toggle line -->
               <div class="flex items-center justify-between">
                  <label class="flex items-center gap-3 cursor-pointer group/tpsl">
                     <div class="relative w-8 h-4 bg-black/40 rounded-full border border-white/10 transition-colors" :class="tpSl ? 'bg-[#F0B90B]/20 border-[#F0B90B]/50' : ''">
                        <input type="checkbox" v-model="tpSl" class="hidden" @change="handleTpSlToggle" />
                        <div class="absolute top-[1px] w-3 h-3 bg-[#848e9c] rounded-full transition-all shadow-sm" :class="tpSl ? 'left-[14px] bg-[#F0B90B]' : 'left-[1px]'"></div>
                     </div>
                     <span class="text-[11px] font-bold text-[#848e9c] group-hover/tpsl:text-white transition-colors" :class="tpSl ? 'text-[#F0B90B]' : ''">Take Profit / Stop Loss</span>
                  </label>
                  <button v-if="tpSl" @click="isTpSlOpen = true" class="text-[#F0B90B] bg-[#F0B90B]/10 hover:bg-[#F0B90B]/20 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center"><Edit2 class="w-3 h-3 mr-1" /> Edit</button>
               </div>

               <!-- Institutional Mode Toggle line -->
               <div class="flex items-center justify-between mt-2">
                  <label class="flex items-center gap-3 cursor-pointer group/inst">
                     <div class="relative w-8 h-4 bg-black/40 rounded-full border border-white/10 transition-colors" :class="isInstitutionalMode ? 'bg-[#627EEA]/20 border-[#627EEA]/50' : ''">
                        <input type="checkbox" v-model="isInstitutionalMode" class="hidden" />
                        <div class="absolute top-[1px] w-3 h-3 bg-[#848e9c] rounded-full transition-all shadow-sm" :class="isInstitutionalMode ? 'left-[14px] bg-[#627EEA]' : 'left-[1px]'"></div>
                     </div>
                     <span class="text-[11px] font-bold text-[#848e9c] group-hover/inst:text-white transition-colors flex items-center gap-1.5" :class="isInstitutionalMode ? 'text-[#627EEA]' : ''">
                        PRO Routing <Shield class="w-3 h-3"/>
                     </span>
                  </label>
                  <button v-if="isInstitutionalMode" @click="showInstitutionalSettings = !showInstitutionalSettings" class="text-[#627EEA] bg-[#627EEA]/10 hover:bg-[#627EEA]/20 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors"><Settings class="w-3 h-3" :class="showInstitutionalSettings ? 'animate-spin-slow' : ''"/></button>
               </div>

               <!-- Institutional details slide down -->
               <div v-if="isInstitutionalMode && showInstitutionalSettings" class="mt-4 pt-4 border-t border-white/5 flex flex-col gap-4 animate-in slide-in-from-top-2">
                 <div class="flex flex-col gap-2">
                   <span class="text-[10px] font-bold text-[#627EEA] uppercase tracking-widest">Multi-Account Distribution</span>
                   <div class="flex flex-wrap gap-2">
                      <div 
                         v-for="acc in vaultAccounts" :key="acc.id"
                         @click="selectedAccountIds.includes(acc.id) ? selectedAccountIds = selectedAccountIds.filter(id => id !== acc.id) : selectedAccountIds.push(acc.id)"
                         class="px-3 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all uppercase tracking-wide flex items-center gap-1"
                         :class="selectedAccountIds.includes(acc.id) ? 'bg-[#627EEA]/10 border-[#627EEA] text-[#627EEA]' : 'bg-black/20 border-white/10 text-[#848e9c] hover:bg-white/5 hover:text-white'"
                      >
                         <Check class="w-3 h-3" v-if="selectedAccountIds.includes(acc.id)"/>
                         {{ acc.name }}
                      </div>
                   </div>
                 </div>
                 
                 <div class="flex flex-col gap-2">
                   <span class="text-[10px] font-bold text-[#627EEA] uppercase tracking-widest">SOR Algorithm</span>
                   <div class="flex bg-black/20 p-1 rounded-xl border border-white/10">
                      <button 
                         v-for="s in ['market', 'iceberg', 'twap']" :key="s"
                         @click="sorStrategy = s as any"
                         class="flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase"
                         :class="sorStrategy === s ? 'bg-[#627EEA] text-white shadow-md' : 'text-[#848e9c] hover:text-white'"
                      >{{ s }}</button>
                   </div>
                 </div>
                 
                 <!-- Dynamic params -->
                 <div v-if="sorStrategy === 'iceberg'" class="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                    <div class="flex justify-between items-center text-[10px] font-bold text-white uppercase tracking-widest">
                       Iceberg Slices <span class="bg-[#627EEA]/20 text-[#627EEA] px-2 py-0.5 rounded">{{ icebergSlices }}</span>
                    </div>
                    <input type="range" v-model.number="icebergSlices" min="2" max="50" class="w-full accent-[#627EEA]" />
                 </div>

                 <div v-if="sorStrategy === 'twap'" class="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                    <div class="flex justify-between items-center text-[10px] font-bold text-white uppercase tracking-widest">
                       TWAP Duration <span class="bg-[#627EEA]/20 text-[#627EEA] px-2 py-0.5 rounded">{{ twapDuration }}m</span>
                    </div>
                    <input type="range" v-model.number="twapDuration" min="1" max="60" class="w-full accent-[#627EEA]" />
                 </div>

               </div>
            </div>

        </div> <!-- /End Scrollable -->

      </div>

      <!-- Footer Info & Button -->
      <div class="mt-auto pt-4 border-t border-white/5 flex flex-col gap-3 relative z-10 bg-gradient-to-t from-black/20 to-transparent">
         <div class="flex justify-between items-center text-xs font-medium px-2">
             <span class="text-[#848e9c]">Avbl Balance</span>
             <span class="text-white font-mono">{{ orderSide === 'Buy' ? availableUsdt.toFixed(2) + ' USDT' : availableBtc.toFixed(4) + ' BTC' }}</span>
         </div>
         <div v-if="marginEnabled" class="flex justify-between items-center text-xs font-medium px-2">
             <span class="text-[#848e9c]">Margin Avbl</span>
             <span class="text-white font-mono">{{ availableMargin.toFixed(2) }} USDT</span>
         </div>

         <button 
            @click="executeTrade"
            :disabled="!isFormValid || isPending"
            class="w-full py-4 rounded-xl font-black text-[15px] tracking-[0.15em] uppercase transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:shadow-lg relative overflow-hidden group border border-white/10"
            :class="orderSide === 'Buy' ? 'bg-gradient-to-br from-[#0ecb81] to-[#2ebd85] text-[#0b0e11] hover:scale-[1.01]' : 'bg-gradient-to-br from-[#f6465d] to-[#eb3b51] text-white hover:scale-[1.01]'"
         >
            <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-50 group-hover:opacity-0 transition-opacity"></div>
            <div class="absolute top-0 left-0 w-full h-1/2 bg-white/20 blur-md pointer-events-none group-hover:bg-white/30 transition-colors"></div>
            <span class="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
               <span v-if="isPending" class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
               {{ orderSide === 'Buy' ? 'Execute Long' : 'Execute Short' }} 
               <ArrowUp v-if="orderSide === 'Buy' && !isPending" class="w-5 h-5 mx-1" />
               <ArrowDown v-if="orderSide === 'Sell' && !isPending" class="w-5 h-5 mx-1" />
            </span>
         </button>
      </div>

    </div>

    <!-- Advanced TP/SL Overlay -->
    <Teleport to="body">
       <div v-if="isTpSlOpen" class="fixed inset-0 z-[100] bg-[#030712]/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-0 animate-in fade-in duration-300">
           <div class="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-[32px] shadow-[0_32px_80px_rgba(0,0,0,0.8)] w-full max-w-[420px] p-6 lg:p-8 flex flex-col gap-6 transform transition-all relative overflow-hidden">
             
             <!-- Glow -->
             <div class="absolute -top-16 -right-16 w-48 h-48 bg-[#F0B90B] opacity-[0.15] blur-[60px] rounded-full pointer-events-none"></div>

             <div class="flex justify-between items-center relative z-10">
                 <h3 class="text-white text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Advanced Protection</h3>
                 <button @click="isTpSlOpen = false" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-[#848e9c] hover:text-white transition-all transform hover:scale-105"><X class="w-4 h-4" /></button>
             </div>

             <!-- TP -->
             <div class="flex flex-col gap-3 relative z-10">
                 <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-[#0ecb81] shadow-[0_0_12px_#0ecb81]"></div> <span class="text-[13px] font-bold text-white uppercase tracking-widest">Take Profit</span></div>
                 <div class="flex gap-3">
                     <div class="flex-1 bg-black/40 border border-white/5 hover:border-white/10 focus-within:border-[#0ecb81]/50 rounded-xl px-4 py-3 transition-colors flex flex-col">
                         <span class="text-[10px] text-[#848e9c] uppercase font-bold tracking-wider mb-1">Trigger Price</span>
                         <input type="number" v-model="tpPrice" @input="updateTpFromPrice" class="w-full bg-transparent font-mono text-base text-white outline-none placeholder-[#474d57]" placeholder="0.00" />
                     </div>
                     <div class="w-28 bg-black/40 border border-white/5 hover:border-white/10 focus-within:border-[#0ecb81]/50 rounded-xl px-3 py-3 transition-colors flex flex-col">
                         <span class="text-[10px] text-[#848e9c] uppercase font-bold tracking-wider mb-1">ROI %</span>
                         <div class="flex items-center mt-auto">
                            <input type="number" v-model="tpPercent" @input="updateTpFromPercent" class="w-full bg-transparent font-mono text-base text-white outline-none text-right placeholder-[#474d57]" placeholder="0" />
                            <span class="text-white font-bold ml-1">%</span>
                         </div>
                     </div>
                 </div>
                 <div class="flex justify-between gap-2.5 mt-1">
                     <button v-for="pct in [1, 2, 5, 10, 25]" :key="pct" @click="setTpPercent(pct)" class="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold text-[#848e9c] hover:text-white transition-all transform hover:-translate-y-0.5">{{ pct }}%</button>
                 </div>
                 <span v-if="tpError" class="text-[11px] text-[#f6465d] font-bold px-1 mt-1 flex items-center gap-1"><Info class="w-3 h-3"/> Price must be {{ orderSide === 'Buy' ? 'greater' : 'less' }} than entry</span>
             </div>

             <!-- SL -->
             <div class="flex flex-col gap-3 pb-5 border-b border-white/5 relative z-10">
                 <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-[#f6465d] shadow-[0_0_12px_#f6465d]"></div> <span class="text-[13px] font-bold text-white uppercase tracking-widest">Stop Loss</span></div>
                 <div class="flex gap-3">
                     <div class="flex-1 bg-black/40 border border-white/5 hover:border-white/10 focus-within:border-[#f6465d]/50 rounded-xl px-4 py-3 transition-colors flex flex-col">
                         <span class="text-[10px] text-[#848e9c] uppercase font-bold tracking-wider mb-1">Trigger Price</span>
                         <input type="number" v-model="slPrice" @input="updateSlFromPrice" class="w-full bg-transparent font-mono text-base text-white outline-none placeholder-[#474d57]" placeholder="0.00" />
                     </div>
                     <div class="w-28 bg-black/40 border border-white/5 hover:border-white/10 focus-within:border-[#f6465d]/50 rounded-xl px-3 py-3 transition-colors flex flex-col">
                         <span class="text-[10px] text-[#848e9c] uppercase font-bold tracking-wider mb-1">Loss %</span>
                         <div class="flex items-center mt-auto">
                            <input type="number" v-model="slPercent" @input="updateSlFromPercent" class="w-full bg-transparent font-mono text-base text-white outline-none text-right placeholder-[#474d57]" placeholder="0" />
                            <span class="text-white font-bold ml-1">%</span>
                         </div>
                     </div>
                 </div>
                 <div class="flex justify-between gap-2.5 mt-1">
                     <button v-for="pct in [1, 2, 5, 10, 25]" :key="pct" @click="setSlPercent(pct)" class="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold text-[#848e9c] hover:text-white transition-all transform hover:-translate-y-0.5">{{ pct }}%</button>
                 </div>
                 <span v-if="slError" class="text-[11px] text-[#f6465d] font-bold px-1 mt-1 flex items-center gap-1"><Info class="w-3 h-3"/> Price must be {{ orderSide === 'Buy' ? 'less' : 'greater' }} than entry</span>
             </div>

             <!-- Auto Risk Area -->
             <div class="flex flex-col gap-4 pt-1 relative z-10">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#F0B90B] uppercase tracking-widest flex items-center gap-2"><Shield class="w-4 h-4"/> Risk Target Sizing</span>
                    <button class="bg-gradient-to-r from-[#F0B90B] to-[#FCD535] text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-lg transform active:scale-95 transition-all text-shadow-sm hover:shadow-[#F0B90B]/30" @click="updateAmountFromRisk">Auto Size Risk</button>
                </div>
                <div class="flex items-center bg-black/40 border border-white/5 focus-within:border-[#F0B90B]/50 rounded-xl px-4 py-3 transition-colors">
                    <span class="text-[11px] text-[#848e9c] uppercase font-bold mr-3 tracking-widest">Max Risk Loss</span>
                    <input type="number" v-model="riskUsdt" class="w-full bg-transparent font-mono text-lg text-[#F0B90B] outline-none text-right font-bold" />
                    <span class="text-[11px] text-white uppercase font-bold ml-2">USDT</span>
                </div>
             </div>

             <div class="pt-4 flex gap-3 relative z-10 w-full">
                <button @click="tpSl = false; isTpSlOpen = false" class="py-3 flex-1 bg-white/[0.05] hover:bg-white/[0.1] border border-white/5 rounded-xl font-bold text-white text-[13px] uppercase tracking-widest transition-all">Disable</button>
                <button @click="isTpSlOpen = false" class="py-3 flex-[2] bg-gradient-to-r from-[#F0B90B] to-[#FCD535] hover:brightness-110 rounded-xl font-black text-black text-[13px] uppercase tracking-widest transition-all shadow-[0_8px_20px_rgba(240,185,11,0.25)] border border-white/10">Save Parameters</button>
             </div>
           </div>
       </div>
    </Teleport>
  </div>
</template>
