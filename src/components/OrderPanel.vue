<script setup lang="ts">
import { ChevronDown, Plus, Minus, ArrowUp, ArrowDown, Info, Edit2, X } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { ref, computed, watch } from 'vue';
import { addPosition } from '../store/tradeStore';

const isPending = ref(false);
const orderPrice = ref(67412.35);
const orderAmount = ref<number | null>(null);
const orderSide = ref<'Buy' | 'Sell'>('Buy');
const orderType = ref<'Limit' | 'Market' | 'Stop-Limit'>('Limit');
const showOrderTypeDropdown = ref(false);
const marginEnabled = ref(false);
const iceberg = ref(false);
const percentage = ref(0);

const tpSl = ref(false);
const isTpSlOpen = ref(false);
const tpPrice = ref<number | null>(null);
const slPrice = ref<number | null>(null);
const tpPercent = ref<number | null>(5);
const slPercent = ref<number | null>(5);

const availableUsdt = ref(9840.79);
const availableBtc = ref(0.4521);
const borrowValue = ref(0.00);

const maxAmount = computed(() => {
  if (orderSide.value === 'Buy') {
    return orderPrice.value > 0 ? (availableUsdt.value / orderPrice.value) : 0;
  }
  return availableBtc.value;
});

const totalCost = computed(() => {
  if (!orderAmount.value || isNaN(orderAmount.value)) return '0.00';
  return (orderPrice.value * orderAmount.value).toFixed(2);
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
  if (orderPrice.value === null || orderPrice.value <= 0) return 'Price must be greater than 0';
  return null;
});

const orderAmountError = computed(() => {
  if (orderAmount.value === null) return null; // Don't show error initially
  if (orderAmount.value <= 0) return 'Amount must be greater than 0';
  if (orderAmount.value > maxAmount.value) {
    return orderSide.value === 'Buy' ? 'Exceeds maximum buy amount' : 'Exceeds available balance';
  }
  return null;
});

const isFormValid = computed(() => {
  if (!orderAmount.value || orderAmount.value <= 0) return false;
  if (!orderPrice.value || orderPrice.value <= 0) return false;
  if (orderAmountError.value) return false;
  if (tpSl.value) {
    if (tpError.value || slError.value) return false;
  }
  return true;
});

const executeTrade = () => {
  if (!isFormValid.value) return;
  
  // Deduct from local available value for realism
  if (orderSide.value === 'Buy') {
    availableUsdt.value -= parseFloat(totalCost.value);
    availableBtc.value += orderAmount.value!;
  } else {
    availableBtc.value -= orderAmount.value!;
    availableUsdt.value += parseFloat(totalCost.value);
  }

  addPosition({
    pair: 'BTC/USDT',
    type: orderSide.value === 'Buy' ? 'LONG' : 'SHORT',
    leverage: marginEnabled.value ? 'Cross_10x' : 'Spot',
    size: orderAmount.value!,
    cost: parseFloat(totalCost.value),
    entry: orderPrice.value,
  });
  
  orderAmount.value = null; // reset
  tpSl.value = false;
  percentage.value = 0;
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
  <div class="flex flex-row gap-1 sm:gap-2 h-[460px] sm:h-full w-full">
    <!-- Left: Order Book / Trades Panel -->
    <div class="bg-[#0b0e11] border border-[#1e2329] rounded flex flex-col overflow-hidden w-[calc(50%-1rem)] shrink-0">
       <div class="flex w-full border-b border-[#1e2329] shrink-0">
         <button class="flex-1 py-2 sm:py-3 text-[10px] sm:text-[11px] font-semibold border-b-2 border-[#F0B90B] text-[#EAECEF] bg-[#1e2329]/20 tracking-wider">
           ORDER BOOK
         </button>
         <button class="flex-1 py-2 sm:py-3 text-[10px] sm:text-[11px] font-semibold border-b-2 border-transparent text-[#848e9c] hover:text-[#EAECEF] transition-colors tracking-wider">
           TRADES
         </button>
       </div>

       <div class="flex-1 flex flex-col overflow-hidden p-1 sm:p-2">
          <table class="w-full text-xs sm:text-[13px] text-right h-full">
            <thead class="text-[#848e9c] sticky top-0 bg-[#0b0e11]">
              <tr>
                <th class="font-medium pb-1.5 sm:pb-2 pt-1 text-left w-1/2 text-[10px] sm:text-xs">Price</th>
                <th class="font-medium pb-1.5 sm:pb-2 pt-1 w-1/2 text-[10px] sm:text-xs">Total</th>
              </tr>
            </thead>
            <tbody class="font-mono">
              <tr v-for="i in 7" :key="`ask-${i}`" class="hover:bg-[#1e2329]/50 cursor-pointer group relative">
                <td class="py-1 sm:py-1.5 text-left text-[#f6465d] border-none">
                  <div class="absolute top-0 right-0 h-full bg-[#f6465d]/10 group-hover:bg-[#f6465d]/20 -z-10" :style="`width: ${40 + i * 5}%`"></div>
                  <span class="relative z-10">67412.{{ 90 + i }}</span>
                </td>
                <td class="py-1 sm:py-1.5 text-[#848e9c] border-none"><span class="relative z-10">37.65{{ i }}</span></td>
              </tr>
              <tr>
                <td colspan="2" class="py-1 sm:py-2 border-y border-[#1e2329] my-0.5 sm:my-1">
                  <div class="flex justify-center items-center gap-1 sm:gap-2">
                    <span class="text-[#2ebd85] font-bold text-sm sm:text-lg mt-0.5">67412.35 <ArrowUp class="w-3 h-3 sm:w-4 sm:h-4 inline" /></span>
                  </div>
                </td>
              </tr>
              <tr v-for="i in 7" :key="`bid-${i}`" class="hover:bg-[#1e2329]/50 cursor-pointer group relative">
                <td class="py-1 sm:py-1.5 text-left text-[#2ebd85] border-none">
                  <div class="absolute top-0 right-0 h-full bg-[#2ebd85]/10 group-hover:bg-[#2ebd85]/20 -z-10" :style="`width: ${80 - i * 5}%`"></div>
                  <span class="relative z-10">67412.{{ 35 - i }}</span>
                </td>
                <td class="py-1 sm:py-1.5 text-[#848e9c] border-none"><span class="relative z-10">37.65{{ i }}</span></td>
              </tr>
            </tbody>
          </table>
       </div>
    </div>

    <!-- Right: Order Panel -->
    <div class="bg-[#0b0e11] border border-[#1e2329] rounded p-1.5 sm:p-4 flex flex-col flex-1 shrink-0 text-[#EAECEF] relative overflow-hidden">
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
      <div class="flex rounded bg-[#1e2329] p-0.5 mb-2 sm:mb-4">
        <button 
          @click="orderSide = 'Buy'"
          class="flex-1 py-1 sm:py-1.5 rounded font-bold text-xs sm:text-sm transition-colors text-center"
          :class="orderSide === 'Buy' ? 'bg-[#2ebd85] text-white' : 'text-[#848e9c] hover:text-white'"
        >
          Buy
        </button>
        <button 
          @click="orderSide = 'Sell'"
          class="flex-1 py-1 sm:py-1.5 rounded font-bold text-xs sm:text-sm transition-colors text-center"
          :class="orderSide === 'Sell' ? 'bg-[#f6465d] text-white' : 'text-[#848e9c] hover:text-white'"
        >
          Sell
        </button>
      </div>

      <!-- Order Type -->
      <div class="flex items-center justify-between mb-2 sm:mb-4 relative">
        <div 
          @click="showOrderTypeDropdown = !showOrderTypeDropdown"
          class="cursor-pointer text-[#EAECEF] font-semibold text-xs flex items-center border-b border-dashed border-[#848e9c] pb-0.5 hover:text-[#F0B90B]"
        >
          {{ orderType }} <ChevronDown class="w-3 h-3 ml-0.5" />
        </div>
        
        <!-- Dropdown Menu -->
        <div v-if="showOrderTypeDropdown" class="absolute top-full left-0 mt-1 w-32 bg-[#2b3139] border border-[#474d57] rounded shadow-lg z-50 py-1">
          <div 
            v-for="type in ['Limit', 'Market', 'Stop-Limit']" 
            :key="type"
            @click="orderType = type as any; showOrderTypeDropdown = false"
            class="px-3 py-1.5 text-xs hover:bg-[#1e2329] cursor-pointer transition-colors"
            :class="orderType === type ? 'text-[#F0B90B]' : 'text-[#EAECEF]'"
          >
            {{ type }}
          </div>
        </div>

        <Info class="w-4 h-4 text-[#848e9c] cursor-pointer hover:text-white" />
      </div>

      <!-- Inputs -->
      <div class="flex flex-col gap-4">
        <!-- Price Input -->
        <div class="flex flex-col gap-1">
          <div :class="cn('flex items-center transition-colors rounded-lg w-full h-[40px] px-1.5 sm:px-3 border', orderPriceError ? 'bg-[#f6465d]/10 border-[#f6465d]' : 'bg-[#1e2329] hover:bg-[#2b3139] border-transparent focus-within:ring-1 focus-within:ring-[#F0B90B]')">
            <Minus class="w-3 h-3 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0" @click="orderPrice = Math.max(0, parseFloat((orderPrice - 0.1).toFixed(2)))" />
            <input type="number" step="0.01" min="0" v-model="orderPrice" class="flex-1 text-center bg-transparent outline-none text-[#EAECEF] font-mono text-xs sm:text-[14px] w-full min-w-0 px-1 sm:px-2" />
            <Plus class="w-3 h-3 sm:w-4 sm:h-4 text-[#848e9c] cursor-pointer hover:text-white shrink-0 mr-1 sm:mr-2" @click="orderPrice = parseFloat((orderPrice + 0.1).toFixed(2))" />
            <div class="h-3 sm:h-4 w-px bg-[#474d57] mx-1 sm:mx-2"></div>
            <button @click="orderPrice = orderSide === 'Buy' ? 67412.35 : 67412.40" class="text-[#848e9c] font-bold text-[9px] sm:text-[11px] hover:text-white shrink-0 transition-colors">BBO</button>
          </div>
          <span v-if="orderPriceError" class="text-[#f6465d] text-[10px] ml-1">{{ orderPriceError }}</span>
        </div>

        <!-- Amount Input -->
        <div class="flex flex-col gap-1">
          <div :class="cn('flex items-center transition-colors rounded-lg w-full h-[40px] px-1.5 sm:px-3 border', orderAmountError ? 'bg-[#f6465d]/10 border-[#f6465d]' : 'bg-[#1e2329] hover:bg-[#2b3139] border-transparent focus-within:ring-1 focus-within:ring-[#F0B90B]')">
            <div class="text-[10px] sm:text-[12px] text-[#848e9c] shrink-0">Amount</div>
            <input type="number" v-model="orderAmount" placeholder="0.00" class="flex-1 text-center bg-transparent outline-none text-[#EAECEF] font-mono text-xs sm:text-[14px] w-full min-w-0 px-1 sm:px-2 placeholder:text-[#474d57]" />
            <div @click="setPercentage(100)" class="text-[#F0B90B] font-bold text-[9px] sm:text-[11px] cursor-pointer hover:brightness-110 ml-1 sm:ml-2 shrink-0">MAX</div>
            <div class="text-[#EAECEF] font-medium text-[10px] sm:text-[12px] ml-1 sm:ml-2 shrink-0">BTC</div>
          </div>
          <span v-if="orderAmountError" class="text-[#f6465d] text-[10px] ml-1">{{ orderAmountError }}</span>
        </div>

        <!-- Total -->
        <div class="flex items-center bg-[#1e2329] hover:bg-[#2b3139] transition-colors rounded-lg w-full h-[40px] px-1.5 sm:px-3 border border-transparent focus-within:ring-1 focus-within:ring-[#F0B90B]">
          <div class="text-[10px] sm:text-[12px] text-[#848e9c] shrink-0">Total</div>
          <input type="number" :value="totalCost" readonly placeholder="0.00" class="flex-1 text-center ml-1 sm:ml-2 bg-transparent outline-none text-[#EAECEF] font-mono text-xs sm:text-[14px] w-full min-w-0 placeholder:text-[#474d57]" />
          <div class="text-[#EAECEF] font-medium text-[10px] sm:text-[12px] ml-1.5 sm:ml-3 shrink-0">USDT</div>
        </div>

        <!-- Max Display -->
        <div class="flex items-center bg-[#1e2329] transition-colors rounded-lg w-full h-[40px] px-1.5 sm:px-3 border border-transparent">
          <div class="text-[10px] sm:text-[12px] text-[#848e9c] shrink-0">Max {{ orderSide === 'Buy' ? 'Buy' : 'Sell' }}</div>
          <div class="flex-1 text-center text-[#EAECEF] font-mono text-xs sm:text-[14px] w-full min-w-0 px-1 sm:px-2">{{ maxAmount.toFixed(4) }}</div>
          <div class="text-[#EAECEF] font-medium text-[10px] sm:text-[12px] ml-1 sm:ml-2 shrink-0">BTC</div>
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
        <div class="flex justify-between text-[10px] sm:text-xs items-center">
           <span class="text-[#848e9c] font-medium">Borrow</span>
           <span class="text-[#EAECEF] font-mono font-bold text-[9px] sm:text-xs">{{ borrowValue.toFixed(2) }} USDT</span>
        </div>
      </div>

      <!-- Action Button -->
      <button 
        @click="executeTrade"
        :disabled="!isFormValid"
        class="w-full py-2 sm:py-3 rounded text-[#181a20] font-bold text-xs sm:text-sm tracking-widest sm:tracking-wide transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        :class="orderSide === 'Buy' ? 'bg-[#2ebd85] hover:bg-[#2ebd85]/90' : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'"
      >
        {{ orderSide === 'Buy' ? 'Buy' : 'Sell' }}
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

              <button @click="isTpSlOpen = false" class="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold rounded py-2 text-xs mt-1 transition-colors">Confirm</button>
          </div>
      </div>

    </div>
  </div>
</template>

