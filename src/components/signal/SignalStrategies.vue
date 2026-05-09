<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  Bot,
  Play,
  Pause,
  Zap,
  Activity,
  MoreVertical,
  Plus,
  Settings2,
  Power,
  Layers,
  Network,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Cpu,
} from "lucide-vue-next";
import { cn } from "../../lib/utils";
import { eventBus } from "../../modules/backend-services";
import {
  activeStrategies,
  Strategy,
  StrategyStatus,
} from "../../store/strategyStore";

const isLoading = ref(true);

type ExecutionState = "idle" | "toggling" | "success" | "failed";

const executionStates = ref<Record<string, ExecutionState>>({});
const activeFilter = ref<"ALL" | "RUNNING" | "PAUSED">("ALL");

onMounted(() => {
  setTimeout(() => {
    activeStrategies.value.forEach(
      (s) => (executionStates.value[s.id] = "idle"),
    );
    isLoading.value = false;
  }, 800); // Simulate network load
});

const filteredStrategies = computed(() => {
  if (activeFilter.value === "ALL") return activeStrategies.value;
  if (activeFilter.value === "RUNNING")
    return activeStrategies.value.filter(
      (s) => s.status === "running" || s.status === "waiting",
    );
  return activeStrategies.value.filter(
    (s) => s.status === "paused" || s.status === "error",
  );
});

const getStatusColor = (status: StrategyStatus) => {
  switch (status) {
    case "running":
      return "text-[#0ecb81] bg-[#0ecb81]/10 border-[#0ecb81]/20";
    case "paused":
      return "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20";
    case "waiting":
      return "text-[#627EEA] bg-[#627EEA]/10 border-[#627EEA]/20";
    case "error":
      return "text-[#f6465d] bg-[#f6465d]/10 border-[#f6465d]/20";
    default:
      return "text-white/50 bg-white/5 border-white/10";
  }
};

const getStatusGlow = (status: StrategyStatus) => {
  switch (status) {
    case "running":
      return "bg-[#0ecb81]";
    case "paused":
      return "bg-[#f59e0b]";
    case "waiting":
      return "bg-[#627EEA]";
    case "error":
      return "bg-[#f6465d]";
    default:
      return "bg-white/10";
  }
};

const toggleStrategy = (strategy: Strategy) => {
  if (executionStates.value[strategy.id] !== "idle") return;

  executionStates.value[strategy.id] = "toggling";

  setTimeout(() => {
    // 90% success rate mock
    const success = Math.random() > 0.1;
    if (success) {
      executionStates.value[strategy.id] = "success";
      strategy.status = strategy.status === "running" ? "paused" : "running";
      if (strategy.status === "running") strategy.lastPing = "15ms";
      else strategy.lastPing = "Offline";

      eventBus.publish("strategy_status_change", {
        id: strategy.id,
        status: strategy.status,
      });

      setTimeout(() => {
        executionStates.value[strategy.id] = "idle";
      }, 1000);
    } else {
      executionStates.value[strategy.id] = "failed";
      setTimeout(() => {
        executionStates.value[strategy.id] = "idle";
      }, 2000);
    }
  }, 1000);
};

const emits = defineEmits(["openStrategy"]);

const formatCurrency = (val: number) => {
  return Math.abs(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const totalPnl = computed(() =>
  activeStrategies.value.reduce((sum, s) => sum + s.pnlUsdt, 0),
);
const totalAllocated = computed(() =>
  activeStrategies.value.reduce((sum, s) => sum + s.alloc, 0),
);
const runningCount = computed(
  () => activeStrategies.value.filter((s) => s.status === "running").length,
);
</script>

<template>
  <div
    class="h-full flex flex-col pt-6 px-8 pb-12 overflow-y-auto w-full no-scrollbar relative font-sans text-white"
  >
    <!-- Ambient glowing background -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div
        class="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#F0B90B]/5 rounded-full blur-[140px] mix-blend-screen"
      ></div>
      <div
        class="absolute bottom-1/4 left-10 w-[300px] h-[300px] bg-[#627EEA]/5 rounded-full blur-[140px] mix-blend-screen"
      ></div>
    </div>

    <!-- Header Section -->
    <div
      class="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 relative z-10 gap-6"
    >
      <div>
        <h2
          class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-wide flex items-center gap-3 mb-2"
        >
          <Cpu class="w-8 h-8 text-[#F0B90B]" /> Strategy Engines
        </h2>
        <div
          class="flex items-center gap-4 text-white/40 text-[11px] uppercase tracking-widest font-bold"
        >
          <span>System Managed Allocations</span>
          <span class="w-1 h-1 rounded-full bg-white/20"></span>
          <span class="text-white/60"
            >${{ totalAllocated.toLocaleString() }} Deployed</span
          >
        </div>
      </div>

      <div
        class="flex flex-wrap items-center gap-3 bg-[#0a0c10]/80 p-2 border border-white/5 rounded-2xl backdrop-blur-xl shadow-lg"
      >
        <!-- Metrics -->
        <div class="hidden sm:flex flex-col px-4 border-r border-white/10">
          <span
            class="text-[9px] text-white/40 uppercase tracking-widest font-bold"
            >Total PNL</span
          >
          <span
            :class="
              cn(
                'text-sm font-mono font-bold',
                totalPnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]',
              )
            "
          >
            {{ totalPnl >= 0 ? "+" : "-" }}${{ formatCurrency(totalPnl) }}
          </span>
        </div>
        <div class="hidden sm:flex flex-col px-4 border-r border-white/10">
          <span
            class="text-[9px] text-white/40 uppercase tracking-widest font-bold"
            >Active Engines</span
          >
          <div class="flex items-center gap-1.5 mt-0.5">
            <div
              class="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse"
            ></div>
            <span class="text-sm font-mono text-white/90 font-bold"
              >{{ runningCount }} / {{ activeStrategies.length }}</span
            >
          </div>
        </div>

        <div class="flex items-center gap-1.5 px-2">
          <button
            @click="activeFilter = 'ALL'"
            :class="
              cn(
                'px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all',
                activeFilter === 'ALL'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/40 hover:text-white hover:bg-white/5',
              )
            "
          >
            All
          </button>
          <button
            @click="activeFilter = 'RUNNING'"
            :class="
              cn(
                'px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all',
                activeFilter === 'RUNNING'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/40 hover:text-white hover:bg-white/5',
              )
            "
          >
            Online
          </button>
          <button
            @click="activeFilter = 'PAUSED'"
            :class="
              cn(
                'px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all',
                activeFilter === 'PAUSED'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/40 hover:text-white hover:bg-white/5',
              )
            "
          >
            Paused
          </button>
        </div>

        <!-- CTA -->
        <button
          @click="emits('openStrategy', 'new')"
          class="ml-2 bg-gradient-to-r from-[#F0B90B] to-[#eab308] text-black px-5 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:shadow-[0_0_20px_rgba(240,185,11,0.4)] transition-all transform hover:-translate-y-0.5"
        >
          <Plus class="w-4 h-4" /> New Agent
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 max-w-7xl"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="bg-[#0a0c10]/80 backdrop-blur-xl border border-white/[0.05] rounded-[24px] p-6 h-[280px] animate-pulse shadow-lg flex flex-col justify-between"
      >
        <div class="flex gap-4 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-white/5 shrink-0"></div>
          <div class="space-y-3 flex-1 mt-1">
            <div class="h-4 bg-white/10 rounded-md w-3/4"></div>
            <div class="h-3 bg-white/5 rounded-md w-1/3"></div>
          </div>
        </div>
        <div class="space-y-4">
          <div class="h-10 bg-white/5 rounded-xl"></div>
          <div class="h-10 bg-white/5 rounded-xl"></div>
        </div>
        <div class="mt-6 flex gap-3">
          <div class="h-10 bg-white/5 rounded-xl flex-1"></div>
          <div class="h-10 bg-white/5 rounded-xl w-12"></div>
        </div>
      </div>
    </div>

    <!-- Active Grid -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 max-w-7xl auto-rows-fr pb-8"
    >
      <transition-group name="grid-list" tag="div" class="contents">
        <div
          v-for="strategy in filteredStrategies"
          :key="strategy.id"
          :class="
            cn(
              'group relative bg-[#0a0c10]/80 backdrop-blur-2xl border hover:border-white/[0.15] rounded-[24px] p-6 transition-all duration-500 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col h-[320px] justify-between',
              strategy.status === 'running'
                ? 'border-white/[0.08]'
                : 'border-white/[0.03]',
            )
          "
        >
          <!-- Ambient Status Glow -->
          <div
            :class="
              cn(
                'absolute -top-24 -right-24 w-48 h-48 opacity-0 group-hover:opacity-10 blur-[80px] rounded-full transition-opacity duration-1000',
                getStatusGlow(strategy.status),
              )
            "
          ></div>

          <!-- Execution State Overlay -->
          <div
            v-if="executionStates[strategy.id] !== 'idle'"
            class="absolute inset-0 z-50 bg-[#0a0c10]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <template v-if="executionStates[strategy.id] === 'toggling'">
              <Network class="w-8 h-8 text-[#627EEA] animate-spin mb-4" />
              <span
                class="text-xs font-bold uppercase tracking-widest text-white/80 animate-pulse"
                >Reconfiguring Agent...</span
              >
            </template>
            <template v-else-if="executionStates[strategy.id] === 'success'">
              <CheckCircle2
                class="w-10 h-10 text-[#0ecb81] mb-4 drop-shadow-[0_0_15px_rgba(14,203,129,0.5)]"
              />
              <span
                class="text-xs font-bold uppercase tracking-widest text-[#0ecb81]"
                >Configuration Synced</span
              >
            </template>
            <template v-else-if="executionStates[strategy.id] === 'failed'">
              <AlertCircle
                class="w-10 h-10 text-[#f6465d] mb-4 drop-shadow-[0_0_15px_rgba(246,70,93,0.5)]"
              />
              <span
                class="text-xs font-bold uppercase tracking-widest text-[#f6465d]"
                >Sync Timeout</span
              >
            </template>
          </div>

          <!-- Top Section -->
          <div class="relative z-10 mb-2">
            <div class="flex items-start justify-between mb-5">
              <div class="flex items-center gap-4">
                <div
                  :class="
                    cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform duration-500 border',
                      strategy.id === '1'
                        ? 'bg-[#F0B90B]/10 border-[#F0B90B]/20'
                        : strategy.id === '2'
                          ? 'bg-[#627EEA]/10 border-[#627EEA]/20'
                          : strategy.id === '3'
                            ? 'bg-[#a855f7]/10 border-[#a855f7]/20'
                            : 'bg-white/5 border-white/10',
                    )
                  "
                >
                  <Bot
                    :class="
                      cn(
                        'w-6 h-6',
                        strategy.id === '1'
                          ? 'text-[#F0B90B]'
                          : strategy.id === '2'
                            ? 'text-[#627EEA]'
                            : strategy.id === '3'
                              ? 'text-[#a855f7]'
                              : 'text-white/60',
                      )
                    "
                  />
                </div>
                <div>
                  <h3 class="text-white text-lg font-black tracking-wide">
                    {{ strategy.name }}
                  </h3>
                  <div class="flex items-center gap-2 mt-1">
                    <span
                      class="text-white/40 text-[9px] uppercase tracking-widest font-mono"
                      >{{ strategy.type }}</span
                    >
                    <span class="w-1 h-1 rounded-full bg-white/20"></span>
                    <span
                      class="text-white/30 text-[9px] font-mono tracking-widest flex items-center gap-1"
                    >
                      <Activity class="w-3 h-3" /> {{ strategy.lastPing }}
                    </span>
                  </div>
                </div>
              </div>
              <div
                :class="
                  cn(
                    'px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase border flex items-center gap-1.5',
                    getStatusColor(strategy.status),
                  )
                "
              >
                <div
                  v-if="strategy.status === 'running'"
                  class="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse"
                ></div>
                {{ strategy.status }}
              </div>
            </div>

            <!-- Focus Pairs -->
            <div class="flex items-center gap-1.5 mb-6">
              <span
                v-for="pair in strategy.pairs"
                :key="pair"
                class="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[9px] font-mono text-white/50 tracking-wider"
              >
                {{ pair }}
              </span>
              <span
                v-if="strategy.pairs.length < 3"
                class="bg-white/5 border border-white/10 border-dashed rounded px-2 py-0.5 text-[9px] font-mono text-white/30 tracking-wider"
              >
                + ADD
              </span>
            </div>
          </div>

          <!-- Metrics Container -->
          <div
            class="bg-black/30 rounded-[16px] border border-white/[0.03] p-4 flex flex-col gap-4 mb-5 shadow-inner relative z-10 w-full"
          >
            <div class="flex justify-between items-end">
              <div class="flex flex-col">
                <span
                  class="text-[9px] text-white/40 uppercase tracking-widest mb-1.5 font-bold flex items-center gap-1"
                  ><TrendingUp class="w-3 h-3 text-white/30" /> Total ROI</span
                >
                <div class="flex items-center gap-2">
                  <span
                    :class="
                      cn(
                        'text-lg font-mono font-black drop-shadow-md leading-none',
                        strategy.roi >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]',
                      )
                    "
                  >
                    {{ strategy.roi >= 0 ? "+" : "" }}{{ strategy.roi }}%
                  </span>
                  <span
                    class="text-[10px] text-white/40 font-mono tracking-wider"
                    >(${{ formatCurrency(strategy.pnlUsdt) }})</span
                  >
                </div>
              </div>
              <div class="flex flex-col items-end">
                <span
                  class="text-[9px] text-white/40 uppercase tracking-widest mb-1.5 font-bold"
                  >Allocated</span
                >
                <span
                  class="text-sm font-mono font-bold text-white/90 leading-none"
                  >${{ strategy.alloc.toLocaleString() }}</span
                >
              </div>
            </div>

            <div class="h-px w-full bg-white/5"></div>

            <div class="flex justify-between items-center">
              <div class="flex flex-col">
                <span
                  class="text-[9px] text-white/40 uppercase tracking-widest mb-1 font-bold"
                  >Execution Rate</span
                >
                <span class="text-xs font-mono font-medium text-white/70"
                  >{{ strategy.trades }} Trades</span
                >
              </div>
              <div class="flex flex-col items-end w-1/2">
                <div class="flex items-center justify-between w-full mb-1">
                  <span
                    class="text-[9px] text-white/40 uppercase tracking-widest font-bold"
                    >Win Rate</span
                  >
                  <span class="text-xs font-mono font-bold text-white/90"
                    >{{ strategy.winRate }}%</span
                  >
                </div>
                <div
                  class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-gradient-to-r from-transparent to-[#F0B90B] rounded-full"
                    :style="{ width: strategy.winRate + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Footer -->
          <div class="flex items-center gap-3 mt-auto relative z-10">
            <button
              @click="toggleStrategy(strategy)"
              :disabled="executionStates[strategy.id] !== 'idle'"
              :class="
                cn(
                  'flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 border shadow-lg group/btn hover:-translate-y-0.5',
                  strategy.status === 'running'
                    ? 'bg-[#f6465d]/5 hover:bg-[#f6465d] text-[#f6465d] hover:text-white border-[#f6465d]/20 hover:border-[#f6465d] hover:shadow-[0_0_20px_rgba(246,70,93,0.3)]'
                    : 'bg-[#0ecb81]/5 hover:bg-[#0ecb81] text-[#0ecb81] hover:text-black border-[#0ecb81]/20 hover:border-[#0ecb81] hover:shadow-[0_0_20px_rgba(14,203,129,0.3)]',
                )
              "
            >
              <Power
                v-if="strategy.status === 'running'"
                class="w-4 h-4 group-hover/btn:scale-110 transition-transform"
              />
              <Play
                v-else
                class="w-4 h-4 ml-1 group-hover/btn:scale-110 transition-transform"
              />
              {{
                strategy.status === "running" ? "Halt Agent" : "Deploy Engine"
              }}
            </button>

            <button
              @click="emits('openStrategy', strategy.id)"
              class="w-12 h-12 flex items-center justify-center rounded-xl bg-[#0a0c10] border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all text-white/60 hover:text-white tooltip group/cog"
              data-tip="Configure"
            >
              <Settings2
                class="w-4 h-4 group-hover/cog:rotate-90 transition-transform duration-500"
              />
            </button>
          </div>
        </div>
      </transition-group>

      <!-- Empty State / Add New -->
      <button
        @click="emits('openStrategy', 'new')"
        class="group rounded-[24px] border border-dashed border-white/10 hover:border-[#F0B90B]/50 hover:bg-[#F0B90B] hover:bg-opacity-[0.02] transition-all duration-500 min-h-[320px] flex flex-col items-center justify-center p-8 relative overflow-hidden backdrop-blur-sm bg-black/20"
      >
        <div
          class="absolute inset-0 bg-gradient-to-b from-[#F0B90B]/0 to-[#F0B90B]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
        ></div>
        <div
          class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(240,185,11,0.2)] transition-all duration-500 mb-6 relative z-10"
        >
          <Layers
            class="w-7 h-7 text-white/40 group-hover:text-[#F0B90B] transition-colors"
          />
        </div>
        <div class="text-center relative z-10">
          <h4
            class="text-white text-lg font-black tracking-wide mb-2 group-hover:text-[#F0B90B] transition-colors"
          >
            Initialize New Engine
          </h4>
          <p
            class="text-white/40 text-xs mt-2 w-56 mx-auto leading-relaxed font-mono uppercase tracking-widest"
          >
            Connect custom AI models to your execution stack.
          </p>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.grid-list-enter-active,
.grid-list-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.grid-list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}
.grid-list-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
