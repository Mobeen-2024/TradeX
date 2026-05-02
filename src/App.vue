<script setup lang="ts">
import { ref } from 'vue';
import { ArrowDownLeft, ArrowUpRight, Bitcoin, Activity, Signal, TrendingUp } from 'lucide-vue-next';
import Sidebar from './components/Sidebar.vue';
import TopHeader from './components/TopHeader.vue';
import TickerRibbon from './components/TickerRibbon.vue';
import BalancesPanel from './components/BalancesPanel.vue';
import TradingChartWidget from './components/TradingChartWidget.vue';
import TransactionHistory from './components/TransactionHistory.vue';
import OrderPanel from './components/OrderPanel.vue';
import { cn } from './lib/utils';

const activeItem = ref('Market');

const icons: Record<string, any> = {
  Activity,
  Bitcoin,
  Signal,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight
};
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
      <TopHeader :title="activeItem" />
      
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

      <div v-else-if="activeItem === 'Trade'" class="flex-1 overflow-y-auto p-6 flex flex-col gap-8 no-scrollbar bg-[#0b0e11]/50 backdrop-blur-sm">
        <div class="flex flex-col gap-6">
          <h2 class="text-xl font-bold text-white mb-2">Market Overview</h2>
          <TickerRibbon />
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <!-- Mock Market Cards -->
            <div v-for="i in 6" :key="i" class="bg-dash-card border border-dash-border p-4 rounded-xl hover:border-dash-primary/50 transition-all cursor-pointer group">
              <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-dash-surface flex items-center justify-center">
                      <component :is="icons[['Bitcoin', 'Activity', 'Signal', 'TrendingUp'][i % 4]]" class="w-4 h-4 text-dash-primary" />
                    </div>
                  <div>
                    <div class="font-bold text-white">{{ ['Bitcoin', 'Ethereum', 'Solana', 'Cardano'][i % 4] }}</div>
                    <div class="text-[10px] text-dash-text-muted uppercase">{{ ['BTC', 'ETH', 'SOL', 'ADA'][i % 4] }}/USDT</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-dash-primary font-bold">+{{ (Math.random() * 5).toFixed(2) }}%</div>
                </div>
              </div>
              <div class="flex justify-between items-end">
                <div class="text-lg font-mono text-white">${{ (36000 / (i + 1)).toFixed(2) }}</div>
                <div class="w-20 h-8 bg-dash-primary/10 rounded flex items-end px-1 pb-1">
                   <div v-for="j in 8" :key="j" class="flex-1 bg-dash-primary rounded-t-sm mx-[1px]" :style="`height: ${Math.random() * 100}%`"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeItem === 'Transactions'" class="flex-1 overflow-y-auto p-4 flex flex-col gap-6 no-scrollbar">
        <h2 class="text-xl font-bold text-white">Asset Management</h2>
        <BalancesPanel />
        
        <div class="flex-1 flex flex-col min-h-0">
           <h3 class="text-lg font-bold text-white mb-4">Transaction History</h3>
           <div class="flex-1 bg-dash-card border border-dash-border rounded-xl overflow-hidden flex flex-col min-h-[400px]">
              <div class="grid grid-cols-5 p-4 border-b border-dash-border text-dash-text-muted text-xs font-bold uppercase tracking-wider">
                <div class="col-span-2">Transaction</div>
                <div>Amount</div>
                <div>Status</div>
                <div class="text-right">Date</div>
              </div>
              <div class="flex-1 overflow-y-auto">
                 <div v-for="i in 10" :key="i" class="grid grid-cols-5 p-4 border-b border-dash-border/50 items-center hover:bg-dash-card-hover transition-colors text-sm">
                   <div class="col-span-2 flex items-center gap-3">
                      <div :class="cn('w-8 h-8 rounded-full flex items-center justify-center', i % 2 === 0 ? 'bg-dash-primary/20 text-dash-primary' : 'bg-dash-danger/20 text-dash-danger')">
                        <component :is="i % 2 === 0 ? icons.ArrowDownLeft : icons.ArrowUpRight" class="w-4 h-4" />
                      </div>
                      <div>
                        <div class="font-bold text-white">{{ i % 2 === 0 ? 'Deposit' : 'Withdrawal' }}</div>
                        <div class="text-[10px] text-dash-text-muted">ID: #TX-{{ Math.random().toString(36).substr(2, 6).toUpperCase() }}</div>
                      </div>
                   </div>
                   <div class="font-mono text-white">{{ (Math.random() * 2).toFixed(4) }} BTC</div>
                   <div>
                     <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-dash-primary/10 text-dash-primary border border-dash-primary/20">Completed</span>
                   </div>
                   <div class="text-right text-dash-text-muted text-xs">May 02, 2026</div>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      <div v-else class="flex-1 flex items-center justify-center text-dash-text-muted">
         Select a section from the sidebar to view.
      </div>
    </div>
    </div> <!-- Close main content container -->
  </div>
</template>
