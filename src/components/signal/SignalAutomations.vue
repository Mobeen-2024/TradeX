<script setup lang="ts">
import { ref } from 'vue';
import { 
  Zap, Shield, TrendingUp, AlertTriangle, Clock, Target, 
  Activity, CheckCircle2, XCircle, ChevronRight, TriangleAlert
} from 'lucide-vue-next';
import { cn } from '../../lib/utils';
import { triggerMacro as triggerMacroAction } from '../../store/strategyStore';

interface Macro {
  id: string;
  name: string;
  desc: string;
  icon: any;
  color: string;
  type: 'DEFENSIVE' | 'OFFENSIVE' | 'EMERGENCY' | 'SYSTEM';
  requiresConfirm: boolean;
}

const macros: Macro[] = [
  { id: '1', name: 'Global Protect', desc: 'Sets 10% TP and 5% SL across all active positions instantly. Overrides existing limits.', icon: Shield, color: 'text-blue-400 bg-blue-400', type: 'DEFENSIVE', requiresConfirm: false },
  { id: '2', name: 'Scale Out', desc: 'Secure profits by closing 25% of all currently profitable positions.', icon: TrendingUp, color: 'text-[#0ecb81] bg-[#0ecb81]', type: 'OFFENSIVE', requiresConfirm: false },
  { id: '4', name: 'Weekend Mode', desc: 'Reduces leverage by 50% and widens stop losses to survive low liquidity periods.', icon: Clock, color: 'text-purple-400 bg-purple-400', type: 'SYSTEM', requiresConfirm: true },
  { id: '3', name: 'Panic Close', desc: 'Market order close on ALL open positions. Use only in emergencies to liquidate portfolio.', icon: AlertTriangle, color: 'text-[#f6465d] bg-[#f6465d]', type: 'EMERGENCY', requiresConfirm: true },
  { id: '5', name: 'Trailing Activation', desc: 'Activates trailing stops on all positions currently up by more than 2% ROI.', icon: Target, color: 'text-[#F0B90B] bg-[#F0B90B]', type: 'DEFENSIVE', requiresConfirm: false },
  { id: '6', name: 'Delta Neutralize', desc: 'Automatically opens hedge shorts against your largest spot long exposures.', icon: Activity, color: 'text-[#627EEA] bg-[#627EEA]', type: 'SYSTEM', requiresConfirm: true },
];

const executionState = ref<Record<string, 'idle' | 'confirm' | 'executing' | 'success' | 'error'>>({});

const triggerMacro = async (id: string, requiresConfirm: boolean) => {
  if (requiresConfirm && executionState.value[id] !== 'confirm') {
    executionState.value[id] = 'confirm';
    return;
  }
  
  executionState.value[id] = 'executing';
  
  const success = await triggerMacroAction(id);
  
  if (success) {
    executionState.value[id] = 'success';
    setTimeout(() => {
       executionState.value[id] = 'idle';
    }, 3000);
  } else {
    executionState.value[id] = 'error';
    setTimeout(() => {
       executionState.value[id] = 'idle';
    }, 3000);
  }
};

const cancelConfirm = (id: string, e: Event) => {
   e.stopPropagation();
   executionState.value[id] = 'idle';
}

const getCategoryClass = (type: string) => {
   switch(type) {
      case 'DEFENSIVE': return 'text-blue-400 border-blue-400/20 bg-blue-400/10';
      case 'OFFENSIVE': return 'text-[#0ecb81] border-[#0ecb81]/20 bg-[#0ecb81]/10';
      case 'EMERGENCY': return 'text-[#f6465d] border-[#f6465d]/20 bg-[#f6465d]/10';
      case 'SYSTEM': return 'text-purple-400 border-purple-400/20 bg-purple-400/10';
      default: return 'text-white/50 border-white/10 bg-white/5';
   }
};

</script>

<template>
  <div class="h-full flex flex-col pt-6 px-8 pb-12 overflow-y-auto w-full no-scrollbar relative font-sans text-white">
    <!-- Ambient glowing background -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
       <div class="absolute top-1/4 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] mix-blend-screen"></div>
       <div class="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-[#627EEA]/5 rounded-full blur-[100px] mix-blend-screen"></div>
    </div>

    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 relative z-10 gap-4">
      <div>
        <h2 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-wide flex items-center gap-3">
           <Zap class="w-8 h-8 text-[#F0B90B]" /> Automations & Macros
        </h2>
        <p class="text-white/40 text-[11px] uppercase tracking-widest font-bold mt-2 ml-1">One-click playbook executions across portfolio</p>
      </div>
      
      <div class="flex flex-wrap items-center gap-3 bg-[#0a0c10]/80 p-2 border border-white/5 rounded-2xl backdrop-blur-xl shadow-lg">
         <div class="flex flex-col px-3 border-r border-white/10">
            <span class="text-[9px] text-white/40 uppercase tracking-widest font-bold">Active Rules</span>
            <span class="text-sm font-mono text-[#0ecb81] font-bold">4 Running</span>
         </div>
         <div class="flex flex-col px-3">
            <span class="text-[9px] text-white/40 uppercase tracking-widest font-bold">Macro Latency</span>
            <span class="text-sm font-mono text-white/80 font-bold">12ms</span>
         </div>
      </div>
    </div>

    <!-- Grid Layout -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 max-w-7xl auto-rows-fr pb-8">
       <div v-for="macro in macros" :key="macro.id" 
            :class="cn('group relative bg-[#0a0c10]/80 backdrop-blur-2xl border hover:border-white/[0.15] rounded-3xl p-6 transition-all duration-500 text-left overflow-hidden flex flex-col h-[260px] justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)] outline outline-1 outline-transparent', executionState[macro.id] === 'confirm' ? 'border-[#f6465d]/50 bg-[#f6465d]/5 shadow-[0_0_40px_rgba(246,70,93,0.15)] outline-[#f6465d]/30 outline-offset-4' : 'border-white/[0.05]')">
          
          <!-- Background Glow Effect for State -->
          <div :class="cn('absolute -top-32 -right-32 w-64 h-64 opacity-0 group-hover:opacity-10 blur-[90px] rounded-full transition-all duration-1000', macro.color.split(' ')[1])"></div>
          
          <div v-if="executionState[macro.id] === 'executing'" class="absolute inset-0 bg-[#0a0c10]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
             <div class="relative w-12 h-12 flex items-center justify-center mb-4">
               <div :class="cn('absolute inset-0 border-2 border-dashed rounded-full animate-[spin_2s_linear_infinite]', macro.color.split(' ')[0])"></div>
               <Zap :class="cn('w-5 h-5 animate-pulse', macro.color.split(' ')[0])" />
             </div>
             <span class="text-xs font-bold uppercase tracking-widest text-white animate-pulse">Executing Protocol...</span>
          </div>
          
          <div v-else-if="executionState[macro.id] === 'success'" class="absolute inset-0 bg-[#0ecb81]/10 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
             <CheckCircle2 class="w-12 h-12 text-[#0ecb81] mb-4 drop-shadow-[0_0_10px_rgba(14,203,129,0.5)]" />
             <span class="text-xs font-bold uppercase tracking-widest text-[#0ecb81]">Macro Successful</span>
          </div>
          
          <!-- Default View -->
          <template v-else>
            <!-- Top Section -->
            <div class="relative z-10">
               <div class="flex items-center justify-between mb-4">
                  <div :class="cn('w-12 h-12 rounded-2xl flex items-center justify-center bg-white/[0.02] border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform duration-500', macro.color.split(' ')[0])">
                    <component :is="macro.icon" class="w-6 h-6" />
                  </div>
                  <div :class="cn('px-2.5 py-1 rounded-md text-[9px] font-bold tracking-widest uppercase border', getCategoryClass(macro.type))">
                     {{ macro.type }}
                  </div>
               </div>
               
               <h3 class="text-white font-black text-xl tracking-wide mb-2">{{ macro.name }}</h3>
               <p class="text-white/50 text-[13px] leading-relaxed line-clamp-3">{{ macro.desc }}</p>
            </div>

            <!-- Bottom CTA Section -->
            <div class="relative z-10 mt-auto pt-4 border-t border-white/5">
               <div v-if="executionState[macro.id] === 'confirm'" class="flex items-center gap-2">
                 <button @click="triggerMacro(macro.id, macro.requiresConfirm)" class="flex-1 bg-[#f6465d] hover:bg-[#ff5b71] text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(246,70,93,0.3)] transition-all">
                    <TriangleAlert class="w-4 h-4" /> Confirm
                 </button>
                 <button @click="(e) => cancelConfirm(macro.id, e)" class="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-colors">
                    <XCircle class="w-4 h-4" />
                 </button>
               </div>
               <button v-else @click="triggerMacro(macro.id, macro.requiresConfirm)" :class="cn('w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 group/btn', macro.requiresConfirm ? 'bg-white/[0.02] hover:bg-[#f6465d]/10 border-white/10 hover:border-[#f6465d]/30 text-white/70 hover:text-[#f6465d]' : 'bg-white/[0.02] hover:bg-white/[0.08] border-white/10 hover:border-white/20 text-white/70 hover:text-white')">
                  <span class="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                     <Zap class="w-3.5 h-3.5" /> Execute Macro
                  </span>
                  <ChevronRight class="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
               </button>
            </div>
          </template>
       </div>
    </div>
  </div>
</template>
