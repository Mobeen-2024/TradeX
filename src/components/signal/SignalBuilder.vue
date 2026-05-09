<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import {
  Bot,
  X,
  Play,
  Save,
  Settings2,
  ShieldAlert,
  Zap,
  Activity,
  Clock,
  SlidersHorizontal,
  ChevronRight,
  Network,
  BrainCircuit,
  Crosshair,
  BarChart2,
  Hexagon,
  Radar
} from "lucide-vue-next";
import { cn } from "../../lib/utils";
import NodePalette from "../NodePalette.vue";
import WorkflowEditor from "../WorkflowEditor.vue";
import BacktestPanel from "../BacktestPanel.vue";
import TimeTravelDebugger from "../TimeTravelDebugger.vue";
import {
  addStrategy,
  updateStrategy,
  activeStrategies,
  toggleStrategyState
} from "../../store/strategyStore";

const props = defineProps<{
  strategyId: string | null;
}>();

const emits = defineEmits(["close"]);

const workflowRef = ref<any>(null);

// UI States
const activeBottomTab = ref<"backtest" | "debugger">("backtest");
const isDeployDrawerOpen = ref(false);
const executionMode = ref<"simulation" | "live">("simulation");
const isSaving = ref(false);
const currentName = ref("Custom Neural Agent");

type LayerId = 'visual' | 'market' | 'ai' | 'execution' | 'risk';
const activeLayer = ref<LayerId>('visual');

const layers = [
  { id: 'visual', name: 'Visual Intel', desc: 'Workflow Sandbox', icon: Network, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'market', name: 'Market Intel', desc: 'Data & Regime', icon: Radar, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'ai', name: 'AI Intel', desc: 'Gemini Engine', icon: BrainCircuit, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  { id: 'execution', name: 'Exec Intel', desc: 'Routing & TWAP', icon: Crosshair, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { id: 'risk', name: 'Risk Intel', desc: 'Capital Guard', icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
];

let loadTimeout: any;

onMounted(async () => {
  if (props.strategyId && props.strategyId !== "new") {
    const existing = activeStrategies.value.find(
      (s) => s.id === props.strategyId,
    );
    if (existing) {
      currentName.value = existing.name;
      if (existing.nodes && existing.edges) {
        // High-priority fix: Use nextTick + safe timeout to ensure VueFlow is initialized
        await nextTick();
        loadTimeout = setTimeout(() => {
          workflowRef.value?.loadStrategy(existing.nodes, existing.edges);
        }, 50);
      }
    }
  }
});

onUnmounted(() => {
  if (loadTimeout) clearTimeout(loadTimeout);
});

const saveStrategy = async (): Promise<string | null> => {
  if (isSaving.value) return null;
  isSaving.value = true;

  return new Promise((resolve) => {
    setTimeout(() => {
      const nodes = workflowRef.value?.nodes || [];
      const edges = workflowRef.value?.edges || [];
      let finalId = props.strategyId;

      if (props.strategyId === "new") {
        // Low-priority fix: Use secure random UUID
        finalId = "agent_" + crypto.randomUUID().split('-')[0];
        addStrategy({
          id: finalId,
          name: currentName.value,
          type: "Custom AI",
          status: "paused",
          roi: 0,
          trades: 0,
          winRate: 0,
          pnlUsdt: 0,
          alloc: 10000,
          pairs: ["BTC/USDT"],
          lastPing: "Offline",
          nodes,
          edges,
        });
      } else if (props.strategyId) {
        updateStrategy(props.strategyId, {
          name: currentName.value,
          nodes,
          edges,
        });
      }

      isSaving.value = false;
      resolve(finalId);
    }, 800);
  });
};

const handleDeploy = async () => {
  const strategyId = await saveStrategy();
  if (!strategyId) return;

  try {
    await toggleStrategyState(strategyId);
    emits("close");
  } catch (err) {
    console.error("Failed to deploy strategy:", err);
  }
};

const loadTemplate = (id: string) => {
  if (id === "scalper") {
    workflowRef.value?.loadStrategy(
      [
        {
          id: "1",
          type: "priceFeed",
          position: { x: 50, y: 50 },
          data: { pair: "BTC/USDT", source: "Binance" },
        },
        {
          id: "2",
          type: "rsiIndicator",
          position: { x: 50, y: 150 },
          data: { period: 14 },
        },
        {
          id: "3",
          type: "ifElseLogic",
          position: { x: 50, y: 250 },
          data: { condition: "var_1.rsi < 30" },
        },
        {
          id: "4",
          type: "marketOrder",
          position: { x: 50, y: 350 },
          data: { action: "BUY", type: "MARKET", size: "10%" },
        },
        {
          id: "5",
          type: "riskManager",
          position: { x: 300, y: 250 },
          data: { maxDrawdown: "5%", killSwitch: true },
        },
      ],
      [
        {
          id: "e1-2",
          source: "1",
          target: "2",
          animated: true,
          style: {
            stroke: "url(#flowGradient)",
            strokeWidth: 2,
            filter: "url(#neonGlow)",
          },
          class: "flowing-gradient-stroke",
        },
        {
          id: "e2-3",
          source: "2",
          target: "3",
          animated: true,
          style: {
            stroke: "url(#flowGradient)",
            strokeWidth: 2,
            filter: "url(#neonGlow)",
          },
          class: "flowing-gradient-stroke",
        },
        {
          id: "e3-4",
          source: "3",
          target: "4",
          animated: true,
          style: {
            stroke: "url(#flowGradient)",
            strokeWidth: 2,
            filter: "url(#neonGlow)",
          },
          class: "flowing-gradient-stroke",
        },
        {
          id: "e3-5",
          source: "3",
          target: "5",
          animated: true,
          style: {
            stroke: "url(#flowGradient)",
            strokeWidth: 2,
            filter: "url(#neonGlow)",
          },
          class: "flowing-gradient-stroke",
        },
      ],
    );
  }
};
</script>

<template>
  <div
    class="h-full flex flex-col bg-transparent overflow-y-auto no-scrollbar text-white font-sans relative"
  >
    <!-- Background Orbs -->
    <div
      class="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-3xl"
    >
      <div
        class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#F0B90B]/5 rounded-full blur-[140px] mix-blend-screen"
      ></div>
      <div
        class="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#0ecb81]/5 rounded-full blur-[140px] mix-blend-screen"
      ></div>
    </div>

    <!-- Header -->
    <header
      class="relative z-10 flex justify-between items-center px-6 py-4 border-b border-white/5 bg-white/[0.01] backdrop-blur-xl shrink-0"
    >
      <div class="flex items-center gap-4">
        <button
          @click="emits('close')"
          class="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-all"
        >
          <X class="w-4 h-4" />
        </button>

        <div class="flex items-center gap-3 border-l border-white/10 pl-4">
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F0B90B]/30 to-[#f59e0b]/10 p-[1px] flex items-center justify-center shadow-[0_0_20px_rgba(240,185,11,0.2)]"
          >
            <div
              class="w-full h-full bg-[#0a0c10] border border-[#F0B90B]/20 rounded-xl flex items-center justify-center"
            >
              <Bot class="w-4 h-4 text-[#F0B90B]" />
            </div>
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <input
                v-model="currentName"
                class="font-black text-white/90 tracking-widest text-sm uppercase bg-transparent outline-none border-b border-transparent hover:border-white/20 focus:border-[#F0B90B] transition-colors pb-0.5"
                placeholder="Strategy Name"
              />
              <span
                v-if="strategyId === 'new'"
                class="px-2 py-0.5 rounded text-[9px] bg-white/10 text-white/60 font-medium"
                >Unsaved</span
              >
            </div>
            <p
              class="text-white/40 text-[10px] font-mono mt-0.5 uppercase tracking-wider"
            >
              Workspace ID:
              <span class="text-white/60">{{
                strategyId === "new" ? "AURA-DRAFT" : strategyId
              }}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="saveStrategy"
          :disabled="isSaving"
          class="relative group px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all overflow-hidden flex items-center gap-2"
        >
          <span
            v-if="isSaving"
            class="animate-spin w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full"
          ></span>
          <Save
            v-else
            class="w-4 h-4 text-white/50 group-hover:text-white transition-colors"
          />
          <span
            class="text-xs font-bold uppercase tracking-wide text-white/60 group-hover:text-white"
            >{{ isSaving ? "Saving..." : "Save State" }}</span
          >
        </button>
        <button
          @click="isDeployDrawerOpen = true"
          class="relative group px-5 py-2 rounded-xl bg-gradient-to-r from-[#F0B90B] to-[#eab308] text-black transition-all hover:shadow-[0_0_25px_rgba(240,185,11,0.4)] flex items-center gap-2 overflow-hidden hover:-translate-y-0.5"
        >
          <div
            class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
          ></div>
          <Play class="w-4 h-4 relative z-10" />
          <span
            class="text-xs font-black uppercase tracking-wide relative z-10 text-black/90"
            >Execute Strategy</span
          >
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <main
      class="flex-1 flex overflow-y-auto no-scrollbar p-4 pb-20 gap-4 relative z-10 transition-all duration-500"
      :class="isDeployDrawerOpen ? 'pr-80' : ''"
    >
      <!-- Intelligence Layer Nav -->
      <nav class="w-16 shrink-0 flex flex-col gap-3 glass-panel rounded-2xl border border-white/[0.05] p-2 py-4 bg-white/[0.01] backdrop-blur-3xl items-center">
         <button v-for="layer in layers" :key="layer.id"
           @click="activeLayer = layer.id"
           class="relative group w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300"
           :class="activeLayer === layer.id ? layer.bg + ' ' + layer.border + ' border shadow-lg' : 'hover:bg-white/5 border border-transparent'"
         >
           <component :is="layer.icon" :class="cn('w-5 h-5 transition-transform duration-300', activeLayer === layer.id ? layer.color + ' scale-110' : 'text-white/40 group-hover:text-white/80 group-hover:scale-105')" />
           
           <!-- Tooltip -->
           <div class="absolute left-full ml-4 px-3 py-2 bg-[#0a0c10] border border-white/10 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity flex flex-col shadow-2xl">
             <span class="text-xs font-bold text-white uppercase tracking-wider">{{ layer.name }}</span>
             <span class="text-[9px] text-white/40 font-medium">{{ layer.desc }}</span>
           </div>
         </button>
      </nav>

      <!-- Active Layer Sidebar -->
      <aside
        class="w-72 shrink-0 flex flex-col glass-panel rounded-2xl border border-white/[0.05] shadow-xl overflow-hidden bg-[#0a0c10]/40 backdrop-blur-3xl relative"
        style="height: 1000px;"
      >
        <!-- Dynamic Header based on Layer -->
        <div class="p-4 border-b border-white/5 shrink-0 flex items-center gap-3 relative overflow-hidden">
          <div :class="cn('absolute inset-0 opacity-20 blur-xl', layers.find(l => l.id === activeLayer)?.bg)"></div>
          <div :class="cn('w-8 h-8 rounded-lg flex items-center justify-center border shadow-inner relative z-10', layers.find(l => l.id === activeLayer)?.bg, layers.find(l => l.id === activeLayer)?.border)">
            <component :is="layers.find(l => l.id === activeLayer)?.icon" :class="cn('w-4 h-4', layers.find(l => l.id === activeLayer)?.color)" />
          </div>
          <div class="relative z-10">
            <h3 class="text-xs font-black uppercase tracking-widest text-white/90">
              {{ layers.find(l => l.id === activeLayer)?.name }}
            </h3>
            <p class="text-[9px] text-white/50 tracking-wider">
              {{ layers.find(l => l.id === activeLayer)?.desc }}
            </p>
          </div>
        </div>

        <div class="flex-1 w-full overflow-y-auto no-scrollbar relative z-10">
          
          <!-- Layer 1: Visual Intelligence -->
          <div v-show="activeLayer === 'visual'" class="p-2" style="height: 2355.94px;">
             <div class="px-2 py-2 mb-2 text-[10px] text-white/40 leading-relaxed font-medium bg-black/20 rounded-lg border border-white/5 mx-2 mt-2">
               Drag entities onto the canvas to construct the neural logic pathway. Connect nodes to form execution flow.
             </div>
             <NodePalette class="w-full flex" @loadTemplate="loadTemplate" />
          </div>
          
          <!-- Layer 2: Market Intelligence -->
          <div v-show="activeLayer === 'market'" class="p-4 flex flex-col gap-6">
             <div class="space-y-3">
                <label class="text-[10px] text-white/40 uppercase tracking-widest font-bold">Trend Regime Detection</label>
                <div class="flex gap-2">
                  <button class="flex-1 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">Bullish</button>
                  <button class="flex-1 py-2 rounded-lg bg-white/5 border border-white/5 text-white/40 text-xs font-bold hover:bg-white/10">Neutral</button>
                  <button class="flex-1 py-2 rounded-lg bg-white/5 border border-white/5 text-white/40 text-xs font-bold hover:bg-white/10">Bearish</button>
                </div>
             </div>
             
             <div class="space-y-3">
                <label class="text-[10px] text-white/40 uppercase tracking-widest font-bold">Data Sources</label>
                <div class="space-y-2">
                  <div class="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                    <span class="text-xs text-white/80 font-medium">Binance Order Flow</span>
                    <div class="w-8 h-4 bg-[#0ecb81]/20 rounded-full cursor-pointer relative"><div class="absolute right-0.5 top-0.5 bottom-0.5 w-3 bg-[#0ecb81] rounded-full shadow-[0_0_10px_#0ecb81]"></div></div>
                  </div>
                  <div class="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                    <span class="text-xs text-white/80 font-medium">Twitter Sentiment</span>
                    <div class="w-8 h-4 bg-white/5 rounded-full cursor-pointer relative"><div class="absolute left-0.5 top-0.5 bottom-0.5 w-3 bg-white/20 rounded-full"></div></div>
                  </div>
                </div>
             </div>
          </div>
          
          <!-- Layer 3: AI Intelligence -->
          <div v-show="activeLayer === 'ai'" class="p-4 flex flex-col gap-6">
             <div class="bg-black/30 p-4 rounded-xl border border-blue-500/20 relative overflow-hidden">
                <div class="absolute inset-0 bg-blue-500/5 mix-blend-screen pointer-events-none"></div>
                <h4 class="text-xs font-bold text-blue-400 flex items-center gap-2 mb-2 uppercase tracking-wide"><Bot class="w-3.5 h-3.5" /> Prompt Directive</h4>
                <textarea class="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-3 text-[11px] text-white/80 font-mono resize-none focus:outline-none focus:border-blue-500/50" placeholder="e.g., 'If BTC breaks $70k with high volume, increase leverage slightly.'"></textarea>
             </div>
             <div class="space-y-3">
                <label class="text-[10px] text-white/40 uppercase tracking-widest font-bold">AI Capabilities</label>
                <div class="space-y-2">
                   <label class="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors p-2.5 rounded-lg cursor-pointer border border-white/5">
                      <input type="checkbox" checked class="accent-blue-500 rounded bg-black/50" />
                      <span class="text-xs text-white/80">Anomaly Detection</span>
                   </label>
                   <label class="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors p-2.5 rounded-lg cursor-pointer border border-white/5">
                      <input type="checkbox" checked class="accent-blue-500 rounded bg-black/50" />
                      <span class="text-xs text-white/80">Trade Validation</span>
                   </label>
                </div>
             </div>
          </div>
          
          <!-- Layer 4: Execution Intelligence -->
          <div v-show="activeLayer === 'execution'" class="p-4 flex flex-col gap-6">
             <div class="space-y-3">
                <label class="text-[10px] text-white/40 uppercase tracking-widest font-bold">Execution Algorithm</label>
                <select class="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white/90 outline-none focus:border-orange-500/50 cursor-pointer">
                  <option value="market">Market Instant</option>
                  <option value="twap" selected>TWAP (Time-Weighted)</option>
                  <option value="vwap">VWAP (Volume-Weighted)</option>
                  <option value="iceberg">Iceberg Segregation</option>
                </select>
             </div>
             <div class="space-y-3">
                <label class="text-[10px] text-white/40 uppercase tracking-widest font-bold">Slippage Tolerance</label>
                <div class="flex items-center gap-3">
                  <input type="range" min="0.1" max="1.0" step="0.1" value="0.2" class="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer border border-white/5 accent-orange-500" />
                  <span class="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">0.2%</span>
                </div>
             </div>
          </div>
          
          <!-- Layer 5: Risk Intelligence -->
          <div v-show="activeLayer === 'risk'" class="p-4 flex flex-col gap-6">
             <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl relative">
                <div class="absolute right-4 top-4 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse"></div>
                <h4 class="text-xs font-bold text-red-400 uppercase tracking-wide mb-1">Global Kill Switch</h4>
                <p class="text-[10px] text-white/50 mb-3 leading-relaxed">Halts all trading instantly if equity drops below threshold.</p>
                <div class="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-red-500/20">
                  <span class="text-xs text-white/80 pl-2">Max Drawdown</span>
                  <input type="text" value="5.0%" class="w-16 bg-transparent text-right text-red-400 font-mono text-xs font-bold outline-none" />
                </div>
             </div>
             <div class="space-y-3">
                <label class="text-[10px] text-white/40 uppercase tracking-widest font-bold">Volatility Adjusted Sizing</label>
                <div class="flex items-center justify-between text-xs text-white/80 p-3 bg-white/5 border border-white/5 rounded-xl">
                  <span>Enabled</span>
                  <div class="w-8 h-4 bg-red-500/20 rounded-full cursor-pointer relative"><div class="absolute right-0.5 top-0.5 bottom-0.5 w-3 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]"></div></div>
                </div>
             </div>
          </div>

        </div>
      </aside>

      <!-- Center Area: Editor & Bottom tools -->
      <section
        class="flex flex-col gap-4 min-w-0 h-full relative shrink-0 w-full lg:flex-1"
        style="height: 800px;"
      >
        <!-- Canvas container -->
        <div
          class="flex-1 rounded-[2rem] overflow-hidden shadow-[inset_0_0_60px_rgba(255,255,255,0.02),0_30px_60px_rgba(0,0,0,0.8)] relative border border-white/10 min-h-0 bg-gradient-to-br from-[#0a0c10]/80 to-[#12141a]/80 backdrop-blur-3xl group"
        >
          <!-- Cyberpunk grid bg -->
          <div
            class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDIwaDQwTTAgNDBoNDBNMjAgMHY0ME00MCAwdjQwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity duration-1000"
          ></div>

          <WorkflowEditor ref="workflowRef" :strategy-id="strategyId" class="relative z-10" />
        </div>

        <!-- Bottom Dock -->
        <div class="shrink-0 flex flex-col gap-3">
          <!-- Tabs for dock -->
          <div class="flex items-center gap-2 px-2">
            <button
              @click="activeBottomTab = 'backtest'"
              class="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
              :class="
                activeBottomTab === 'backtest'
                  ? 'bg-white/10 text-white shadow-sm border border-white/5'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              "
            >
              <Activity class="w-3.5 h-3.5" /> Backtest Replay
            </button>
            <button
              @click="activeBottomTab = 'debugger'"
              class="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
              :class="
                activeBottomTab === 'debugger'
                  ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20'
                  : 'text-white/40 hover:text-[#3b82f6]/80 hover:bg-[#3b82f6]/5'
              "
            >
              <Clock class="w-3.5 h-3.5" /> Time Travel Debugger
            </button>
          </div>

          <!-- Tab Content -->
          <div class="h-[220px] relative">
            <transition
              mode="out-in"
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="opacity-0 translate-y-2 scale-[0.99]"
              enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition duration-200 ease-in"
              leave-from-class="opacity-100 translate-y-0 scale-100"
              leave-to-class="opacity-0 translate-y-2 scale-[0.99]"
            >
              <BacktestPanel
                v-if="activeBottomTab === 'backtest'"
                class="!mb-0 h-full"
              />
              <TimeTravelDebugger
                v-else-if="activeBottomTab === 'debugger'"
                class="h-full"
              />
            </transition>
          </div>
        </div>
      </section>
    </main>

    <!-- Execution Settings Drawer -->
    <div
      :class="
        cn(
          'absolute right-0 top-0 bottom-0 w-96 bg-[#0a0c10]/95 backdrop-blur-3xl border-l border-white/10 shadow-[-30px_0_100px_rgba(0,0,0,0.8)] z-50 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col',
          isDeployDrawerOpen ? 'translate-x-0' : 'translate-x-full',
        )
      "
    >
      <!-- Drawer Header -->
      <div
        class="flex items-center justify-between px-5 py-5 border-b border-white/5"
      >
        <div class="flex items-center gap-2 text-white">
          <SlidersHorizontal class="w-4 h-4 text-[#F0B90B]" />
          <h3 class="text-sm font-bold tracking-wide uppercase">
            Deployment Config
          </h3>
        </div>
        <button
          @click="isDeployDrawerOpen = false"
          class="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 border border-transparent hover:border-white/10 transition-all"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <!-- Drawer Body -->
      <div class="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar">
        <!-- Mode Selection -->
        <div class="space-y-3">
          <label
            class="text-[10px] text-white/50 uppercase tracking-widest font-bold"
            >Execution Mode</label
          >
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="executionMode = 'simulation'"
              :class="
                cn(
                  'px-3 py-3 flex flex-col items-center gap-1.5 rounded-xl border transition-all',
                  executionMode === 'simulation'
                    ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]'
                    : 'bg-white/5 border-white/5 hover:bg-white/10',
                )
              "
            >
              <Activity
                :class="
                  cn(
                    'w-5 h-5',
                    executionMode === 'simulation'
                      ? 'text-[#3b82f6]'
                      : 'text-white/40',
                  )
                "
              />
              <span
                :class="
                  cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    executionMode === 'simulation'
                      ? 'text-[#3b82f6]'
                      : 'text-white/60',
                  )
                "
                >Paper Trade</span
              >
            </button>
            <button
              @click="executionMode = 'live'"
              :class="
                cn(
                  'px-3 py-3 flex flex-col items-center gap-1.5 rounded-xl border transition-all',
                  executionMode === 'live'
                    ? 'bg-[#f6465d]/10 border-[#f6465d]/30 shadow-[inset_0_0_20px_rgba(246,70,93,0.1)]'
                    : 'bg-white/5 border-white/5 hover:bg-white/10',
                )
              "
            >
              <Zap
                :class="
                  cn(
                    'w-5 h-5',
                    executionMode === 'live'
                      ? 'text-[#f6465d]'
                      : 'text-white/40',
                  )
                "
              />
              <span
                :class="
                  cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    executionMode === 'live'
                      ? 'text-[#f6465d]'
                      : 'text-white/60',
                  )
                "
                >Live Market</span
              >
            </button>
          </div>
          <p
            v-if="executionMode === 'simulation'"
            class="text-[10px] text-blue-400 mt-2 font-medium bg-blue-500/10 p-2 rounded border border-blue-500/20"
          >
            Using historical data and simulated liquidity. Zero financial risk.
          </p>
          <p
            v-if="executionMode === 'live'"
            class="text-[10px] text-red-400 mt-2 font-bold bg-red-500/10 p-2 rounded border border-red-500/20 flex items-center gap-1"
          >
            <Shield class="w-3 h-3" /> WARNING: Real funds will be utilized.
          </p>
        </div>

        <!-- Logic: Allocation / Position Limit -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label
              class="text-[10px] text-white/50 uppercase tracking-widest font-bold"
              >Max Capital Allocation</label
            >
            <span class="text-xs font-mono font-bold text-[#F0B90B]">25%</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value="25"
            class="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#F0B90B]"
          />
          <div class="flex justify-between text-[9px] text-white/30 font-mono">
            <span>0%</span>
            <span>Max Allowed</span>
          </div>
        </div>

        <div class="space-y-4">
          <label
            class="text-[10px] text-white/50 uppercase tracking-widest font-bold"
            >Leverage Cap</label
          >
          <div
            class="bg-black/30 rounded-xl border border-white/[0.05] p-1 flex items-center justify-between"
          >
            <input
              type="text"
              value="3"
              class="bg-transparent text-white text-sm font-mono font-bold w-12 text-center outline-none"
            />
            <span
              class="text-white/30 text-sm font-bold font-mono px-3 border-l border-white/5"
              >x</span
            >
          </div>
        </div>
      </div>

      <div
        class="p-5 border-t border-white/5 bg-gradient-to-t from-black/50 to-transparent"
      >
        <button
          @click="handleDeploy"
          class="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-xl flex items-center justify-center gap-2 hover:-translate-y-0.5"
          :class="
            executionMode === 'live'
              ? 'bg-[#f6465d] hover:shadow-[0_0_30px_rgba(246,70,93,0.4)] text-white'
              : 'bg-[#3b82f6] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] text-white'
          "
        >
          <Play class="w-4 h-4" />
          {{
            executionMode === "live"
              ? "INITIATE LIVE TRADING"
              : "START SIMULATION"
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Glass panel mixin class */
.glass-panel {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 0 20px rgba(0, 0, 0, 0.5);
}
</style>
