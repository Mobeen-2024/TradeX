<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { BrainCircuit, Activity, Zap, Target, TrendingUp, TrendingDown, AlignLeft, BarChart3, Clock, CheckCircle2, AlertCircle, Sparkles, Network, ShieldCheck, ZapOff } from 'lucide-vue-next';
import { cn } from '../../lib/utils';
import { executeSignal, signalQueue, riskSettings } from '../../store/strategyStore';

// UI States
const isScanning = ref(true);
const activeFilter = ref<'ALL'|'HIGH_CONVICTION'|'BUY'|'SELL'>('ALL');

// Action States
const executeState = ref<Record<string, 'idle'|'executing'|'success'|'error'>>({});

onMounted(() => {
  setTimeout(() => {
    isScanning.value = false;
  }, 1500); 
});

const filteredSignals = computed(() => {
  const signals = [...signalQueue.value].reverse(); // Show latest first
  if (activeFilter.value === 'ALL') return signals;
  if (activeFilter.value === 'HIGH_CONVICTION') return signals.filter(s => s.confidence >= 90);
  if (activeFilter.value === 'BUY') return signals.filter(s => s.direction === 'long');
  if (activeFilter.value === 'SELL') return signals.filter(s => s.direction === 'short');
  return signals;
});

const filters = [
  { id: 'ALL', label: 'Intelligence Feed' },
  { id: 'HIGH_CONVICTION', label: 'High Conviction' },
  { id: 'BUY', label: 'Long Bias' },
  { id: 'SELL', label: 'Short Bias' },
];

const handleExecute = async (signal: any) => {
  if (executeState.value[signal.id] !== 'idle') return;
  
  executeState.value[signal.id] = 'executing';
  const success = await executeSignal(signal);
  executeState.value[signal.id] = success ? 'success' : 'error';
  
  if (!success) {
    setTimeout(() => { executeState.value[signal.id] = 'idle'; }, 3000);
  }
};

const getConfidenceColor = (conf: number) => {
  if (conf >= 90) return 'text-[#F0B90B]';
  if (conf >= riskSettings.value.minConfidence) return 'text-[#0ecb81]';
  return 'text-[#f6465d]';
};

</script>

<template>
  <div class="h-full flex flex-col pt-6 px-8 pb-12 overflow-y-auto w-full no-scrollbar relative font-sans text-white">
    
    <!-- Background Ambient Glow -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
       <div class="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#627EEA]/5 rounded-full blur-[140px] mix-blend-screen"></div>
    </div>

    <!-- Header & Controls -->
    <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 relative z-10 gap-4">
      <div>
        <h2 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-wide flex items-center gap-3">
           <BrainCircuit class="w-8 h-8 text-[#627EEA]" /> AI Intelligence Stream
           <div class="flex items-center gap-2 ml-4 bg-[#0ecb81]/10 px-3 py-1 rounded-full border border-[#0ecb81]/20">
             <div class="w-2 h-2 rounded-full bg-[#0ecb81] animate-pulse shadow-[0_0_8px_#0ecb81]"></div>
             <span class="text-[#0ecb81] text-[10px] font-bold uppercase tracking-widest leading-none">Live Stream</span>
           </div>
        </h2>
        <p class="text-white/40 text-[11px] uppercase tracking-widest font-bold mt-2 ml-1 flex items-center gap-2">
          Real-time Neural Alpha Extraction & Decision Layer
        </p>
      </div>
      
      <div v-if="!isScanning" class="flex flex-wrap items-center gap-2 bg-[#0a0c10]/80 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl shadow-lg">
        <button v-for="f in filters" :key="f.id" @click="activeFilter = f.id as any"
          :class="cn('px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300', activeFilter === f.id ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80 hover:bg-white/5')">
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Scanning State -->
    <div v-if="isScanning" class="flex-1 flex flex-col items-center justify-center -mt-10 relative z-10">
       <div class="w-40 h-40 relative flex items-center justify-center mb-8">
         <div class="absolute inset-0 border border-[#627EEA]/30 rounded-full animate-ping"></div>
         <div class="w-16 h-16 rounded-full bg-[#0a0c10] border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(98,126,234,0.3)] z-10">
            <Activity class="w-6 h-6 text-[#627EEA] animate-pulse" />
         </div>
       </div>
       <h3 class="text-white font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#627EEA] to-blue-400">Syncing Intelligence Matrix</h3>
    </div>

    <!-- Feed List -->
    <div v-else class="max-w-5xl mx-auto w-full space-y-6 relative z-10 pb-8">
      
      <transition-group name="list" tag="div" class="space-y-6">
        <div v-for="signal in filteredSignals" :key="signal.id" 
             :class="cn('group relative bg-[#0a0c10]/80 backdrop-blur-2xl border rounded-3xl p-6 transition-all duration-500 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]', 
             signal.confidence >= 90 ? 'border-[#F0B90B]/20 shadow-[0_0_40px_rgba(240,185,11,0.05)]' : 'border-white/[0.05]')">
          
          <!-- Top Row: Identification -->
          <div class="flex flex-col md:flex-row md:items-start justify-between relative z-10 mb-6 gap-4 border-b border-white/5 pb-5">
             <div class="flex items-center gap-4">
                <div :class="cn('w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-transform duration-500', 
                     signal.direction === 'long' ? 'bg-[#0ecb81]/10 border-[#0ecb81]/20 text-[#0ecb81]' : 'bg-[#f6465d]/10 border-[#f6465d]/20 text-[#f6465d]')">
                   <TrendingUp v-if="signal.direction === 'long'" class="w-7 h-7" />
                   <TrendingDown v-else class="w-7 h-7" />
                </div>
                <div>
                   <h4 class="text-white font-black text-2xl tracking-wide flex items-center gap-3">
                     {{ signal.asset }}
                     <span :class="cn('px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase border', 
                           signal.direction === 'long' ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20' : 'bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20')">
                        {{ signal.direction === 'long' ? 'LONG' : 'SHORT' }}
                     </span>
                     <span v-if="signal.confidence >= riskSettings.minConfidence" class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase border bg-[#627EEA]/10 text-[#627EEA] border-[#627EEA]/20">
                       <ShieldCheck class="w-3 h-3" /> Risk Validated
                     </span>
                   </h4>
                   <div class="flex items-center gap-3 mt-1.5 font-mono text-[10px] text-white/40 uppercase tracking-wider">
                     <span>{{ new Date(signal.timestamp).toLocaleTimeString() }}</span>
                     <span class="w-1 h-1 rounded-full bg-white/20"></span>
                     <span class="flex items-center gap-1 font-bold text-[#F0B90B]"><Sparkles class="w-3 h-3" /> Neural Model v4.2</span>
                   </div>
                </div>
             </div>
             
             <!-- Confidence Score -->
             <div class="flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-white/[0.03] p-3 min-w-[100px]">
                <span class="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-1">Intelligence</span>
                <span :class="cn('text-2xl font-mono font-black', getConfidenceColor(signal.confidence))">
                  {{ signal.confidence }}%
                </span>
             </div>
          </div>

          <!-- Middle Row: Reasoning & Execution Path -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10 w-full mb-6">
             <!-- AI Reasoning -->
             <div class="md:col-span-7 space-y-4">
                <div class="flex items-center gap-2 text-white/50 text-[10px] uppercase font-bold tracking-widest">
                  <AlignLeft class="w-3.5 h-3.5" /> AI Reasoning Protocol
                </div>
                <div class="grid grid-cols-1 gap-2">
                   <div v-for="(reason, idx) in signal.aiReasoning" :key="idx" 
                        class="flex items-start gap-3 bg-white/[0.01] border border-white/[0.03] rounded-xl p-3 group/item hover:bg-white/[0.03] transition-colors">
                     <div class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-[#627EEA]"></div>
                     <span class="text-sm font-medium text-white/70">{{ reason }}</span>
                   </div>
                </div>
             </div>

             <!-- Execution Trace -->
             <div class="md:col-span-5 bg-black/40 rounded-2xl border border-white/[0.05] p-5 flex flex-col">
                <div class="flex items-center gap-2 text-white/50 text-[10px] uppercase font-bold tracking-widest mb-4">
                  <Target class="w-3.5 h-3.5" /> Execution Path
                </div>
                <div class="space-y-3">
                   <div class="flex items-center gap-3 text-xs font-bold" :class="signal.confidence >= riskSettings.minConfidence ? 'text-[#0ecb81]' : 'text-white/30'">
                      <CheckCircle2 class="w-4 h-4" /> 
                      <span class="flex-1 uppercase tracking-wider">Risk Engine Check</span>
                   </div>
                   <div class="flex items-center gap-3 text-xs font-bold" :class="executeState[signal.id] === 'success' ? 'text-[#0ecb81]' : 'text-white/30'">
                      <CheckCircle2 class="w-4 h-4" /> 
                      <span class="flex-1 uppercase tracking-wider">Position Orchestration</span>
                   </div>
                   <div class="flex items-center gap-3 text-xs font-bold text-white/30">
                      <div class="w-4 h-4 rounded-full border border-white/10"></div>
                      <span class="flex-1 uppercase tracking-wider">Auto Take-Profit Ladder</span>
                   </div>
                   <div class="flex items-center gap-3 text-xs font-bold text-white/30">
                      <div class="w-4 h-4 rounded-full border border-white/10"></div>
                      <span class="flex-1 uppercase tracking-wider">Trailing Guard Activation</span>
                   </div>
                </div>
                
                <div class="mt-6 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                   <div>
                      <span class="block text-[9px] text-white/30 uppercase font-bold mb-1">Target</span>
                      <span class="text-xs font-mono font-black text-[#0ecb81]">${{ signal.takeProfit.toLocaleString() }}</span>
                   </div>
                   <div class="text-right">
                      <span class="block text-[9px] text-white/30 uppercase font-bold mb-1">Protection</span>
                      <span class="text-xs font-mono font-black text-[#f6465d]">${{ signal.stopLoss.toLocaleString() }}</span>
                   </div>
                </div>
             </div>
          </div>

          <!-- Bottom Row: Status & Actions -->
          <div class="flex items-center justify-between relative z-10 pt-4 border-t border-white/5 mt-auto">
             <div class="flex items-center gap-3">
                <div class="flex -space-x-2">
                   <div v-for="i in 3" :key="i" class="w-6 h-6 rounded-full border-2 border-[#0a0c10] bg-[#627EEA]/20 flex items-center justify-center overflow-hidden">
                      <Activity class="w-3 h-3 text-[#627EEA]" />
                   </div>
                </div>
                <span class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Nodes Active</span>
             </div>

             <div class="flex items-center gap-3">
                <button v-if="signal.confidence < riskSettings.minConfidence" disabled class="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/20 flex items-center gap-2">
                   <ZapOff class="w-3.5 h-3.5" /> Confidence Too Low
                </button>
                <button v-else @click="handleExecute(signal)" 
                        :disabled="executeState[signal.id] !== 'idle' && executeState[signal.id] !== 'error'"
                        :class="cn('px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 shadow-xl', 
                        executeState[signal.id] === 'executing' ? 'bg-white/10 text-white cursor-wait animate-pulse' : 
                        executeState[signal.id] === 'success' ? 'bg-[#0ecb81] text-black shadow-[0_0_20px_rgba(14,203,129,0.4)]' :
                        executeState[signal.id] === 'error' ? 'bg-[#f6465d] text-white' :
                        signal.direction === 'long' ? 'bg-[#0ecb81] text-black hover:bg-[#10d98b] hover:-translate-y-0.5' : 
                        'bg-[#f6465d] text-white hover:bg-[#ff5b71] hover:-translate-y-0.5')">
                   <Activity v-if="executeState[signal.id] === 'executing'" class="w-4 h-4 animate-spin" />
                   <CheckCircle2 v-else-if="executeState[signal.id] === 'success'" class="w-4 h-4" />
                   <AlertCircle v-else-if="executeState[signal.id] === 'error'" class="w-4 h-4" />
                   <Zap v-else class="w-4 h-4" /> 
                   {{ 
                      executeState[signal.id] === 'executing' ? 'Executing...' : 
                      executeState[signal.id] === 'success' ? 'Deployed' : 
                      executeState[signal.id] === 'error' ? 'Retry' :
                      '1-Click Execute'
                   }}
                </button>
             </div>
          </div>

        </div>
      </transition-group>
      
      <div v-if="filteredSignals.length === 0" class="py-20 text-center flex flex-col items-center">
         <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Activity class="w-8 h-8 text-white/20" />
         </div>
         <p class="text-white/60 font-bold">No neural signals currently in buffer.</p>
      </div>

    </div>

  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-30px) scale(0.95);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
