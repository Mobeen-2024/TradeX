<script setup lang="ts">
import { ref } from 'vue';
import { aiNarration, aiImbalance, aiAlerts, isAiThinking } from '../store/aiStore';
import { Brain, Activity, Target, Zap, ChevronRight, AlertCircle } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const activeTab = ref<'intent' | 'alerts'>('intent');
</script>

<template>
  <div class="flex flex-col h-full bg-slate-900/50 backdrop-blur-xl border-l border-white/5 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-white/5">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-indigo-500/20 rounded-lg">
          <Brain class="w-4 h-4 text-indigo-400" />
        </div>
        <h3 class="text-sm font-semibold text-white uppercase tracking-wider">Market Intelligence</h3>
      </div>
      <div class="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-full">
        <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        <span class="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Live AI</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex p-1 bg-black/20 m-3 rounded-lg border border-white/5">
      <button 
        @click="activeTab = 'intent'"
        :class="cn(
          'flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
          activeTab === 'intent' ? 'bg-indigo-500/20 text-indigo-300 shadow-lg' : 'text-slate-500 hover:text-slate-300'
        )"
      >
        <Activity class="w-3.5 h-3.5" />
        Intent
      </button>
      <button 
        @click="activeTab = 'alerts'"
        :class="cn(
          'flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
          activeTab === 'alerts' ? 'bg-indigo-500/20 text-indigo-300 shadow-lg' : 'text-slate-500 hover:text-slate-300'
        )"
      >
        <Zap class="w-3.5 h-3.5" />
        Alerts
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-4 pb-4">
      <!-- Intent Tab -->
      <div v-if="activeTab === 'intent'" class="space-y-6">
        <!-- Imbalance Meter -->
        <div class="space-y-3">
          <div class="flex justify-between text-[11px] font-bold uppercase tracking-wider">
            <span class="text-emerald-400">Bid Pressure</span>
            <span class="text-rose-400">Ask Pressure</span>
          </div>
          <div class="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 flex">
            <div 
              class="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out"
              :style="{ width: `${aiImbalance * 100}%` }"
            />
            <div 
              class="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-1000 ease-out flex-1"
            />
          </div>
          <div class="flex justify-between text-[10px] font-medium text-slate-500">
            <span>{{ (aiImbalance * 100).toFixed(1) }}%</span>
            <span>{{ ((1 - aiImbalance) * 100).toFixed(1) }}%</span>
          </div>
        </div>

        <!-- Narration Box -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
             <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institutional Narrative</span>
             <div v-if="isAiThinking" class="flex gap-1">
               <div class="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" />
               <div class="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
               <div class="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
             </div>
          </div>
          <div class="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 relative group overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p class="text-sm leading-relaxed text-indigo-100/90 font-medium italic relative z-10">
              "{{ aiNarration || 'Analyzing market microstructure for institutional footprints...' }}"
            </p>
          </div>
        </div>

        <!-- Insights Grid -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
            <span class="text-[10px] text-slate-500 font-bold uppercase">Liquidity</span>
            <div class="text-xs text-white font-medium">Deep Support</div>
          </div>
          <div class="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
            <span class="text-[10px] text-slate-500 font-bold uppercase">Volatility</span>
            <div class="text-xs text-white font-medium">Compressing</div>
          </div>
        </div>
      </div>

      <!-- Alerts Tab -->
      <div v-if="activeTab === 'alerts'" class="space-y-3">
        <div v-if="aiAlerts.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-500 italic space-y-2">
          <AlertCircle class="w-8 h-8 opacity-20" />
          <span class="text-xs">No institutional patterns detected</span>
        </div>
        
        <div 
          v-for="(alert, idx) in aiAlerts" 
          :key="idx"
          class="p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 space-y-1">
              <div class="flex items-center gap-2">
                <span 
                  :class="cn(
                    'text-[10px] font-black uppercase px-1.5 py-0.5 rounded',
                    alert.direction === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  )"
                >
                  {{ alert.pattern }}
                </span>
                <span class="text-[10px] font-bold text-slate-500">{{ (alert.confidence * 100).toFixed(0) }}% Conf.</span>
              </div>
              <p class="text-xs text-slate-300 leading-snug">{{ alert.rationale }}</p>
              <div class="flex items-center gap-1 text-[10px] font-bold text-slate-500 mt-2">
                <Target class="w-3 h-3" />
                Trigger: ${{ alert.price.toLocaleString() }}
              </div>
            </div>
            <ChevronRight class="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
