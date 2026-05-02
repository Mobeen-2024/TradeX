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
  <div class="flex h-[100dvh] w-full bg-[#0b0e11] overflow-hidden text-[#EAECEF] text-sm flex-col md:flex-row relative">
    
    <!-- Magic UI Style Animated Background (Subtle Grid + Glow) -->
    <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#F0B90B] opacity-[0.03] blur-[150px] rounded-full mix-blend-screen animate-pulse"></div>
      <div class="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#0ecb81] opacity-[0.02] blur-[150px] rounded-full mix-blend-screen animate-pulse delay-1000"></div>
    </div>

    <!-- Main Content Container with z-index to overlay background -->
    <div class="flex h-full w-full z-10 flex-col md:flex-row">
      <Sidebar class="order-2 md:order-none shrink-0" :active-item="activeItem" @update:active-item="activeItem = $event" />
      <div class="flex flex-col flex-1 min-w-0 min-h-0 order-1 md:order-none">
      <TopHeader v-if="activeItem === 'Market'" :title="activeItem" />
      
      <div v-if="activeItem === 'Market'" class="flex-1 overflow-y-auto lg:overflow-hidden p-2 flex flex-col gap-2 no-scrollbar">
        <!-- Main Workspace Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[1fr_250px] gap-2 flex-1 min-h-[0]">
          <!-- Chart -->
          <div class="lg:col-span-7 xl:col-span-8 lg:row-start-1 lg:col-start-1 flex flex-col min-h-[450px] lg:min-h-[0]">
            <TradingChartWidget class="w-full h-full" />
          </div>

          <!-- OrderPanel -->
          <div class="lg:col-span-5 xl:col-span-4 lg:row-start-1 lg:col-start-8 xl:col-start-9 flex flex-col h-[460px] lg:h-full">
            <OrderPanel class="w-full h-full" />
          </div>
          
          <!-- Transactions -->
          <div class="lg:col-span-12 lg:row-start-2 lg:col-start-1 flex flex-col h-[300px] lg:h-full">
            <TransactionHistory class="h-full" />
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
    </div> <!-- Close main content container -->
  </div>
</template>
