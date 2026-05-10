<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Brain, History, Sparkles, Search, TrendingUp, TrendingDown, Clock, ShieldAlert } from 'lucide-vue-next';

interface Experience {
  id: string;
  content: string;
  source: string;
  importance: number;
  pair: string;
  createdAt: string;
}

const experiences = ref<Experience[]>([]);
const searchQuery = ref('');
const recallResults = ref<string[]>([]);
const isSearching = ref(false);
const pollingInterval = ref<any>(null);

const fetchExperiences = async () => {
  try {
    const res = await fetch('/api/ai/experiences');
    experiences.value = await res.json();
  } catch (e) {
    console.error('Failed to fetch AI experiences');
  }
};

const simulateRecall = async () => {
  if (!searchQuery.value) {
    recallResults.value = [];
    return;
  }
  isSearching.value = true;
  try {
    const res = await fetch(`/api/ai/recall?query=${encodeURIComponent(searchQuery.value)}`);
    recallResults.value = await res.json();
  } catch (e) {
    console.error('Recall failed');
  } finally {
    isSearching.value = false;
  }
};

onMounted(() => {
  fetchExperiences();
  pollingInterval.value = setInterval(fetchExperiences, 10000);
});

onUnmounted(() => {
  if (pollingInterval.value) clearInterval(pollingInterval.value);
});

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
</script>

<template>
  <div class="cognitive-brain bg-[#0B0F17] rounded-xl border border-white/5 overflow-hidden flex flex-col h-full shadow-2xl">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-[#0B0F17] to-[#121826] flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-purple-500/10 rounded-lg">
          <Brain class="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-white">Cognitive Brain</h3>
          <p class="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Adaptive Memory Layer</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex -space-x-2">
          <div v-for="i in 3" :key="i" class="w-6 h-6 rounded-full border-2 border-[#0B0F17] bg-purple-500/20 flex items-center justify-center">
            <Sparkles class="w-3 h-3 text-purple-400" />
          </div>
        </div>
        <span class="text-[11px] text-purple-400 font-mono bg-purple-400/10 px-2 py-0.5 rounded">LIVE</span>
      </div>
    </div>

    <!-- Semantic Search (Recall) -->
    <div class="p-4 border-b border-white/5 bg-[#121826]/30">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input 
          v-model="searchQuery"
          @keyup.enter="simulateRecall"
          type="text" 
          placeholder="Query historical patterns (e.g. 'BTC dominance effects')..."
          class="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
        />
        <div v-if="isSearching" class="absolute right-3 top-1/2 -translate-y-1/2">
          <div class="w-3 h-3 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
        </div>
      </div>

      <!-- Recall Results -->
      <div v-if="recallResults.length > 0" class="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1">
        <p class="text-[10px] text-gray-500 font-semibold uppercase px-1">Semantic Recall Matches</p>
        <div v-for="(result, idx) in recallResults" :key="idx" class="bg-purple-500/5 border border-purple-500/10 rounded-lg p-2 flex gap-3">
          <History class="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <p class="text-[11px] text-gray-300 leading-relaxed italic">"{{ result }}"</p>
        </div>
      </div>
    </div>

    <!-- Memory Feed -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
      <div class="flex items-center justify-between px-1">
        <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Recent Experiences</h4>
        <span class="text-[10px] text-gray-600">{{ experiences.length }} items</span>
      </div>

      <div v-if="experiences.length === 0" class="flex flex-col items-center justify-center py-12 text-center opacity-40">
        <Brain class="w-8 h-8 text-gray-600 mb-3" />
        <p class="text-xs text-gray-500">Brain is currently idling.<br/>Awaiting trade outcomes.</p>
      </div>

      <div v-for="exp in experiences" :key="exp.id" class="group relative bg-[#121826]/50 border border-white/5 rounded-xl p-4 hover:border-purple-500/30 transition-all hover:bg-[#161D2D]">
        <!-- Connection Line -->
        <div class="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-white/5 group-hover:bg-purple-500/30 transition-colors"></div>

        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold text-purple-400 font-mono bg-purple-400/10 px-2 py-0.5 rounded">{{ exp.pair }}</span>
            <span class="text-[10px] text-gray-500 flex items-center gap-1">
              <Clock class="w-3 h-3" /> {{ formatDate(exp.createdAt) }}
            </span>
          </div>
          <div class="flex gap-1">
             <div v-for="i in Math.ceil(exp.importance * 3)" :key="i" class="w-1 h-1 rounded-full bg-purple-500"></div>
          </div>
        </div>

        <p class="text-xs text-gray-300 leading-relaxed mb-3">
          {{ exp.content }}
        </p>

        <div class="flex items-center justify-between border-t border-white/5 pt-3">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1 text-[10px] text-gray-500">
              <TrendingUp class="w-3 h-3 text-green-500/70" /> 
              <span>Outcome Analyzed</span>
            </div>
            <div class="flex items-center gap-1 text-[10px] text-gray-500">
              <ShieldAlert class="w-3 h-3 text-yellow-500/70" />
              <span>Institutional Policy</span>
            </div>
          </div>
          <button class="text-[10px] text-purple-400 hover:text-purple-300 font-medium transition-colors">Details →</button>
        </div>
      </div>
    </div>

    <!-- Footer Stats -->
    <div class="px-4 py-3 bg-[#080B12] border-t border-white/5 flex items-center justify-between">
      <div class="flex gap-4">
        <div class="text-center">
          <p class="text-[9px] text-gray-500 uppercase">Recall Rate</p>
          <p class="text-xs font-mono text-white">98.2%</p>
        </div>
        <div class="text-center">
          <p class="text-[9px] text-gray-500 uppercase">Context Depth</p>
          <p class="text-xs font-mono text-white">4096</p>
        </div>
      </div>
      <button class="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white">
        <Sparkles class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.2);
}

.cognitive-brain {
  font-family: 'Inter', sans-serif;
}
</style>
