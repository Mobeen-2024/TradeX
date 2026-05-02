<script setup lang="ts">
import { ref } from 'vue';
import { Wallet, Bitcoin, CheckCircle2, Eye, EyeOff } from 'lucide-vue-next';
import { currentPrice } from '../store/tradeStore';

const hideBalance = ref(false);
const toggleHideBalance = () => {
  hideBalance.value = !hideBalance.value;
};

const btcHolding = 0.34545;
</script>

<template>
  <div class="flex flex-col xl:flex-row gap-4 p-4 bg-dash-card border border-dash-border rounded-xl">
    
    <!-- Wallet Balance -->
    <div class="flex-1 flex justify-between items-center pr-6 xl:border-r border-dash-border min-w-[300px]">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2 text-dash-text-muted text-sm">
          <Wallet class="w-4 h-4" />
          Wallet Balance
          <component 
            :is="hideBalance ? EyeOff : Eye" 
            class="w-4 h-4 ml-2 cursor-pointer hover:text-white transition-colors" 
            @click="toggleHideBalance"
          />
        </div>
        <div class="text-3xl font-bold text-white flex items-baseline gap-1 mt-1">
          <template v-if="!hideBalance">
            $227.169,85 <span class="text-sm font-medium text-dash-text-muted">USD</span>
          </template>
          <template v-else>
            ****** USD
          </template>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <button class="bg-dash-primary hover:bg-dash-primary-hover text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
          Withdrawal
        </button>
        <button class="bg-dash-surface hover:bg-dash-border text-white border border-dash-border px-6 py-2 rounded-lg text-sm font-medium transition-colors">
          Deposit
        </button>
      </div>
    </div>

    <!-- BTC Balance -->
    <div class="flex-1 flex flex-col justify-center px-4 xl:border-r border-dash-border">
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center gap-2 text-dash-text-muted text-sm font-medium w-full">
          <div class="w-1 h-4 bg-[#f7931a] rounded-sm"></div>
          BTC Balance
          <div class="ml-auto w-6 h-6 rounded-full bg-[#f7931a]/20 flex items-center justify-center">
            <Bitcoin class="w-4 h-4 text-[#f7931a]" />
          </div>
        </div>
      </div>
      <div class="flex items-end justify-between">
        <div class="text-2xl font-bold text-white flex items-baseline gap-1">
          <template v-if="!hideBalance">
            {{ btcHolding }} <span class="text-sm font-medium text-dash-text-muted">BTC</span>
          </template>
          <template v-else>
            ****** BTC
          </template>
        </div>
        <div class="text-sm text-dash-text-muted font-mono">
           {{ hideBalance ? '****** USD' : (btcHolding * currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD' }}
        </div>
      </div>
    </div>

    <!-- ETH Balance -->
    <div class="flex-1 flex flex-col justify-center pl-4">
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center gap-2 text-dash-text-muted text-sm font-medium w-full">
          <div class="w-1 h-4 bg-[#627eea] rounded-sm"></div>
          ETH Balance
          <div class="ml-auto w-6 h-6 rounded-full bg-[#627eea]/20 flex items-center justify-center">
             <svg width="12" height="12" viewBox="0 0 320 512" fill="#627eea"><path d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z"/></svg>
          </div>
        </div>
      </div>
      <div class="flex items-end justify-between">
        <div class="text-2xl font-bold text-white flex items-baseline gap-1">
           <template v-if="!hideBalance">
             12,345 <span class="text-sm font-medium text-dash-text-muted">ETH</span>
           </template>
           <template v-else>
             ****** ETH
           </template>
        </div>
        <div class="text-sm text-dash-text-muted">
           {{ hideBalance ? '****** USD' : '37870,88 USD' }}
        </div>
      </div>
    </div>

  </div>
</template>
