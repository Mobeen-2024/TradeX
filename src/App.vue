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
import { currentPrice } from './store/tradeStore';
import { cn } from './lib/utils';

const activeItem = ref('Market');
const mobileTab = ref('Chart');

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
      
      <div v-if="activeItem === 'Market'" class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <!-- Mobile Tab Switcher -->
        <div class="md:hidden flex bg-[#161a1e] border-b border-dash-border p-1 gap-1 shrink-0">
          <button 
            v-for="tab in ['Chart', 'Trade', 'Positions']" 
            :key="tab"
            @click="mobileTab = tab"
            :class="cn(
              'flex-1 py-2 text-xs font-bold rounded-md transition-all',
              mobileTab === tab ? 'bg-[#2b3139] text-[#F0B90B] shadow-sm' : 'text-[#848e9c]'
            )"
          >
            {{ tab }}
          </button>
        </div>

        <div class="flex-1 overflow-y-auto md:overflow-hidden p-2 flex flex-col gap-2 no-scrollbar">
          <!-- Main Workspace Grid -->
          <!-- On mobile, we show only the active mobileTab. On desktop, we show the full grid. -->
          <div class="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[1fr_250px] gap-2 flex-1 min-h-[0]">
            
            <!-- Chart: Visible on Desktop OR if mobileTab is 'Chart' -->
            <div 
              :class="cn(
                'lg:col-span-7 xl:col-span-8 lg:row-start-1 lg:col-start-1 flex flex-col min-h-[450px] lg:min-h-[0]',
                mobileTab !== 'Chart' ? 'hidden md:flex' : 'flex'
              )"
            >
              <TradingChartWidget class="w-full h-full" />
            </div>

            <!-- OrderPanel: Visible on Desktop OR if mobileTab is 'Trade' -->
            <div 
              :class="cn(
                'lg:col-span-5 xl:col-span-4 lg:row-start-1 lg:col-start-8 xl:col-start-9 flex flex-col h-[520px] lg:h-full',
                mobileTab !== 'Trade' ? 'hidden md:flex' : 'flex'
              )"
            >
              <OrderPanel class="w-full h-full" />
            </div>
            
            <!-- Transactions: Visible on Desktop OR if mobileTab is 'Positions' -->
            <div 
              :class="cn(
                'lg:col-span-12 lg:row-start-2 lg:col-start-1 flex flex-col h-[400px] lg:h-full',
                mobileTab !== 'Positions' ? 'hidden md:flex' : 'flex'
              )"
            >
              <TransactionHistory class="h-full" />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeItem === 'Trade'" class="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 no-scrollbar bg-[#0b0e11]/50 backdrop-blur-md">
        <div class="flex flex-col gap-6">
          <div class="flex justify-between items-end">
            <div>
              <h2 class="text-xl sm:text-2xl font-bold text-white">Market Overview</h2>
              <p class="text-xs text-[#848e9c]">Real-time market performance and top gainers</p>
            </div>
            <div class="hidden sm:flex gap-4">
               <div class="text-right">
                 <div class="text-[10px] text-[#848e9c] uppercase font-bold">24h Volume</div>
                 <div class="text-sm font-mono text-white">$2.68B</div>
               </div>
               <div class="text-right border-l border-[#2b3139] pl-4">
                 <div class="text-[10px] text-[#848e9c] uppercase font-bold">Total Cap</div>
                 <div class="text-sm font-mono text-white">$2.42T</div>
               </div>
            </div>
          </div>
          
          <TickerRibbon />
          
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
            <!-- Professional Pair Cards -->
            <div v-for="pair in [
              { name: 'Bitcoin', symbol: 'BTC', price: currentPrice.toFixed(2), change: '+1.99%', icon: 'Bitcoin', color: '#F0B90B' },
              { name: 'Ethereum', symbol: 'ETH', price: '3077.93', change: '+2.45%', icon: 'Signal', color: '#627EEA' },
              { name: 'Solana', symbol: 'SOL', price: '145.22', change: '-0.82%', icon: 'Activity', color: '#14F195' },
              { name: 'Binance Coin', symbol: 'BNB', price: '580.44', change: '+0.15%', icon: 'TrendingUp', color: '#F3BA2F' },
              { name: 'Cardano', symbol: 'ADA', price: '0.45', change: '-1.12%', icon: 'Signal', color: '#0033AD' },
              { name: 'Ripple', symbol: 'XRP', price: '0.62', change: '+0.88%', icon: 'Activity', color: '#23292F' }
            ]" :key="pair.symbol" class="bg-[#161a1e] border border-[#2b3139] p-4 rounded-xl hover:border-[#F0B90B]/30 transition-all cursor-pointer group hover:bg-[#1e2329] relative overflow-hidden">
              <!-- Glow Effect -->
              <div class="absolute -right-4 -top-4 w-16 h-16 opacity-10 blur-2xl rounded-full" :style="`background-color: ${pair.color}`"></div>
              
              <div class="flex justify-between items-center mb-4 relative z-10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-[#0b0e11] flex items-center justify-center border border-[#2b3139] group-hover:border-[#F0B90B]/30 transition-colors">
                      <component :is="icons[pair.icon]" class="w-5 h-5" :style="`color: ${pair.color}`" />
                    </div>
                  <div>
                    <div class="font-bold text-white text-[15px]">{{ pair.name }}</div>
                    <div class="text-[10px] text-[#848e9c] uppercase font-mono tracking-tighter">{{ pair.symbol }}/USDT</div>
                  </div>
                </div>
                <div class="text-right">
                  <div :class="cn('text-[13px] font-bold px-1.5 py-0.5 rounded', pair.change.startsWith('+') ? 'text-[#0ecb81] bg-[#0ecb81]/10' : 'text-[#f6465d] bg-[#f6465d]/10')">
                    {{ pair.change }}
                  </div>
                </div>
              </div>
              <div class="flex justify-between items-end relative z-10">
                <div>
                  <div class="text-xs text-[#848e9c] mb-1">Price</div>
                  <div class="text-xl font-mono font-bold text-white leading-none">${{ pair.price }}</div>
                </div>
                <div class="w-24 h-10 flex items-end gap-[2px]">
                   <div v-for="j in 10" :key="j" :class="cn('flex-1 rounded-t-sm transition-all duration-500', pair.change.startsWith('+') ? 'bg-[#0ecb81]' : 'bg-[#f6465d]')" :style="`height: ${20 + Math.random() * 80}%; opacity: ${0.2 + (j/10) * 0.8}`"></div>
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
