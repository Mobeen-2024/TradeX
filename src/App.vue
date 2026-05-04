<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

import Sidebar from './components/Sidebar.vue';
import TopHeader from './components/TopHeader.vue';
import TickerRibbon from './components/TickerRibbon.vue';
import BalancesPanel from './components/BalancesPanel.vue';
import MultiChartWorkspace from './components/MultiChartWorkspace.vue';
import TransactionHistory from './components/TransactionHistory.vue';
import OrderPanel from './components/OrderPanel.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import PortfolioVisualizer from './components/PortfolioVisualizer.vue';
import MarketSentiment from './components/MarketSentiment.vue';
import PerformanceDashboard from './components/PerformanceDashboard.vue';
import QuickTradeView from './components/QuickTradeView.vue';
import ToastProvider from './components/ToastProvider.vue';
import LeaderBoard from './components/LeaderBoard.vue';
import Tournaments from './components/Tournaments.vue';
import TradingSignals from './components/TradingSignals.vue';
import MarketIntelPanel from './components/MarketIntelPanel.vue';
import { initAIStore } from './store/aiStore';
import { initSystemStore } from './store/systemStore';
import { addPosition, closePosition, currentPrice, activePositions, cancelOrder, openOrders, quickTradeMode, quickTradePreferences } from './store/tradeStore';
import { cn } from './lib/utils';
import { activeTool, setGlobalTool, globalSymbol } from './store/workspaceStore';
import { LayoutDashboard, History, TrendingUp, Settings as SettingsIcon, Menu, X, Zap, ArrowDownLeft, ArrowUpRight, Bitcoin, Activity, Signal } from 'lucide-vue-next';

const activeItem = ref('Market');
const mobileTab = ref('Chart');
const settingsPanel = ref<InstanceType<typeof SettingsPanel> | null>(null);
const uiFlash = ref<'buy' | 'sell' | null>(null);

const triggerFlash = (type: 'buy' | 'sell') => {
    uiFlash.value = type;
    setTimeout(() => { uiFlash.value = null; }, 300);
};

// Professional Hotkeys
const handleKeydown = (e: KeyboardEvent) => {
    // Only trigger if not typing in an input
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

    const { defaultRisk, defaultLeverage } = quickTradePreferences.value;
    const size = defaultRisk / currentPrice.value;
    const symbol = globalSymbol.value.replace('USDT', '/USDT');

    if (e.key.toLowerCase() === 'b') {
        // Instant Market Buy
        triggerFlash('buy');
        addPosition({
            pair: symbol,
            type: 'LONG',
            leverage: `${defaultLeverage}x`,
            size: Number(size.toFixed(5)),
            cost: defaultRisk / defaultLeverage,
            entry: currentPrice.value
        });
    } else if (e.key.toLowerCase() === 's') {
        // Instant Market Sell
        triggerFlash('sell');
        addPosition({
            pair: symbol,
            type: 'SHORT',
            leverage: `${defaultLeverage}x`,
            size: Number(size.toFixed(5)),
            cost: defaultRisk / defaultLeverage,
            entry: currentPrice.value
        });
    } else if (e.key.toLowerCase() === 'c') {
        // Cancel All Open Orders
        openOrders.value.forEach(o => cancelOrder(o.id));
    } else if (e.key.toLowerCase() === 'x') {
        // Close All Positions
        activePositions.value.forEach(p => closePosition(p.id));
    } else if (e.altKey && e.key.toLowerCase() === 'h') {
        setGlobalTool('hline');
    } else if (e.altKey && e.key.toLowerCase() === 'f') {
        setGlobalTool('fib');
    } else if (e.altKey && e.key.toLowerCase() === 'a') {
        setGlobalTool('alert');
    } else if (e.key.toLowerCase() === 'q') {
        quickTradeMode.value = !quickTradeMode.value;
    } else if (e.key === 'Escape') {
        setGlobalTool('none');
    }
};

onMounted(() => {
    initAIStore();
    initSystemStore();
    window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
});

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
    
    <!-- Premium Dynamic Glassmorphism Background -->
    <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#050505]">
      <!-- Animated Mesh Gradient Orbs -->
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[#F0B90B]/10 to-[#F0B90B]/5 blur-[120px] rounded-full mix-blend-screen animate-float"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-[#0ecb81]/10 to-[#0ecb81]/5 blur-[150px] rounded-full mix-blend-screen animate-float" style="animation-delay: 2s;"></div>
      <div class="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-gradient-to-tr from-[#627EEA]/10 to-transparent blur-[100px] rounded-full mix-blend-screen animate-pulse" style="animation-duration: 8s;"></div>
      
      <!-- Subtle Tech Grid -->
      <div class="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_40%,transparent_100%)]"></div>

      <!-- Hotkey Flash Feedback Overlay -->
      <Transition 
        enter-active-class="transition duration-100 ease-out" 
        enter-from-class="opacity-0" 
        enter-to-class="opacity-100" 
        leave-active-class="transition duration-300 ease-in" 
        leave-from-class="opacity-100" 
        leave-to-class="opacity-0"
      >
        <div v-if="uiFlash" :class="cn(
          'absolute inset-0 z-[100] pointer-events-none transition-opacity duration-300',
          uiFlash === 'buy' ? 'bg-[#0ecb81]/10' : 'bg-[#f6465d]/10'
        )"></div>
      </Transition>
    </div>

    <!-- Main Content Container with z-index to overlay background -->
    <div class="flex h-full w-full z-10 flex-col md:flex-row">
      <Sidebar class="order-2 md:order-none shrink-0" :active-item="activeItem" @update:active-item="activeItem = $event" />
      <div class="flex flex-col flex-1 min-w-0 min-h-0 order-1 md:order-none">
      <TopHeader :title="activeItem" @open-settings="settingsPanel?.open()" />
      
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

        <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-2 no-scrollbar">
          <!-- Main Workspace Grid -->
          <!-- On mobile, we show only the active mobileTab. On desktop, we show the full grid. -->
          <div class="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[1fr_250px] gap-2 flex-1 min-h-[0]">
            
            <!-- Chart -->
            <div 
              :class="cn(
                'lg:col-span-6 xl:col-span-7 lg:row-start-1 lg:col-start-1 flex flex-col min-h-[450px] lg:min-h-[0]',
                mobileTab !== 'Chart' ? 'hidden md:flex' : 'flex'
              )"
            >
              <MultiChartWorkspace class="w-full h-full" />
            </div>

            <!-- AI Intelligence -->
            <div 
              class="hidden xl:flex xl:col-span-2 lg:row-start-1 lg:col-start-8 flex-col h-full"
            >
              <MarketIntelPanel class="w-full h-full rounded-[16px]" />
            </div>

            <!-- OrderPanel -->
            <div 
              :class="cn(
                'lg:col-span-6 xl:col-span-3 lg:row-start-1 lg:col-start-7 xl:col-start-10 flex flex-col h-[520px] lg:h-full',
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
              <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Market Overview</h2>
              <p class="text-xs text-[#848e9c] font-medium uppercase tracking-[0.2em] mt-1 opacity-60">Live market analytics and top movers</p>
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
          
          <MarketSentiment />
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
            ]" :key="pair.symbol" class="bg-white/5 backdrop-blur-2xl border border-white/5 p-5 rounded-[24px] hover:border-[#F0B90B]/40 transition-all duration-500 cursor-pointer group hover:bg-white/10 relative overflow-hidden hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:-translate-y-2">
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
        <PortfolioVisualizer />
        <BalancesPanel />
        
        <div class="flex-1 flex flex-col min-h-0">
           <h3 class="text-lg font-bold text-white mb-4">Account History</h3>
           <TransactionHistory />
        </div>
      </div>

      <div v-else-if="activeItem === 'Analytics'" class="flex-1 overflow-y-auto no-scrollbar">
        <PerformanceDashboard />
      </div>

      <div v-else-if="activeItem === 'Leader Board'" class="flex-1 overflow-y-auto no-scrollbar">
        <LeaderBoard />
      </div>

      <div v-else-if="activeItem === 'Tournaments'" class="flex-1 overflow-y-auto no-scrollbar">
        <Tournaments />
      </div>

      <div v-else-if="activeItem === 'Trading signals'" class="flex-1 overflow-y-auto no-scrollbar">
        <TradingSignals />
      </div>
      
      <div v-else class="flex-1 flex items-center justify-center text-dash-text-muted">
         Select a section from the sidebar to view.
      </div>
    </div>
    </div> <!-- Close main content container -->
    
    <!-- Mobile Quick-Trade FAB -->
    <button 
      @click="quickTradeMode = true"
      class="sm:hidden fixed right-6 bottom-24 z-[150] w-14 h-14 bg-[#F0B90B] rounded-full shadow-2xl flex items-center justify-center text-[#0b0e11] active:scale-95 transition-transform"
    >
      <Zap class="w-7 h-7 fill-current" />
    </button>

    <!-- Quick Trade View Overlay -->
    <QuickTradeView v-if="quickTradeMode" />

    <SettingsPanel ref="settingsPanel" />
    <ToastProvider />
  </div>
</template>
