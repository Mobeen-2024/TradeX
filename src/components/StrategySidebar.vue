<script setup lang="ts">
import { ref } from "vue";
import {
  Bot,
  Play,
  Pause,
  BrainCircuit,
  Zap,
  TrendingUp,
  TrendingDown,
  Target,
  ZapIcon,
} from "lucide-vue-next";
import { activePositions } from "../store/tradeStore";
import { activeStrategies } from "../store/strategyStore";
import { cn } from "../lib/utils";
import { eventBus } from "../modules/backend-services";

const activeRightTab = ref("Strategies");
const isGenerating = ref(false);
const aiPrompt = ref("");

const emits = defineEmits(["openStrategy", "openAiPrompt"]);

const aiSignals = ref([
  {
    id: "s1",
    asset: "BTC/USDT",
    signal: "STRONG BUY",
    confidence: "92%",
    reasoning:
      "RSI divergence detected with anomalous volume spike on Bin/Byb.",
  },
  {
    id: "s2",
    asset: "ETH/USDT",
    signal: "SELL",
    confidence: "78%",
    reasoning: "Wallet cluster moving 50k ETH to exchanges.",
  },
]);

// Track button execution state
const actionStates = ref<Record<string, "idle" | "executing">>({});

const toggleStrategy = (v: any) => {
  if (actionStates.value[v.id] === "executing") return;
  actionStates.value[v.id] = "executing";

  setTimeout(() => {
    v.status = v.status === "running" ? "paused" : "running";
    eventBus.publish("strategy_status_change", { id: v.id, status: v.status });
    actionStates.value[v.id] = "idle";
  }, 800);
};
</script>

<template>
  <div
    class="h-full bg-[#0a0c10]/95 backdrop-blur-2xl border-l border-white/5 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)] z-20 overflow-hidden relative"
  >
    <!-- Subtle ambient light -->
    <div
      class="absolute top-0 right-0 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[100px] mix-blend-screen pointer-events-none"
    ></div>

    <!-- Tabs -->
    <div
      class="flex shrink-0 p-3 items-center border-b border-white/5 gap-2 bg-transparent justify-around relative z-10"
    >
      <button
        v-for="tab in ['Strategies', 'Positions', 'AI Signals', 'Automations']"
        :key="tab"
        @click="activeRightTab = tab"
        :class="
          cn(
            'px-2.5 py-2 text-[9px] font-black rounded-xl uppercase tracking-widest transition-all duration-300 w-full',
            activeRightTab === tab
              ? 'bg-white/10 text-white shadow-md border border-white/10'
              : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent',
          )
        "
      >
        {{ tab.split(" ")[0] }}
      </button>
    </div>

    <div
      class="flex-1 overflow-y-auto no-scrollbar p-4 bg-transparent relative z-10 pb-20"
    >
      <!-- Strategies Tab -->
      <div v-if="activeRightTab === 'Strategies'" class="flex flex-col gap-4">
        <div
          v-for="strategy in activeStrategies"
          :key="strategy.id"
          class="relative group cursor-pointer"
          @click="emits('openStrategy', strategy.id)"
        >
          <div
            :class="
              cn(
                'absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm',
                strategy.status === 'running'
                  ? 'from-[#0ecb81]/20'
                  : 'from-white/[0.05]',
              )
            "
          ></div>
          <div
            class="bg-[#0b0e11] border border-white/[0.05] rounded-[20px] p-4 transition-all duration-300 group-hover:border-white/[0.15] relative overflow-hidden flex flex-col shadow-lg hover:shadow-2xl hover:-translate-y-0.5"
          >
            <div
              :class="
                cn(
                  'absolute -right-10 -top-10 w-24 h-24 opacity-0 group-hover:opacity-[0.1] rounded-full blur-xl transition-all duration-500',
                  strategy.status === 'running'
                    ? 'bg-[#0ecb81]'
                    : 'bg-[#F0B90B]',
                )
              "
            ></div>

            <div class="flex items-center justify-between mb-4 relative z-10">
              <div class="flex items-center gap-3">
                <div
                  :class="
                    cn(
                      'w-10 h-10 rounded-[14px] flex items-center justify-center border shadow-inner transition-transform group-hover:scale-105',
                      strategy.status === 'running'
                        ? 'bg-[#0ecb81]/10 border-[#0ecb81]/20'
                        : 'bg-white/5 border-white/10',
                    )
                  "
                >
                  <Bot
                    :class="
                      cn(
                        'w-5 h-5',
                        strategy.status === 'running'
                          ? 'text-[#0ecb81]'
                          : 'text-white/60',
                      )
                    "
                  />
                </div>
                <div>
                  <div class="font-black text-white text-[15px] tracking-wide">
                    {{ strategy.name }}
                  </div>
                  <div
                    class="text-[9px] text-white/40 font-mono tracking-widest uppercase mt-0.5"
                  >
                    {{ strategy.type }}
                  </div>
                </div>
              </div>
              <div
                :class="
                  cn(
                    'w-2 h-2 rounded-full shadow-[0_0_12px]',
                    strategy.status === 'running'
                      ? 'bg-[#0ecb81] shadow-[#0ecb81] animate-pulse border border-[#0ecb81]/50'
                      : strategy.status === 'paused'
                        ? 'bg-[#f59e0b] shadow-[#f59e0b]/50 border border-[#f59e0b]/50'
                        : 'bg-[#a855f7] shadow-[#a855f7]/50 border border-[#a855f7]/50',
                  )
                "
              ></div>
            </div>

            <div class="grid grid-cols-3 gap-2 mb-5 relative z-10">
              <div
                class="bg-black/30 rounded-xl px-2 py-2 flex flex-col items-center border border-white/5 shadow-inner"
              >
                <span
                  class="text-white/40 text-[9px] uppercase font-bold tracking-widest mb-1"
                  >ROI</span
                >
                <span
                  class="text-[#0ecb81] text-xs font-mono font-black drop-shadow-sm"
                  >{{ strategy.roi > 0 ? "+" : "" }}{{ strategy.roi }}%</span
                >
              </div>
              <div
                class="bg-black/30 rounded-xl px-2 py-2 flex flex-col items-center border border-white/5 shadow-inner"
              >
                <span
                  class="text-white/40 text-[9px] uppercase font-bold tracking-widest mb-1"
                  >Win Rate</span
                >
                <span class="text-white/90 text-xs font-mono font-bold"
                  >{{ strategy.winRate }}%</span
                >
              </div>
              <div
                class="bg-black/30 rounded-xl px-2 py-2 flex flex-col items-center border border-white/5 shadow-inner"
              >
                <span
                  class="text-white/40 text-[9px] uppercase font-bold tracking-widest mb-1"
                  >Trades</span
                >
                <span class="text-white/90 text-xs font-mono font-bold">{{
                  strategy.trades
                }}</span>
              </div>
            </div>

            <div class="flex gap-2 relative z-10" @click.stop>
              <button
                @click="toggleStrategy(strategy)"
                :disabled="actionStates[strategy.id] === 'executing'"
                :class="
                  cn(
                    'flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-md group/btn',
                    strategy.status === 'running'
                      ? 'bg-[#f6465d]/5 text-[#f6465d] hover:bg-[#f6465d] hover:text-white border border-[#f6465d]/20 hover:border-[#f6465d] hover:shadow-[0_0_15px_rgba(246,70,93,0.3)]'
                      : 'bg-[#0ecb81]/5 text-[#0ecb81] hover:bg-[#0ecb81] hover:text-[#0b0e11] border border-[#0ecb81]/20 hover:border-[#0ecb81] hover:shadow-[0_0_15px_rgba(14,203,129,0.3)]',
                  )
                "
              >
                <span
                  v-if="actionStates[strategy.id] === 'executing'"
                  class="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1"
                ></span>
                <Pause
                  v-else-if="strategy.status === 'running'"
                  class="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform"
                />
                <Play
                  v-else
                  class="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform"
                />
                {{
                  strategy.status === "running" ? "Halt Agent" : "Deploy Agent"
                }}
              </button>
            </div>
          </div>
        </div>

        <button
          @click="emits('openStrategy', 'new')"
          class="w-full mt-2 py-4 bg-black/20 hover:bg-[#F0B90B] hover:bg-opacity-[0.05] border-2 border-dashed border-white/10 hover:border-[#F0B90B]/30 rounded-[20px] text-white/50 hover:text-[#F0B90B] transition-all duration-500 text-[11px] font-black tracking-widest uppercase flex items-center justify-center gap-2 group shadow-sm mb-4"
        >
          <Zap
            class="w-4 h-4 text-white/30 group-hover:text-[#F0B90B] group-hover:scale-125 transition-all duration-500"
          />
          New Neural Agent
        </button>
      </div>

      <!-- Positions Tab -->
      <div
        v-else-if="activeRightTab === 'Positions'"
        class="flex flex-col gap-4"
      >
        <div
          v-if="activePositions.length === 0"
          class="text-[11px] text-white/40 text-center mt-10 font-mono tracking-wider uppercase bg-white/5 p-6 rounded-[20px] border border-white/5"
        >
          No auto-managed positions.
        </div>
        <div
          v-for="pos in activePositions"
          :key="pos.id"
          class="bg-[#0b0e11] border border-white/[0.05] p-5 rounded-[20px] relative overflow-hidden group hover:border-white/[0.15] transition-all duration-300 shadow-md"
        >
          <div
            :class="
              cn(
                'absolute -right-8 -top-8 w-32 h-32 opacity-0 blur-[60px] rounded-full transition-opacity duration-700',
                pos.type === 'LONG'
                  ? 'bg-[#0ecb81] group-hover:opacity-10'
                  : 'bg-[#f6465d] group-hover:opacity-10',
              )
            "
          ></div>

          <div class="flex items-center justify-between relative z-10">
            <div class="flex items-center gap-4">
              <div
                :class="
                  cn(
                    'w-10 h-10 rounded-[12px] flex items-center justify-center border shadow-inner group-hover:scale-105 transition-transform duration-300',
                    pos.type === 'LONG'
                      ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20'
                      : 'bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20',
                  )
                "
              >
                <TrendingUp v-if="pos.type === 'LONG'" class="w-5 h-5" />
                <TrendingDown v-else class="w-5 h-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <div
                    class="font-black text-white/90 text-[14px] tracking-wide"
                  >
                    {{ pos.pair }}
                  </div>
                  <span
                    :class="
                      cn(
                        'text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest border',
                        pos.type === 'LONG'
                          ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20'
                          : 'bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20',
                      )
                    "
                  >
                    {{ pos.leverage }} {{ pos.type[0] }}
                  </span>
                </div>
                <div
                  class="text-[10px] text-white/40 font-bold mt-1 font-mono tracking-widest uppercase flex items-center gap-1.5"
                >
                  Vol: <span class="text-white">{{ pos.size.toFixed(4) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- AI Signals Tab -->
      <div
        v-else-if="activeRightTab === 'AI Signals'"
        class="flex flex-col gap-4"
      >
        <div
          v-for="signal in aiSignals"
          :key="signal.id"
          class="bg-[#0b0e11] border border-white/[0.05] hover:border-white/[0.15] rounded-[20px] p-5 relative overflow-hidden group shadow-md transition-all duration-300"
        >
          <!-- decorative background -->
          <div
            :class="
              cn(
                'absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-0 rounded-full transition-opacity duration-700',
                signal.signal.includes('BUY')
                  ? 'bg-[#0ecb81] group-hover:opacity-10'
                  : 'bg-[#f6465d] group-hover:opacity-10',
              )
            "
          ></div>

          <div class="flex justify-between items-start mb-4 relative z-10">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-[14px] bg-[#627EEA]/10 border border-[#627EEA]/20 shadow-inner flex items-center justify-center text-[#627EEA]"
              >
                <BrainCircuit class="w-5 h-5" />
              </div>
              <div class="flex flex-col">
                <span class="text-white font-black text-[15px] tracking-wide">{{
                  signal.asset
                }}</span>
                <span
                  class="text-white/40 text-[9px] font-mono tracking-widest uppercase mt-0.5"
                  >{{ signal.id }}</span
                >
              </div>
            </div>
          </div>

          <div
            :class="
              cn(
                'mb-4 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase border inline-flex items-center',
                signal.signal.includes('BUY')
                  ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20'
                  : 'bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20',
              )
            "
          >
            {{ signal.signal }}
          </div>

          <p
            class="text-[11px] text-white/60 mb-5 leading-relaxed relative z-10 font-medium tracking-wide"
          >
            "{{ signal.reasoning }}"
          </p>

          <div
            class="flex justify-between items-center relative z-10 border-t border-white/5 pt-4"
          >
            <span
              class="text-[9px] uppercase tracking-widest text-white/40 font-bold"
              >Confidence:
              <span class="text-white/90 font-mono text-[11px]">{{
                signal.confidence
              }}</span></span
            >
            <button
              class="bg-white/5 hover:bg-[#627EEA] hover:text-[#0b0e11] text-white border border-white/10 hover:border-[#627EEA] px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_15px_rgba(98,126,234,0)] hover:shadow-[0_0_20px_rgba(98,126,234,0.4)]"
            >
              Execute
            </button>
          </div>
        </div>
      </div>

      <!-- Automations Tab -->
      <div
        v-else-if="activeRightTab === 'Automations'"
        class="flex flex-col gap-4"
      >
        <div
          class="bg-black/30 border border-white/[0.05] p-5 rounded-[20px] shadow-inner relative overflow-hidden"
        >
          <div
            class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-screen"
          ></div>
          <h4
            class="text-white/90 font-black text-[13px] flex items-center gap-2 mb-2 tracking-widest uppercase relative z-10"
          >
            <ZapIcon class="w-4 h-4 text-[#F0B90B]" /> Default Macros
          </h4>
          <p
            class="text-[11px] text-white/40 mb-6 font-medium leading-relaxed relative z-10"
          >
            Instant playbook executions across your portfolio.
          </p>

          <div class="flex flex-col gap-3 relative z-10">
            <button
              class="bg-[#0b0e11] hover:bg-white/[0.05] active:bg-black border border-white/10 hover:border-white/[0.2] rounded-xl p-4 text-left transition-all duration-300 flex flex-col group shadow-md hover:shadow-xl hover:-translate-y-0.5"
            >
              <span
                class="text-white/90 text-[12px] font-bold group-hover:text-white transition-colors mb-1.5 flex items-center justify-between w-full"
              >
                Take Profit 10% / Stop 5%
                <Target
                  class="w-3.5 h-3.5 text-white/30 group-hover:text-white/90 transition-colors"
                />
              </span>
              <span class="text-white/40 text-[10px] tracking-wide font-medium"
                >Secures open exposure limits automatically.</span
              >
            </button>
            <button
              class="bg-[#0b0e11] hover:bg-white/[0.05] active:bg-black border border-white/10 hover:border-white/[0.2] rounded-xl p-4 text-left transition-all duration-300 flex flex-col group shadow-md hover:shadow-xl hover:-translate-y-0.5"
            >
              <span
                class="text-white/90 text-[12px] font-bold group-hover:text-white transition-colors mb-1.5 flex items-center justify-between w-full"
              >
                Scale Out (25%)
                <Target
                  class="w-3.5 h-3.5 text-white/30 group-hover:text-white/90 transition-colors"
                />
              </span>
              <span class="text-white/40 text-[10px] tracking-wide font-medium"
                >Sells 25% of all profitable positions instantly.</span
              >
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
