<script setup lang="ts">
import { ref, onMounted } from 'vue';

import Sidebar from './components/Sidebar.vue';
import TopHeader from './components/TopHeader.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import QuickTradeView from './components/QuickTradeView.vue';
import ToastProvider from './components/ToastProvider.vue';
import LeaderBoard from './components/LeaderBoard.vue';
import Tournaments from './components/Tournaments.vue';
import TradingSignals from './components/TradingSignals.vue';

// Page Views
import MarketView from './pages/MarketView.vue';
import TradeView from './pages/TradeView.vue';
import TransactionsView from './pages/TransactionsView.vue';
import AnalyticsView from './pages/AnalyticsView.vue';

import { initAIStore } from './store/aiStore';
import { initSystemStore } from './store/systemStore';
import { quickTradeMode } from './store/tradeStore';
import { cn } from './lib/utils';
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts';
import { Zap } from 'lucide-vue-next';

const activeItem = ref('Market');

const settingsPanel = ref<InstanceType<typeof SettingsPanel> | null>(null);
const uiFlash = ref<'buy' | 'sell' | null>(null);

const triggerFlash = (type: 'buy' | 'sell') => {
    uiFlash.value = type;
    setTimeout(() => { uiFlash.value = null; }, 300);
};

// Initialize Professional Hotkeys via Composable
useKeyboardShortcuts({ triggerFlash });

onMounted(() => {
    initAIStore();
    initSystemStore();
});
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
      
      <TradeView v-if="activeItem === 'Market'" />
      
      <MarketView v-else-if="activeItem === 'Trade'" />

      <TransactionsView v-else-if="activeItem === 'Transactions'" />

      <AnalyticsView v-else-if="activeItem === 'Analytics'" />

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
