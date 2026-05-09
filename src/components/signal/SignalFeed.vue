<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { BrainCircuit, Activity, ArrowRight, Zap, Target, TrendingUp, TrendingDown, AlignLeft, BarChart3, Clock, CheckCircle2, AlertCircle, Sparkles, Network } from 'lucide-vue-next';
import { cn } from '../../lib/utils';
import { aiAlerts } from '../../store/aiStore';
import { currentPrice } from '../../store/tradeStore';

// UI States
const isScanning = ref(true);
const activeFilter = ref<'ALL'|'HIGH_CONVICTION'|'BUY'|'SELL'>('ALL');

// Action States
const analyzeState = ref<Record<string, 'idle'|'analyzing'|'analyzed'>>({});
const executeState = ref<Record<string, 'idle'|'executing'|'success'|'error'>>({});

// Real-time Visual Tweaks
const lastUpdated = ref<Record<string, boolean>>({});

// Mock Data Structure
interface Signal {
  id: string;
  asset: string;
  type: 'BUY' | 'SELL' | 'ACCUMULATE' | 'DISTRIBUTE';
  confidence: number;
  timeframe: string;
  priceTarget: string;
  stopLoss: string;
  validFor: string;
  triggers: string[];
  time: string;
}

const aiSignals = ref<Signal[]>([]);
let realTimeInterval: ReturnType<typeof setInterval>;

onMounted(() => {
  setTimeout(() => {
    isScanning.value = false;
    aiSignals.value = [
      { 
        id: 's1', asset: 'BTC/USDT', type: 'BUY', confidence: 94, timeframe: '15m', 
        priceTarget: '$68,500', stopLoss: '$65,200', validFor: '45m', time: 'Just now',
        triggers: ['RSI Bullish Divergence on 15m', 'Orderbook Imbalance (Ask Side Depleted)', '+450 BTC Spot Delta in 5m'] 
      },
      { 
        id: 's2', asset: 'ETH/USDT', type: 'SELL', confidence: 88, timeframe: '1H', 
        priceTarget: '$3,150', stopLoss: '$3,480', validFor: '2h', time: '2 mins ago',
        triggers: ['Failed S/R Flip at $3,400', 'Whale Inflow to Binance Exchange Wallet', 'Funding Rate Extreme Positive'] 
      },
      { 
        id: 's3', asset: 'SOL/USDT', type: 'ACCUMULATE', confidence: 82, timeframe: '4H', 
        priceTarget: '$185.00', stopLoss: '$142.00', validFor: '12h', time: '14 mins ago',
        triggers: ['Bollinger Band Squeeze Breakout Entry', 'Surge in Network TVL Momentum', 'DEX Volume 2.5x vs 24h Average'] 
      },
    ];
    // Initialize states
    aiSignals.value.forEach(s => {
      analyzeState.value[s.id] = 'idle';
      executeState.value[s.id] = 'idle';
    });

    // Start real-time simulation
    realTimeInterval = setInterval(() => {
       aiSignals.value.forEach((signal) => {
         // Randomly fluctuate confidence slightly
         if (Math.random() > 0.6) {
           const change = Math.round(Math.random() * 2 - 1);
           const newConf = Math.max(10, Math.min(99, signal.confidence + change));
           if (newConf !== signal.confidence) {
             signal.confidence = newConf;
             // Trigger momentary flash
             lastUpdated.value[signal.id] = true;
             setTimeout(() => { lastUpdated.value[signal.id] = false; }, 800);
           }
         }
       });
    }, 2500);
  }, 1500); // Simulate network load
});

watch(aiAlerts, (newAlerts) => {
  if (!newAlerts.length || isScanning.value) return;
  const latestAlert = newAlerts[0];
  
  // Create a signal from AI Alert if not already added
  const newSignalId = `ai_alert_${Date.now()}`;
  const newSignal: Signal = {
    id: newSignalId,
    asset: latestAlert.pattern.includes('BTC') ? 'BTC/USDT' : 
           latestAlert.pattern.includes('ETH') ? 'ETH/USDT' : 'SOL/USDT', // Best guess
    type: latestAlert.direction === 'bullish' ? 'BUY' : 'SELL',
    confidence: Math.round(latestAlert.confidence),
    timeframe: '5m',
    priceTarget: 'TBD',
    stopLoss: 'TBD',
    validFor: '15m',
    time: 'Live',
    triggers: [
      latestAlert.pattern,
      latestAlert.rationale,
      'Real-time WS feed trigger'
    ]
  };

  aiSignals.value.unshift(newSignal);
  if (aiSignals.value.length > 20) aiSignals.value.pop();

  analyzeState.value[newSignalId] = 'idle';
  executeState.value[newSignalId] = 'idle';
}, { deep: true });

onUnmounted(() => {
  clearInterval(realTimeInterval);
});

const filteredSignals = computed(() => {
  if (activeFilter.value === 'ALL') return aiSignals.value;
  if (activeFilter.value === 'HIGH_CONVICTION') return aiSignals.value.filter(s => s.confidence >= 90);
  if (activeFilter.value === 'BUY') return aiSignals.value.filter(s => s.type === 'BUY' || s.type === 'ACCUMULATE');
  if (activeFilter.value === 'SELL') return aiSignals.value.filter(s => s.type === 'SELL' || s.type === 'DISTRIBUTE');
  return aiSignals.value;
});

const filters = [
  { id: 'ALL', label: 'All Signals' },
  { id: 'HIGH_CONVICTION', label: 'High Conviction (>90%)' },
  { id: 'BUY', label: 'Long Bias' },
  { id: 'SELL', label: 'Short Bias' },
];

const handleAnalyze = (id: string) => {
  if (analyzeState.value[id] !== 'idle') return;
  analyzeState.value[id] = 'analyzing';
  setTimeout(() => {
    analyzeState.value[id] = 'analyzed';
  }, 2000);
};

const handleExecute = (id: string) => {
  if (executeState.value[id] !== 'idle') return;
  executeState.value[id] = 'executing';
  setTimeout(() => {
    // 90% chance of success
    executeState.value[id] = Math.random() > 0.1 ? 'success' : 'error';
    
    // Auto reset error state
    if (executeState.value[id] === 'error') {
       setTimeout(() => { executeState.value[id] = 'idle'; }, 3000);
    }
  }, 1500);
};

</script>

<template>
  <div class="h-full flex flex-col pt-6 px-8 pb-12 overflow-y-auto w-full no-scrollbar relative font-sans text-white">
    
    <!-- Background Ambient Glow -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
       <div class="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#627EEA]/5 rounded-full blur-[140px] mix-blend-screen mix-blend-plus-lighter"></div>
    </div>

    <!-- Header & Controls -->
    <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 relative z-10 gap-4">
      <div>
        <h2 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-wide flex items-center gap-3">
           <BrainCircuit class="w-8 h-8 text-[#627EEA]" /> Alpha Feed
           <div class="flex items-center gap-2 ml-4 bg-[#0ecb81]/10 px-3 py-1 rounded-full border border-[#0ecb81]/20">
             <div class="w-2 h-2 rounded-full bg-[#0ecb81] animate-pulse shadow-[0_0_8px_#0ecb81]"></div>
             <span class="text-[#0ecb81] text-[10px] font-bold uppercase tracking-widest leading-none">Live Data</span>
           </div>
        </h2>
        <p class="text-white/40 text-[11px] uppercase tracking-widest font-bold mt-2 ml-1 flex items-center gap-2">
          Real-time Neural Alpha Extraction
        </p>
      </div>
      
      <div v-if="!isScanning" class="flex flex-wrap items-center gap-2 bg-[#0a0c10]/80 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl shadow-lg">
        <button v-for="f in filters" :key="f.id" @click="activeFilter = f.id as any"
          :class="cn('px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300', activeFilter === f.id ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80 hover:bg-white/5')">
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Scanning State (Radar visual) -->
    <div v-if="isScanning" class="flex-1 flex flex-col items-center justify-center -mt-10 relative z-10">
       <div class="w-40 h-40 relative flex items-center justify-center mb-8">
         <div class="absolute inset-0 border border-[#627EEA]/30 rounded-full animate-[ping_2s_ease-out_infinite]"></div>
         <div class="absolute inset-4 border border-[#627EEA]/20 rounded-full animate-[ping_2.5s_ease-out_infinite] delay-300"></div>
         <div class="absolute inset-8 border border-white/5 rounded-full border-dashed animate-[spin_4s_linear_infinite]"></div>
         <div class="absolute inset-12 border border-[#F0B90B]/20 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
         <div class="w-16 h-16 rounded-full bg-[#0a0c10] border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(98,126,234,0.3)] z-10">
            <Activity class="w-6 h-6 text-[#627EEA] animate-pulse" />
         </div>
       </div>
       <h3 class="text-white font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#627EEA] to-blue-400">Scanning Market Matrix</h3>
       <p class="text-white/40 text-[11px] mt-3 uppercase tracking-widest font-mono text-center max-w-xs leading-relaxed">Cross-referencing orderbook anomalies with historical price trajectories.</p>
    </div>

    <!-- Feed List -->
    <div v-else class="max-w-5xl mx-auto w-full space-y-5 relative z-10 pb-8">
      
      <transition-group name="list" tag="div" class="space-y-6">
        <div v-for="signal in filteredSignals" :key="signal.id" :class="cn('group relative bg-[#0a0c10]/80 backdrop-blur-2xl border hover:border-white/[0.15] rounded-3xl p-6 transition-all duration-500 overflow-hidden', lastUpdated[signal.id] ? 'border-[#0ecb81]/50 shadow-[0_0_30px_rgba(14,203,129,0.2)]' : 'border-white/[0.05] shadow-[0_10px_40px_rgba(0,0,0,0.5)]')">
          
          <!-- Subtle outcome glow -->
          <div :class="cn('absolute -top-32 -right-32 w-64 h-64 opacity-0 group-hover:opacity-10 blur-[100px] rounded-full transition-opacity duration-1000', signal.type.includes('BUY') || signal.type === 'ACCUMULATE' ? 'bg-[#0ecb81]' : 'bg-[#f6465d]')"></div>

          <!-- Top Row: Identification & Rating -->
          <div class="flex flex-col md:flex-row md:items-start justify-between relative z-10 mb-6 gap-4 border-b border-white/5 pb-5">
             <div class="flex items-center gap-4">
                <div :class="cn('w-14 h-14 rounded-2xl flex items-center justify-center border shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform duration-500', signal.type.includes('BUY') || signal.type === 'ACCUMULATE' ? 'bg-[#0ecb81]/10 border-[#0ecb81]/20 text-[#0ecb81]' : 'bg-[#f6465d]/10 border-[#f6465d]/20 text-[#f6465d]')">
                   <TrendingUp v-if="signal.type.includes('BUY') || signal.type === 'ACCUMULATE'" class="w-7 h-7" />
                   <TrendingDown v-else class="w-7 h-7" />
                </div>
                <div>
                   <h4 class="text-white font-black text-2xl tracking-wide flex items-center gap-3">
                     {{ signal.asset }}
                     <span :class="cn('px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase border', signal.type.includes('BUY') || signal.type === 'ACCUMULATE' ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20' : 'bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20')">
                        {{ signal.type }}
                     </span>
                   </h4>
                   <div class="flex items-center gap-3 mt-1.5 font-mono text-[10px] text-white/40 uppercase tracking-wider">
                     <span>{{ signal.time }}</span>
                     <span class="w-1 h-1 rounded-full bg-white/20"></span>
                     <span class="flex items-center gap-1"><Clock class="w-3 h-3" /> Valid: {{ signal.validFor }}</span>
                   </div>
                </div>
             </div>
             
             <!-- Confidence Score Circle -->
             <div class="flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-white/[0.03] p-3 w-24">
                <span class="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-1">Conviction</span>
                <span :class="cn('text-2xl font-mono font-black', signal.confidence >= 90 ? 'text-[#F0B90B] drop-shadow-[0_0_10px_rgba(240,185,11,0.5)]' : 'text-white/90')">
                  {{ signal.confidence }}<span class="text-sm text-white/50">%</span>
                </span>
             </div>
          </div>

          <!-- Middle Row: Reasoning & Metrics -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10 w-full mb-6">
             <!-- Triggers -->
             <div class="md:col-span-8 space-y-3">
                <div class="flex items-center gap-2 text-white/50 text-[10px] uppercase font-bold tracking-widest">
                  <AlignLeft class="w-3.5 h-3.5" /> Logical Triggers
                </div>
                <div class="space-y-2">
                   <div v-for="(trigger, idx) in signal.triggers" :key="idx" class="flex items-start gap-3 bg-white/[0.02] border border-white/[0.02] rounded-xl p-3 hover:bg-white/[0.04] transition-colors">
                     <div class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-white/20"></div>
                     <span class="text-sm font-medium text-white/70">{{ trigger }}</span>
                   </div>
                </div>
             </div>

             <!-- Setup Params -->
             <div class="md:col-span-4 bg-[#050608]/50 rounded-2xl border border-white/[0.05] p-5 flex flex-col justify-between">
                <div class="flex items-center gap-2 text-white/50 text-[10px] uppercase font-bold tracking-widest mb-4">
                  <Target class="w-3.5 h-3.5" /> Target Coordinates
                </div>
                <div class="space-y-4">
                   <div class="flex justify-between items-end border-b border-white/5 pb-2">
                     <span class="text-[10px] text-white/40 uppercase tracking-widest font-mono">Timeframe</span>
                     <span class="text-sm font-bold text-white">{{ signal.timeframe }}</span>
                   </div>
                   <div class="flex justify-between items-end border-b border-white/5 pb-2">
                     <span class="text-[10px] text-white/40 uppercase tracking-widest font-mono">Take Profit</span>
                     <span class="text-sm font-bold text-[#0ecb81] font-mono">{{ signal.priceTarget }}</span>
                   </div>
                   <div class="flex justify-between items-end">
                     <span class="text-[10px] text-white/40 uppercase tracking-widest font-mono">Stop Loss</span>
                     <span class="text-sm font-bold text-[#f6465d] font-mono">{{ signal.stopLoss }}</span>
                   </div>
                </div>
             </div>
          </div>

          <!-- Expandable Analysis Panel -->
          <div v-if="analyzeState[signal.id] === 'analyzing' || analyzeState[signal.id] === 'analyzed'" 
               class="relative z-10 w-full mb-6 border-t border-white/5 pt-6 mt-4">
             
             <!-- Analysis Loading State -->
             <div v-if="analyzeState[signal.id] === 'analyzing'" class="flex flex-col items-center justify-center py-6 gap-3">
                <Network class="w-8 h-8 text-[#627EEA] animate-pulse" />
                <p class="text-[10px] font-bold text-white/50 uppercase tracking-widest animate-pulse">Running Neural Inference...</p>
             </div>
             
             <!-- Analyzed Results State -->
             <div v-else-if="analyzeState[signal.id] === 'analyzed'" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white/5 border border-white/10 rounded-xl p-4">
                   <h5 class="text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">Chart Pattern</h5>
                   <div class="flex items-center gap-2">
                      <Sparkles class="w-4 h-4 text-[#F0B90B]" />
                      <span class="text-xs font-medium text-white/80">Fractal Squeeze Play detected on multiple timeframes.</span>
                   </div>
                </div>
                <div class="bg-white/5 border border-white/10 rounded-xl p-4">
                   <h5 class="text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">Volume Delta</h5>
                   <div class="flex flex-col gap-1">
                      <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                         <div class="h-full bg-[#0ecb81] w-[75%] rounded-full"></div>
                      </div>
                      <span class="text-[10px] font-mono text-[#0ecb81]">+75% Buyers Domination</span>
                   </div>
                </div>
                <div class="bg-white/5 border border-white/10 rounded-xl p-4">
                   <h5 class="text-[9px] uppercase tracking-widest text-white/40 mb-2 font-bold">On-Chain Flow</h5>
                   <div class="flex items-center gap-2">
                      <Activity class="w-4 h-4 text-[#627EEA]" />
                      <span class="text-xs font-medium text-white/80">Massive exchange outflows over the last 15m.</span>
                   </div>
                </div>
             </div>
          </div>

          <!-- Bottom Row: CTA -->
          <div class="flex items-center justify-end gap-3 relative z-10 pt-4 border-t border-white/5 mt-auto">
             
             <!-- Analyze Button -->
             <button @click="handleAnalyze(signal.id)" 
                     :disabled="analyzeState[signal.id] !== 'idle'"
                     :class="cn('px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-2', 
                     analyzeState[signal.id] !== 'idle' ? 'text-[#627EEA] bg-[#627EEA]/10 border-[#627EEA]/20 cursor-default' : 'text-white/60 hover:text-white hover:bg-white/5')">
               <Network v-if="analyzeState[signal.id] === 'analyzing'" class="w-4 h-4 animate-spin" />
               <CheckCircle2 v-else-if="analyzeState[signal.id] === 'analyzed'" class="w-4 h-4" />
               <BarChart3 v-else class="w-4 h-4" /> 
               {{ analyzeState[signal.id] === 'analyzing' ? 'Analyzing...' : (analyzeState[signal.id] === 'analyzed' ? 'Analyzed' : 'Analyze') }}
             </button>
             
             <!-- Execute Button -->
             <button @click="handleExecute(signal.id)" 
                     :disabled="executeState[signal.id] !== 'idle'"
                     :class="cn('px-6 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center gap-2 shadow-xl', 
                     executeState[signal.id] === 'executing' ? 'bg-white/10 text-white cursor-wait animate-pulse' : 
                     executeState[signal.id] === 'success' ? 'bg-[#0ecb81] text-black shadow-[0_0_20px_rgba(14,203,129,0.4)] cursor-default' :
                     executeState[signal.id] === 'error' ? 'bg-[#f6465d] text-white shadow-[0_0_20px_rgba(246,70,93,0.4)]' :
                     signal.type.includes('BUY') || signal.type === 'ACCUMULATE' ? 'bg-[#0ecb81] text-black hover:bg-[#10d98b] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(14,203,129,0.4)]' : 
                     'bg-[#f6465d] text-white hover:bg-[#ff5b71] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(246,70,93,0.4)]')">
                <Activity v-if="executeState[signal.id] === 'executing'" class="w-4 h-4 animate-spin" />
                <CheckCircle2 v-else-if="executeState[signal.id] === 'success'" class="w-4 h-4" />
                <AlertCircle v-else-if="executeState[signal.id] === 'error'" class="w-4 h-4" />
                <Zap v-else class="w-4 h-4" /> 
                
                {{ 
                   executeState[signal.id] === 'executing' ? 'Executing...' : 
                   executeState[signal.id] === 'success' ? 'Executed' : 
                   executeState[signal.id] === 'error' ? 'Retry Action' :
                   '1-Click Execute'
                }}
             </button>
          </div>

        </div>
      </transition-group>
      
      <div v-if="filteredSignals.length === 0" class="py-20 text-center flex flex-col items-center">
         <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Activity class="w-8 h-8 text-white/20" />
         </div>
         <p class="text-white/60 font-bold">No active signals found matching the criteria.</p>
      </div>

    </div>

  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.98);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>
