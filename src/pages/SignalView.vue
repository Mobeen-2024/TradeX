<script setup lang="ts">
import { ref } from 'vue';
import { cn } from '../lib/utils';
import { Bot, Layers, TrendingUp, BrainCircuit, Zap, Crosshair } from 'lucide-vue-next';
import TradingChartWidget from '../components/TradingChartWidget.vue';

// Subcomponents
import SignalStrategies from '../components/signal/SignalStrategies.vue';
import SignalPositions from '../components/signal/SignalPositions.vue';
import SignalFeed from '../components/signal/SignalFeed.vue';
import SignalAutomations from '../components/signal/SignalAutomations.vue';
import SignalBuilder from '../components/signal/SignalBuilder.vue';
import AiStrategyPlanner from '../components/signal/AiStrategyPlanner.vue';

const activeTab = ref('AI Planner');
const selectedStrategyId = ref<string | null>(null);

const tabs = [
  { id: 'AI Planner', icon: BrainCircuit, label: 'AI Planner' },
  { id: 'Strategies', icon: Layers, label: 'Strategies' },
  { id: 'Positions', icon: TrendingUp, label: 'Positions' },
  { id: 'AI Signals', icon: Zap, label: 'AI Signals' },
  { id: 'Automations', icon: Bot, label: 'Automations' }
];

const handleOpenStrategy = (id: string) => {
   selectedStrategyId.value = id;
};

const closeStrategy = () => {
   selectedStrategyId.value = null;
};
</script>

<template>
  <div class="flex-1 flex overflow-hidden bg-[#050608] w-full h-full relative font-sans text-white">
    
    <!-- Background Vibe -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <TradingChartWidget symbol="BTC/USDT" interval="15m" :isSynced="false" panelId="signal-bg" class="opacity-10 grayscale scale-105 blur-[1px]" />
        <div class="absolute inset-0 bg-gradient-to-br from-[#050608]/90 via-[#050608]/80 to-[#0a0c10]/95 mix-blend-multiply"></div>
        
        <!-- Glowing Orbs based on state -->
        <div class="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#627EEA]/5 rounded-full blur-[120px] mix-blend-screen transition-opacity duration-1000" :class="activeTab === 'AI Signals' ? 'opacity-100' : 'opacity-0'"></div>
        <div class="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#0ecb81]/5 rounded-full blur-[120px] mix-blend-screen transition-opacity duration-1000" :class="activeTab === 'Positions' ? 'opacity-100' : 'opacity-0'"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#F0B90B]/5 rounded-full blur-[150px] mix-blend-screen transition-opacity duration-1000" :class="activeTab === 'Strategies' ? 'opacity-100' : 'opacity-0'"></div>
    </div>

    <!-- MAIN DASHBOARD VIEW (When no specific builder is open) -->
    <div v-if="!selectedStrategyId" class="relative z-10 flex flex-col lg:flex-row w-full h-full">
      
      <!-- Navigation (Sidebar on Desktop, Tab Bar on Mobile) -->
      <div class="lg:w-64 w-full border-r lg:border-b-0 border-b border-white/5 bg-black/40 backdrop-blur-xl flex flex-col pt-4 lg:pt-8 pb-4 lg:pb-6 px-4 shrink-0">
         <div class="hidden lg:flex items-center gap-3 px-2 mb-10">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F0B90B]/20 to-[#f59e0b]/10 border border-[#F0B90B]/30 flex items-center justify-center shadow-[0_0_20px_rgba(240,185,11,0.15)] relative overflow-hidden group">
               <div class="absolute inset-0 bg-gradient-to-br from-[#F0B90B] to-transparent opacity-0 group-hover:opacity-10 transition-opacity"></div>
               <Bot class="w-5 h-5 text-[#F0B90B]" />
            </div>
            <div>
               <h1 class="text-sm font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Neural Engine</h1>
               <div class="flex items-center gap-1.5 mt-0.5">
                 <div class="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse"></div>
                 <span class="text-[9px] uppercase tracking-widest text-[#0ecb81]/80 font-bold">System Online</span>
               </div>
            </div>
         </div>

         <!-- Tabs (Vertical on Desktop, Horizontal on Mobile) -->
         <nav class="flex lg:flex-col flex-row gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
            <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
              :class="cn('lg:w-full flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-xl transition-all duration-300 group relative overflow-hidden whitespace-nowrap', activeTab === tab.id ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/10' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03] border border-transparent')">
               
               <!-- Active Indicator line -->
               <div :class="cn('absolute lg:left-0 lg:top-1/2 lg:-translate-y-1/2 lg:w-1 lg:h-1/2 bottom-0 left-1/4 right-1/4 h-0.5 lg:bottom-auto lg:right-auto bg-[#F0B90B] rounded-full transition-transform duration-300', activeTab === tab.id ? 'scale-100' : 'scale-0')"></div>
               
               <component :is="tab.icon" :class="cn('w-4 h-4 lg:w-5 lg:h-5 transition-colors', activeTab === tab.id ? 'text-[#F0B90B]' : 'text-white/40 group-hover:text-white/60')" />
               <span class="font-bold text-xs lg:text-sm tracking-wide">{{ tab.label }}</span>
            </button>
         </nav>

         <div class="hidden lg:block mt-auto px-2">
            <div class="bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-2xl p-4">
               <div class="flex items-center gap-2 mb-2">
                  <Crosshair class="w-4 h-4 text-[#F0B90B]" />
                  <span class="text-xs font-bold text-white uppercase tracking-wider">Aura Core</span>
               </div>
               <p class="text-[10px] text-white/40 leading-relaxed font-medium">Your quantum intelligence grid is actively routing orders.</p>
            </div>
         </div>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 relative z-10 overflow-y-auto no-scrollbar">
         <transition mode="out-in" enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-4">
           <AiStrategyPlanner v-if="activeTab === 'AI Planner'" @openStrategy="handleOpenStrategy" />
           <SignalStrategies v-else-if="activeTab === 'Strategies'" @openStrategy="handleOpenStrategy" />
           <SignalPositions v-else-if="activeTab === 'Positions'" />
           <SignalFeed v-else-if="activeTab === 'AI Signals'" />
           <SignalAutomations v-else-if="activeTab === 'Automations'" />
         </transition>
      </div>
    </div>

    <!-- BUILDER MODE (Full screen overlay when a strategy is selected) -->
    <transition enter-active-class="transition duration-500 ease-out" enter-from-class="transform translate-y-8 opacity-0 scale-[0.98]" enter-to-class="transform translate-y-0 opacity-100 scale-100" leave-active-class="transition duration-300 ease-in" leave-from-class="transform translate-y-0 opacity-100 scale-100" leave-to-class="transform translate-y-8 opacity-0 scale-[0.98]">
      <div v-if="selectedStrategyId" class="absolute inset-0 bg-[#0a0c10]/95 backdrop-blur-[60px] z-50 overflow-hidden ring-1 ring-white/5">
        <SignalBuilder :strategyId="selectedStrategyId" @close="closeStrategy" />
      </div>
    </transition>

  </div>
</template>
