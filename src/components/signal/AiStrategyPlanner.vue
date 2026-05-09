<script setup lang="ts">
import { ref } from "vue";
import {
  BrainCircuit,
  Sparkles,
  Command,
  Fingerprint,
  ShieldAlert,
  Zap,
  Loader2,
  ArrowRight,
  Play,
  Share2,
  XCircle,
  Database,
  CheckCircle2,
  Settings2,
  SlidersHorizontal,
} from "lucide-vue-next";
import { addStrategy } from "../../store/strategyStore";

const emit = defineEmits(["openStrategy"]);

const prompt = ref("");
const isGenerating = ref(false);
const hasError = ref(false);
const generationStep = ref(0);

const showParameters = ref(false);
const paramConfidence = ref(80);
const paramSize = ref(10);
const paramExecution = ref("MARKET");

const steps = [
  {
    id: 1,
    title: "Parsing Neural Intent",
    desc: "Extracting semantic goals and risk constraints",
    icon: Fingerprint,
    color: "text-[#3b82f6]",
    bg: "bg-[#3b82f6]/10",
    border: "border-[#3b82f6]/20",
  },
  {
    id: 2,
    title: "Market Context Synth",
    desc: "Fetching historical and live order book data patterns",
    icon: Database,
    color: "text-[#8b5cf6]",
    bg: "bg-[#8b5cf6]/10",
    border: "border-[#8b5cf6]/20",
  },
  {
    id: 3,
    title: "Graph Generation",
    desc: "Connecting logical node boundaries and indicators",
    icon: BrainCircuit,
    color: "text-[#10b981]",
    bg: "bg-[#10b981]/10",
    border: "border-[#10b981]/20",
  },
  {
    id: 4,
    title: "Risk Confinement",
    desc: "Locking drawdown limits and position sizing limits",
    icon: ShieldAlert,
    color: "text-[#f43f5e]",
    bg: "bg-[#f43f5e]/10",
    border: "border-[#f43f5e]/20",
  },
  {
    id: 5,
    title: "Execution Staging",
    desc: "Preparing SOR (Smart Order Router) parameters",
    icon: Zap,
    color: "text-[#f59e0b]",
    bg: "bg-[#f59e0b]/10",
    border: "border-[#f59e0b]/20",
  },
];

const builtStrategyId = ref<string | null>(null);

const generateStrategy = () => {
  if (!prompt.value.trim() || isGenerating.value) return;

  // Clear previous state
  hasError.value = false;
  isGenerating.value = true;
  generationStep.value = 1;
  builtStrategyId.value = null;

  // Simulate an error if prompt contains 'error' (for testing error state)
  if (prompt.value.toLowerCase().includes("error")) {
    setTimeout(() => {
      hasError.value = true;
      isGenerating.value = false;
    }, 1500);
    return;
  }

  const interval = setInterval(() => {
    generationStep.value++;
    if (generationStep.value > steps.length) {
      clearInterval(interval);
      finishGeneration();
    }
  }, 1000);
};

const finishGeneration = () => {
  isGenerating.value = false;
  const newId = "ai_" + Math.random().toString(36).substring(7);

  // Create strategy matching prompt intent.
  addStrategy({
    id: newId,
    name: "AI Auto: " + prompt.value.substring(0, 15) + "...",
    type: "AI Generated",
    status: "paused",
    roi: 0,
    trades: 0,
    winRate: 0,
    pnlUsdt: 0,
    alloc: 500,
    pairs: ["BTC/USDT"],
    lastPing: "Offline",
    nodes: [
      {
        id: 'layer-1',
        type: 'section',
        position: { x: 50, y: 50 },
        data: { label: 'Intelligence Pipeline', description: 'AI Inference layer', color: 'purple', width: 450, height: 350 },
      },
      {
        id: 'layer-2',
        type: 'section',
        position: { x: 550, y: 50 },
        data: { label: 'Execution Engine', description: 'Smart order routing', color: 'orange', width: 450, height: 350 },
      },
      {
        id: 'comment-1',
        type: 'comment',
        position: { x: 600, y: -20 },
        data: { text: 'AI dynamically adjusts parameters here.', author: 'Engine' },
        parentNode: 'layer-2'
      },
      {
        id: 'ai-1',
        type: 'aiDecision',
        position: { x: 100, y: 150 },
        data: { analysis: ['Trend', 'Volatility'], confidence: `${paramConfidence.value}%`, riskLevel: 'Low' },
        parentNode: 'layer-1'
      },
      {
        id: 'nav-2',
        type: 'marketOrder',
        position: { x: 650, y: 150 },
        data: { action: 'BUY', type: paramExecution.value, size: `${paramSize.value}%` },
        parentNode: 'layer-2'
      },
    ],
    edges: [{ id: "e-ai-nav", source: "ai-1", target: "nav-2", animated: true, type: 'animated', style: { stroke: 'url(#flowGradient)', strokeWidth: 2, filter: 'url(#neonGlow)' }, class: 'flowing-gradient-stroke' }],
  });

  builtStrategyId.value = newId;
};

const openBuiltStrategy = () => {
  if (builtStrategyId.value) {
    emit("openStrategy", builtStrategyId.value);
  }
};

const resetState = () => {
  prompt.value = "";
  hasError.value = false;
  builtStrategyId.value = null;
  generationStep.value = 0;
};
</script>

<template>
  <div class="flex-1 w-full h-full relative overflow-hidden bg-[#050505]">
    <!-- Ambient Liquid Background -->
    <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <!-- Glow 1 -->
      <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3b82f6]/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[5000ms]"></div>
      <!-- Glow 2 -->
      <div class="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#8b5cf6]/10 rounded-full blur-[150px] mix-blend-screen animate-pulse duration-[7000ms]"></div>
      <!-- Grid Overlay -->
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDMwaDYwTTAgNjBoNjBNMzAgMHY2ME02MCAwdjYwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] opacity-50"></div>
    </div>

    <!-- Main Container -->
    <div class="relative z-10 w-full h-full flex flex-col items-center pt-[10vh] pb-10 px-4 md:px-8 overflow-y-auto custom-scrollbar">
      <div class="w-full max-w-4xl flex flex-col items-center">
        <!-- Header Section -->
        <div class="w-full mb-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div class="relative group cursor-pointer w-[72px] h-[72px] mb-8">
            <div class="absolute inset-0 bg-gradient-to-tr from-[#3b82f6]/40 to-[#8b5cf6]/40 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div class="absolute inset-0 bg-black/50 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-[inset_0_0_20px_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <BrainCircuit class="w-8 h-8 text-white relative z-10 group-hover:text-[#a78bfa] transition-colors" />
            </div>
          </div>

          <h1 class="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/60 uppercase tracking-tight text-center mb-4">
            Neural Engine
          </h1>
          <p class="text-sm md:text-base font-medium text-[#848e9c] max-w-2xl text-center leading-relaxed">
            Translate intention into execution. Describe your desired market behavior, and the Neural Engine will architect a fully functional, backtestable trading graph.
          </p>
        </div>

        <!-- Input Area (Liquid Glass Container) -->
        <div class="w-full relative max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <!-- Ambient Glow for Input -->
          <div class="absolute -inset-1.5 bg-gradient-to-r from-[#3b82f6]/20 via-[#8b5cf6]/20 to-[#ec4899]/20 rounded-[2rem] blur-xl opacity-0 transition-opacity duration-500" :class="{ 'opacity-100': !hasError && !builtStrategyId }"></div>
          
          <div 
            class="relative rounded-[2rem] bg-gradient-to-br from-[#12141a]/95 to-[#0a0c10]/95 backdrop-blur-3xl border transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.4)]"
            :class="[
              hasError ? 'border-[#f43f5e]/40 shadow-[0_0_30px_rgba(244,63,94,0.15)] ring-1 ring-[#f43f5e]/20' : 
              (isGenerating || builtStrategyId) ? 'border-white/5 opacity-80' : 
              'border-white/10 hover:border-white/20 focus-within:border-[#8b5cf6]/50 focus-within:ring-1 focus-within:ring-[#8b5cf6]/30'
            ]"
          >
            <div class="flex items-center p-3 relative overflow-hidden rounded-[2rem]">
                <!-- Liquid progress background -->
                <div v-if="isGenerating" class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#8b5cf6]/20 to-[#3b82f6]/20 transition-all duration-1000 ease-in-out" :style="{ width: `${(generationStep / steps.length) * 100}%` }"></div>

                <div class="w-12 h-12 flex items-center justify-center shrink-0 relative z-10">
                    <Command v-if="!isGenerating && !hasError && !builtStrategyId" class="w-5 h-5 text-white/40" />
                    <Loader2 v-else-if="isGenerating" class="w-5 h-5 text-[#8b5cf6] animate-spin" />
                    <XCircle v-else-if="hasError" class="w-5 h-5 text-[#f43f5e]" />
                    <CheckCircle2 v-else-if="builtStrategyId" class="w-5 h-5 text-[#10b981]" />
                </div>
                
                <input
                    v-model="prompt"
                    @keyup.enter="generateStrategy"
                    :disabled="isGenerating || builtStrategyId !== null || hasError"
                    type="text"
                    placeholder="e.g., 'Long BTC on 1m RSI < 30 and EMA cross, risk 1%'"
                    class="flex-1 bg-transparent border-none text-white text-[15px] sm:text-base py-4 px-2 focus:outline-none focus:ring-0 placeholder-white/30 disabled:opacity-50 relative z-10 w-full"
                    aria-label="Strategy prompt"
                />
                
                <div class="shrink-0 flex items-center gap-2 pr-2 relative z-10">
                    <!-- Reset button when error or done -->
                    <button 
                        v-if="hasError || builtStrategyId" 
                        @click="resetState"
                        class="px-4 h-10 rounded-xl font-bold uppercase tracking-widest text-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        Reset
                    </button>
                    
                    <button
                        v-if="!hasError && !builtStrategyId"
                        @click="generateStrategy"
                        :disabled="isGenerating || !prompt.trim()"
                        class="h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all flex items-center gap-2 group/btn disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        :class="isGenerating ? 'opacity-0 pointer-events-none w-0 px-0' : 'opacity-100'"
                    >
                        Generate
                        <Sparkles class="w-4 h-4 ml-1 group-hover/btn:scale-110 group-hover/btn:rotate-12 transition-transform" />
                    </button>
                </div>
            </div>
          </div>
          
          <div v-if="hasError" class="absolute -bottom-8 left-6 text-xs text-[#f43f5e] font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
            <ShieldAlert class="w-3.5 h-3.5" />
            Inference engine encountered an unrecoverable exception. Please clarify parameters.
          </div>

          <!-- Execution Parameters Settings panel -->
          <div 
             v-if="!isGenerating && !builtStrategyId && !hasError"
             class="mt-4 transition-all duration-500 overflow-hidden"
             :class="showParameters ? 'max-h-60 opacity-100' : 'max-h-12 opacity-80 hover:opacity-100'"
          >
             <div class="px-4 py-3 bg-[#1a1d24]/60 backdrop-blur-md border border-white/10 rounded-2xl cursor-pointer flex items-center justify-between group" @click="showParameters = !showParameters">
                 <div class="flex items-center gap-2">
                     <Settings2 class="w-4 h-4 text-[#8b5cf6]" />
                     <span class="text-xs font-bold text-white uppercase tracking-wider">Execution Guidelines</span>
                 </div>
                 <div class="text-[10px] text-white/40 group-hover:text-white/60 uppercase font-medium tracking-widest transition-colors flex items-center gap-1">
                     Configure Rules <SlidersHorizontal class="w-3 h-3 ml-1" />
                 </div>
             </div>
             
             <!-- Settings Details -->
             <div v-show="showParameters" class="mt-2 p-5 bg-[#0a0c10]/80 border border-white/10 rounded-2xl flex flex-col gap-5 animate-in slide-in-from-top-2 fade-in">
                 
                 <!-- Confidence & Size -->
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div class="flex flex-col gap-2">
                         <div class="flex justify-between items-center">
                             <label class="text-[11px] font-bold text-white/50 uppercase tracking-widest">AI Confidence Limit</label>
                             <span class="text-xs font-medium text-[#10b981]">{{ paramConfidence }}%</span>
                         </div>
                         <input type="range" v-model="paramConfidence" min="50" max="99" class="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#10b981]" />
                     </div>
                     
                     <div class="flex flex-col gap-2">
                         <div class="flex justify-between items-center">
                             <label class="text-[11px] font-bold text-white/50 uppercase tracking-widest">Position Sizing (Wallet %)</label>
                             <span class="text-xs font-medium text-[#3b82f6]">{{ paramSize }}%</span>
                         </div>
                         <input type="range" v-model="paramSize" min="1" max="100" class="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#3b82f6]" />
                     </div>
                 </div>

                 <!-- Execution Type -->
                 <div class="flex flex-col gap-2">
                     <label class="text-[11px] font-bold text-white/50 uppercase tracking-widest">Routing Action</label>
                     <div class="flex gap-2">
                         <button 
                            v-for="mode in ['MARKET', 'LIMIT', 'TWAP', 'ICEBERG']" 
                            :key="mode"
                            @click="paramExecution = mode"
                            class="flex-1 py-2 text-xs font-bold tracking-wider rounded-xl transition-colors border"
                            :class="paramExecution === mode ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/40 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-transparent text-white/40 border-white/5 hover:border-white/10 hover:text-white/80'"
                         >
                             {{ mode }}
                         </button>
                     </div>
                 </div>
             </div>
          </div>
        </div>

        <!-- Generation Pipeline Visualization -->
        <div v-if="isGenerating || builtStrategyId" class="w-full max-w-3xl mt-12 mb-8 relative">
          <!-- Vertical connecting line -->
          <div class="absolute left-6 top-8 bottom-8 w-[2px] bg-gradient-to-b from-white/10 via-white/5 to-transparent"></div>
          <!-- Animated progress line -->
          <div 
             class="absolute left-6 top-8 w-[2px] bg-gradient-to-b from-[#3b82f6] to-[#8b5cf6] transition-all duration-1000 ease-in-out z-0 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
             :style="{ height: `${Math.min(100, Math.max(0, (generationStep - 1) / (steps.length - 1)) * 100)}%` }"
          ></div>
          
          <div class="flex flex-col gap-6 relative z-10 w-full px-1">
            <div
              v-for="(step, index) in steps"
              :key="step.id"
              class="flex items-start gap-5 transition-all duration-700 ease-out"
              :class="[
                generationStep > index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none',
                generationStep === step.id ? 'scale-100' : generationStep > step.id ? 'opacity-60 scale-[0.98]' : ''
              ]"
            >
              <!-- Step Icon / Status Connector -->
              <div class="relative shrink-0 w-10 h-10 mt-1">
                  <!-- Ring background -->
                  <div class="absolute inset-0 rounded-full border-2 transition-colors duration-500" :class="generationStep > step.id ? 'border-[#10b981]' : generationStep === step.id ? 'border-[#8b5cf6]' : 'border-white/10'"></div>
                  
                  <!-- Checkmark (done) -->
                  <div v-if="generationStep > step.id" class="absolute inset-0 bg-[#10b981] rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                     <CheckCircle2 class="w-5 h-5 text-white" />
                  </div>
                  
                  <!-- Pulse (active) -->
                  <div v-else-if="generationStep === step.id" class="absolute inset-0 bg-[#8b5cf6]/20 rounded-full flex items-center justify-center animate-pulse">
                     <div class="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] shadow-[0_0_12px_rgba(139,92,246,0.8)]"></div>
                  </div>
                  
                  <!-- Number (pending) -->
                  <div v-else class="absolute inset-0 rounded-full flex items-center justify-center text-xs font-bold text-white/30">
                      {{ step.id }}
                  </div>
              </div>
              
              <!-- Step Content Card -->
              <div 
                  class="flex-1 rounded-2xl border p-4 flex items-center gap-4 transition-all duration-500 backdrop-blur-xl group hover:border-white/20"
                  :class="[
                      generationStep === step.id ? `bg-white/[0.03] shadow-[0_8px_30px_rgba(0,0,0,0.4)] ${step.border}` : 'bg-white/[0.01] border-white/5',
                  ]"
              >
                 <div class="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 border border-white/5 transition-transform group-hover:scale-105" :class="[step.bg, generationStep === step.id ? 'shadow-inner' : '']">
                     <component :is="step.icon" class="w-5 h-5" :class="step.color" />
                 </div>
                 <div>
                     <h4 class="text-sm md:text-[15px] font-bold text-white tracking-wide mb-1" :class="generationStep === step.id ? '' : 'text-white/80'">
                         {{ step.title }}
                     </h4>
                     <p class="text-xs text-[#848e9c] leading-relaxed">
                         {{ step.desc }}
                     </p>
                 </div>
                 
                 <!-- Micro loader for active step -->
                 <div v-if="generationStep === step.id" class="ml-auto shrink-0 pr-4 flex gap-1">
                     <div class="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style="animation-delay: 0ms"></div>
                     <div class="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style="animation-delay: 150ms"></div>
                     <div class="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style="animation-delay: 300ms"></div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Success CTA Container -->
        <div
          v-if="builtStrategyId"
          class="w-full max-w-xl mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out zoom-in-95"
        >
          <div class="relative rounded-[2rem] bg-gradient-to-br from-[#10b981]/10 to-[#047857]/5 backdrop-blur-2xl border border-[#10b981]/20 p-8 flex flex-col items-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_40px_60px_-15px_rgba(0,0,0,0.6)] text-center overflow-hidden group">
            
            <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDIwaDQwTTAgNDBoNDBNMjAgMHY0ME00MCAwdjQwIiBzdHJva2U9InJnYmEoMTYsIDE4NSwgMTI5LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-50"></div>
            
            <div class="absolute top-0 right-0 w-64 h-64 bg-[#10b981]/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>

            <div class="w-16 h-16 bg-[#10b981]/10 rounded-2xl border border-[#10b981]/30 flex items-center justify-center mb-5 relative z-10 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <Network class="w-8 h-8 text-[#10b981]" />
            </div>
            
            <h3 class="text-2xl font-black text-white uppercase tracking-tight mb-2 relative z-10">
              Graph Initialized
            </h3>
            <p class="text-sm text-[#848e9c] mb-8 max-w-sm relative z-10 leading-relaxed">
              The workflow has been constructed successfully. You may now inspect the node graph, run backtests, or deploy to a live environment.
            </p>
            
            <div class="flex items-center gap-3 w-full relative z-10">
                <button
                    @click="openBuiltStrategy"
                    class="flex-1 h-12 bg-[#10b981] hover:bg-[#0cf69b] text-black rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] active:scale-95 flex items-center justify-center gap-2"
                >
                    <Play class="w-4 h-4 fill-current" /> Enter Workspace
                </button>
                <button
                    class="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95 backdrop-blur-md"
                    title="Share Blueprint"
                >
                    <Share2 class="w-4 h-4" />
                </button>
            </div>
            
          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped liquid scrollbar to hide/smooth it for this component */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
