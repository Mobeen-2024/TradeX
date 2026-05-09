<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  Bot,
  Play,
  Pause,
  Zap,
  Activity,
  Plus,
  Settings2,
  Power,
  Layers,
  Network,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Gauge,
  Wifi,
  Workflow
} from "lucide-vue-next";
import { cn } from "../../lib/utils";
import { eventBus } from "../../lib/eventBus";
import {
  strategies,
  Strategy,
  toggleStrategyState
} from "../../store/strategyStore";

const isLoading = ref(true);

type ExecutionState = "idle" | "toggling" | "success" | "failed";
const executionStates = ref<Record<string, ExecutionState>>({});
const activeFilter = ref<"ALL" | "RUNNING" | "PAUSED">("ALL");

onMounted(() => {
  setTimeout(() => {
    strategies.value.forEach(
      (s) => (executionStates.value[s.id] = "idle"),
    );
    isLoading.value = false;
  }, 800);
});

const filteredStrategies = computed(() => {
  if (activeFilter.value === "ALL") return strategies.value;
  if (activeFilter.value === "RUNNING")
    return strategies.value.filter((s) => s.status === "running");
  return strategies.value.filter((s) => s.status === "paused" || s.status === "error");
});

const getHealthClass = (health: string) => {
  switch (health) {
    case 'optimal': return 'border-[#0ecb81]/30 shadow-[0_0_20px_rgba(14,203,129,0.1)]';
    case 'degraded': return 'border-[#f59e0b]/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]';
    case 'critical': return 'border-[#f6465d]/30 shadow-[0_0_20px_rgba(246,70,93,0.1)]';
    default: return 'border-white/10';
  }
};

const getHealthGlow = (health: string) => {
  switch (health) {
    case 'optimal': return 'bg-[#0ecb81]';
    case 'degraded': return 'bg-[#f59e0b]';
    case 'critical': return 'bg-[#f6465d]';
    default: return 'bg-[#627EEA]';
  }
};

const toggleStrategy = async (strategy: Strategy) => {
  if (executionStates.value[strategy.id] !== "idle") return;
  executionStates.value[strategy.id] = "toggling";
  try {
    await toggleStrategyState(strategy.id);
    executionStates.value[strategy.id] = "success";
  } catch (err) {
    executionStates.value[strategy.id] = "failed";
  } finally {
    setTimeout(() => { executionStates.value[strategy.id] = "idle"; }, 1500);
  }
};

const emits = defineEmits(["openStrategy"]);

const formatCurrency = (val: number) => {
  return Math.abs(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const runningCount = computed(() => strategies.value.filter((s) => s.status === "running").length);
</script>

<template>
  <div class="h-full flex flex-col pt-6 px-8 pb-12 overflow-y-auto w-full no-scrollbar relative font-sans text-white">
    
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 relative z-10 gap-6">
      <div>
        <h2 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-wide flex items-center gap-3 mb-2">
          <Cpu class="w-8 h-8 text-[#F0B90B]" /> Neural Runtime Pods
        </h2>
        <div class="flex items-center gap-4 text-white/40 text-[11px] uppercase tracking-widest font-bold">
          <span class="flex items-center gap-2 text-[#0ecb81]"><Activity class="w-3 h-3 animate-pulse" /> {{ runningCount }} Online Pods</span>
          <span class="w-1 h-1 rounded-full bg-white/20"></span>
          <span class="text-white/60">Distributed Multi-Agent Architecture</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 bg-[#0a0c10]/80 p-2 border border-white/5 rounded-2xl backdrop-blur-xl shadow-lg">
        <div class="flex items-center gap-1.5 px-2">
          <button @click="activeFilter = 'ALL'" :class="cn('px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all', activeFilter === 'ALL' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5')">All Pods</button>
          <button @click="activeFilter = 'RUNNING'" :class="cn('px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all', activeFilter === 'RUNNING' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5')">Active</button>
        </div>

        <button @click="emits('openStrategy', 'new')" class="ml-2 bg-gradient-to-r from-[#F0B90B] to-[#eab308] text-black px-5 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(240,185,11,0.2)] hover:shadow-[0_0_30px_rgba(240,185,11,0.4)] transition-all transform hover:-translate-y-0.5">
          <Plus class="w-4 h-4" /> New Runtime
        </button>
      </div>
    </div>

    <!-- Active Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 max-w-7xl auto-rows-fr pb-8">
      <transition-group name="grid-list" tag="div" class="contents">
        <div v-for="strategy in filteredStrategies" :key="strategy.id"
             :class="cn('group relative bg-[#0a0c10]/60 backdrop-blur-3xl border rounded-[32px] p-6 transition-all duration-700 overflow-hidden shadow-2xl flex flex-col h-[380px] justify-between', 
             strategy.status === 'running' ? getHealthClass(strategy.health) : 'border-white/[0.05]')">
          
          <!-- Ambient Pod Glow -->
          <div :class="cn('absolute -top-24 -right-24 w-64 h-64 opacity-0 group-hover:opacity-20 blur-[100px] rounded-full transition-opacity duration-1000', getHealthGlow(strategy.health))"></div>

          <!-- Execution State Overlay -->
          <div v-if="executionStates[strategy.id] !== 'idle'" class="absolute inset-0 z-50 bg-[#0a0c10]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
            <template v-if="executionStates[strategy.id] === 'toggling'">
              <Workflow class="w-12 h-12 text-[#627EEA] animate-spin mb-4" />
              <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#627EEA] animate-pulse">Syncing Neural Core...</span>
            </template>
            <template v-else-if="executionStates[strategy.id] === 'success'">
              <ShieldCheck class="w-12 h-12 text-[#0ecb81] mb-4 drop-shadow-[0_0_15px_rgba(14,203,129,0.5)]" />
              <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#0ecb81]">Integrity Verified</span>
            </template>
          </div>

          <!-- Top Section -->
          <div class="relative z-10">
            <div class="flex items-start justify-between mb-6">
              <div class="flex items-center gap-4">
                <div :class="cn('w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-all duration-500 group-hover:scale-110', 
                     strategy.status === 'running' ? 'bg-white/5 border-white/10' : 'bg-black/40 border-white/5 grayscale')">
                   <Bot :class="cn('w-7 h-7', strategy.status === 'running' ? 'text-white' : 'text-white/20')" />
                </div>
                <div>
                   <h3 class="text-white text-xl font-black tracking-tight leading-tight mb-1">{{ strategy.name }}</h3>
                   <div class="flex items-center gap-2">
                     <span class="px-2 py-0.5 rounded bg-white/5 text-[9px] font-bold text-white/40 uppercase tracking-widest border border-white/5">{{ strategy.type }}</span>
                     <div v-if="strategy.status === 'running'" class="flex items-center gap-1.5 ml-1">
                        <div class="w-1 h-1 rounded-full bg-[#0ecb81] animate-ping"></div>
                        <span class="text-[9px] font-mono text-[#0ecb81] font-bold tracking-tighter">{{ strategy.lastPing }}</span>
                     </div>
                   </div>
                </div>
              </div>
              
              <div :class="cn('px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border flex items-center gap-2', 
                   strategy.health === 'optimal' ? 'text-[#0ecb81] bg-[#0ecb81]/10 border-[#0ecb81]/20' : 
                   strategy.health === 'degraded' ? 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20' : 
                   'text-[#f6465d] bg-[#f6465d]/10 border-[#f6465d]/20')">
                <div v-if="strategy.status === 'running'" :class="cn('w-2 h-2 rounded-full animate-pulse', 
                     strategy.health === 'optimal' ? 'bg-[#0ecb81]' : strategy.health === 'degraded' ? 'bg-[#f59e0b]' : 'bg-[#f6465d]')"></div>
                {{ strategy.health }}
              </div>
            </div>

            <!-- Runtime Metrics -->
            <div class="grid grid-cols-3 gap-3 mb-6">
               <div class="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col items-center">
                  <Wifi class="w-3.5 h-3.5 text-white/20 mb-2" />
                  <span class="text-[8px] text-white/30 uppercase font-bold tracking-tighter">Exchange</span>
                  <span class="text-xs font-mono font-black text-white/90 mt-1">{{ strategy.latency.exchange }}ms</span>
               </div>
               <div class="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col items-center">
                  <BrainCircuit class="w-3.5 h-3.5 text-white/20 mb-2" />
                  <span class="text-[8px] text-white/30 uppercase font-bold tracking-tighter">AI Logic</span>
                  <span class="text-xs font-mono font-black text-white/90 mt-1">{{ strategy.latency.ai }}ms</span>
               </div>
               <div class="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col items-center">
                  <AlertCircle class="w-3.5 h-3.5 text-white/20 mb-2" />
                  <span class="text-[8px] text-white/30 uppercase font-bold tracking-tighter">Errors</span>
                  <span :class="cn('text-xs font-mono font-black mt-1', strategy.errorCount > 0 ? 'text-[#f6465d]' : 'text-white/90')">{{ strategy.errorCount }}</span>
               </div>
            </div>
          </div>

          <!-- Bottom Analytics -->
          <div class="relative z-10 w-full mb-6">
             <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] text-white/40 uppercase font-black tracking-widest">Pod Performance</span>
                <span :class="cn('text-sm font-mono font-black', strategy.roi >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                  {{ strategy.roi >= 0 ? '+' : '' }}{{ strategy.roi }}%
                </span>
             </div>
             <div class="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div class="h-full bg-gradient-to-r from-transparent to-[#0ecb81] opacity-50" :style="{ width: Math.min(100, Math.abs(strategy.roi) * 5) + '%' }"></div>
             </div>
             <div class="flex items-center justify-between mt-3 px-1">
                <span class="text-[9px] text-white/30 uppercase font-bold">Signals: {{ strategy.signalsProcessed }}</span>
                <span class="text-[9px] text-white/30 uppercase font-bold">WR: {{ strategy.winRate }}%</span>
             </div>
          </div>

          <!-- Action Footer -->
          <div class="flex items-center gap-3 mt-auto relative z-10">
            <button @click="toggleStrategy(strategy)" :disabled="executionStates[strategy.id] !== 'idle'"
              :class="cn('flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 border shadow-2xl group/btn', 
              strategy.status === 'running' ? 'bg-[#f6465d]/5 hover:bg-[#f6465d] text-[#f6465d] hover:text-white border-[#f6465d]/20 hover:border-[#f6465d]' : 
              'bg-[#0ecb81]/5 hover:bg-[#0ecb81] text-[#0ecb81] hover:text-black border-[#0ecb81]/20 hover:border-[#0ecb81]')">
              <Power v-if="strategy.status === 'running'" class="w-4 h-4" />
              <Play v-else class="w-4 h-4 ml-1" />
              {{ strategy.status === "running" ? "Halt Pod" : "Ignite Pod" }}
            </button>

            <button @click="emits('openStrategy', strategy.id)" class="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:border-[#627EEA] hover:bg-[#627EEA]/10 transition-all text-white/40 hover:text-[#627EEA] group/cog">
              <Settings2 class="w-5 h-5 group-hover/cog:rotate-90 transition-transform duration-700" />
            </button>
          </div>
        </div>
      </transition-group>

      <!-- Empty State -->
      <button @click="emits('openStrategy', 'new')" class="group rounded-[32px] border-2 border-dashed border-white/5 hover:border-[#F0B90B]/40 hover:bg-[#F0B90B]/5 transition-all duration-700 min-h-[380px] flex flex-col items-center justify-center p-8 relative overflow-hidden backdrop-blur-sm bg-black/10">
        <div class="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_40px_rgba(240,185,11,0.15)] transition-all duration-700 mb-8 relative z-10">
          <Layers class="w-10 h-10 text-white/20 group-hover:text-[#F0B90B] transition-colors" />
        </div>
        <div class="text-center relative z-10">
          <h4 class="text-white text-xl font-black tracking-tight mb-3 group-hover:text-[#F0B90B] transition-colors">Launch Runtime Pod</h4>
          <p class="text-white/30 text-[10px] max-w-[200px] mx-auto leading-relaxed font-bold uppercase tracking-widest">Instantiate a dedicated neural agent on the decentralized matrix.</p>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.grid-list-enter-active, .grid-list-leave-active {
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}
.grid-list-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}
.grid-list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
