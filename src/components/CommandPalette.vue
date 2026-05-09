<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Search, Command, Zap, Layers, Activity, Brain } from 'lucide-vue-next';

const isOpen = ref(false);
const searchQuery = ref('');

const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    isOpen.value = !isOpen.value;
    if (isOpen.value) {
      setTimeout(() => document.getElementById('command-input')?.focus(), 50);
    }
  }
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false;
  }
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

const templates = [
  { id: 'rsi-scalper', name: 'RSI Scalper', icon: Activity, desc: 'High-frequency momentum trading' },
  { id: 'mean-reversion', name: 'Mean Reversion', icon: Zap, desc: 'Statistical arbitrage strategy' },
  { id: 'trend-following', name: 'Trend Following', icon: Layers, desc: 'Macro multi-timeframe system' },
  { id: 'ai-momentum', name: 'AI Momentum Engine', icon: Brain, desc: 'Neural network pattern recognition' },
];

const results = computed(() => {
  if (!searchQuery.value) return templates;
  return templates.filter(t => t.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

const emit = defineEmits(['loadTemplate']);

const selectTemplate = (id: string) => {
  emit('loadTemplate', id);
  isOpen.value = false;
  searchQuery.value = '';
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isOpen = false"></div>
    
    <div class="relative w-full max-w-2xl bg-[#0c0f12] border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden flex flex-col">
      <div class="flex items-center px-4 py-3 border-b border-white/5 bg-black/20">
        <Search class="w-5 h-5 text-white/40 mr-3" />
        <input 
          id="command-input"
          v-model="searchQuery"
          type="text" 
          placeholder="Search templates, nodes, or commands (e.g. 'RSI Scalper')"
          class="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 text-lg font-light"
          @keydown.esc="isOpen = false"
        />
        <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 text-white/40 text-[10px] font-mono">
          <Command class="w-3 h-3" /> K
        </div>
      </div>
      
      <div class="p-2 overflow-y-auto max-h-[60vh]">
        <div class="px-3 pt-3 pb-2 text-[10px] font-bold tracking-widest uppercase text-white/30">Strategy Templates</div>
        
        <div v-for="item in results" :key="item.id" 
             @click="selectTemplate(item.id)"
             class="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5">
          <div class="w-10 h-10 rounded-lg bg-[#2b3139] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] flex items-center justify-center border border-white/5 group-hover:bg-[#1a1e24] group-hover:border-[#eab308]/30 group-hover:text-[#eab308] text-white/50 transition-colors">
            <component :is="item.icon" class="w-5 h-5" />
          </div>
          <div class="flex-1">
            <div class="text-sm font-semibold text-white/90">{{ item.name }}</div>
            <div class="text-xs text-white/40">{{ item.desc }}</div>
          </div>
          <div class="opacity-0 group-hover:opacity-100 text-[#eab308] text-xs font-mono tracking-widest px-3 py-1 bg-[#eab308]/10 rounded border border-[#eab308]/20 transition-all">
            LOAD
          </div>
        </div>
        
        <div v-if="results.length === 0" class="p-8 text-center text-white/40 text-sm">
          No templates found matching "{{ searchQuery }}"
        </div>
      </div>
    </div>
  </div>
</template>
