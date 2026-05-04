<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Search, X, TrendingUp, TrendingDown, Star } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits(['close']);

const searchQuery = ref('');
const results = [
  { pair: 'BTC/USDT', price: '75,242.12', change: '+2.45%', vol: '2.4B' },
  { pair: 'ETH/USDT', price: '3,124.88', change: '-1.22%', vol: '840M' },
  { pair: 'SOL/USDT', price: '142.15', change: '+5.12%', vol: '420M' },
  { pair: 'BNB/USDT', price: '592.33', change: '+0.88%', vol: '120M' },
  { pair: 'DOGE/USDT', price: '0.1245', change: '-4.33%', vol: '85M' },
  { pair: 'XRP/USDT', price: '0.5822', change: '+1.45%', vol: '64M' },
];

const filteredResults = ref(results);

const handleSearch = () => {
  if (!searchQuery.value) {
    filteredResults.value = results;
    return;
  }
  filteredResults.value = results.filter(r => 
    r.pair.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
    <!-- Backdrop -->
    <div @click="emit('close')" class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"></div>
    
    <!-- Modal -->
    <div class="w-full max-w-xl bg-[#1e2329] border border-white/10 rounded-[24px] shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 fade-in slide-in-from-top-4 duration-300">
      <div class="p-4 border-b border-white/5 flex items-center gap-3">
        <Search class="w-5 h-5 text-[#848e9c]" />
        <input 
          v-model="searchQuery"
          @input="handleSearch"
          type="text" 
          placeholder="Search pairs, coins or features..."
          class="flex-1 bg-transparent border-none outline-none text-[#EAECEF] text-base font-medium placeholder:text-[#474d57]"
          autofocus
        />
        <div class="flex items-center gap-2">
          <div class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-[#848e9c] font-mono">ESC</div>
          <button @click="emit('close')" class="p-1 hover:bg-white/5 rounded-lg transition-colors">
            <X class="w-5 h-5 text-[#848e9c]" />
          </button>
        </div>
      </div>

      <div class="max-h-[400px] overflow-y-auto no-scrollbar p-2">
        <div v-if="filteredResults.length === 0" class="py-12 flex flex-col items-center justify-center text-[#474d57]">
          <Search class="w-10 h-10 mb-2 opacity-20" />
          <p class="text-sm font-bold uppercase tracking-widest">No results found</p>
        </div>

        <div v-else class="flex flex-col gap-1">
          <div 
            v-for="r in filteredResults" 
            :key="r.pair"
            class="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <div class="flex items-center gap-3">
              <Star class="w-4 h-4 text-[#474d57] group-hover:text-[#F0B90B] transition-colors" />
              <div>
                <div class="text-sm font-black text-[#EAECEF]">{{ r.pair }}</div>
                <div class="text-[10px] text-[#848e9c] font-bold uppercase tracking-widest">Binance Futures</div>
              </div>
            </div>
            
            <div class="flex items-center gap-6">
              <div class="text-right">
                <div class="text-sm font-mono font-bold text-[#EAECEF]">{{ r.price }}</div>
                <div :class="cn('text-[10px] font-mono font-bold', r.change.startsWith('+') ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                  {{ r.change }}
                </div>
              </div>
              <div class="hidden sm:block text-right w-20">
                <div class="text-[9px] text-[#474d57] font-bold uppercase">Vol</div>
                <div class="text-[11px] font-mono text-[#848e9c]">{{ r.vol }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1.5">
            <div class="w-4 h-4 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px] text-[#848e9c]">↑</div>
            <div class="w-4 h-4 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px] text-[#848e9c]">↓</div>
            <span class="text-[10px] text-[#474d57] font-bold uppercase">Navigate</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-[#848e9c]">ENTER</div>
            <span class="text-[10px] text-[#474d57] font-bold uppercase">Select</span>
          </div>
        </div>
        <span class="text-[10px] text-[#474d57] font-black italic">TradeX Command Palette v1.0</span>
      </div>
    </div>
  </div>
</template>
