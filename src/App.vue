<script setup lang="ts">
import { ref } from 'vue';
import Sidebar from './components/Sidebar.vue';
import TopHeader from './components/TopHeader.vue';
import TickerRibbon from './components/TickerRibbon.vue';
import BalancesPanel from './components/BalancesPanel.vue';
import TradingChartWidget from './components/TradingChartWidget.vue';
import TransactionHistory from './components/TransactionHistory.vue';
import OrderPanel from './components/OrderPanel.vue';

const activeItem = ref('Trade');
</script>

<template>
  <div class="flex h-[100dvh] w-full bg-dash-bg overflow-hidden text-dash-text text-sm flex-col md:flex-row">
    <Sidebar class="order-2 md:order-none" :active-item="activeItem" @update:active-item="activeItem = $event" />
    <div class="flex flex-col flex-1 min-w-0 min-h-0 order-1 md:order-none">
      <TopHeader v-if="activeItem === 'Market'" :title="activeItem" />
      
      <div v-if="activeItem === 'Market'" class="flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-2 no-scrollbar">
        <!-- Main Workspace Row (Chart + OrderBook + Terminal) -->
        <div class="flex flex-1 flex-col xl:flex-row gap-2">
          <!-- Left: Chart -->
          <div class="flex-[1.5] min-w-0 flex flex-col items-center justify-start">
            <TradingChartWidget class="w-full" />
          </div>

          <!-- Right: Orderbook, Trade Execution & Positions -->
          <div class="w-full xl:w-auto flex flex-col gap-2 shrink-0">
            <div class="h-auto xl:h-[460px] w-full xl:w-[504px]">
              <OrderPanel />
            </div>
            
            <div class="h-[300px] xl:h-[auto] xl:flex-1 w-full xl:w-[504px] shrink-0 flex flex-col">
              <TransactionHistory class="h-full" />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeItem === 'Transactions'" class="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4">
        <h2 class="text-xl font-bold text-white mb-2">Transactions</h2>
        <BalancesPanel />
      </div>

      <div v-else-if="activeItem === 'Trade'" class="flex-1 flex items-center justify-center text-dash-text-muted">
        <div class="text-center">
          <h2 class="text-xl font-bold text-white mb-2">Trade</h2>
          <p>Trade execution interface will go here.</p>
        </div>
      </div>
      
      <div v-else class="flex-1 flex items-center justify-center text-dash-text-muted">
         Select a section from the sidebar to view.
      </div>
    </div>
  </div>
</template>
