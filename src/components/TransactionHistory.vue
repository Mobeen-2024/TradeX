<script setup lang="ts">
import { 
  Briefcase, 
  LineChart, 
  History, 
  Cpu, 
  Database, 
  Monitor,
  Target,
  X
} from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { ref, onMounted, onUnmounted } from 'vue';
import { activePositions, closePosition } from '../store/tradeStore';

const tabs = [
  { name: "Positions", icon: Briefcase },
  { name: "Analytics", icon: LineChart },
  { name: "History", icon: History },
  { name: "AI", icon: Cpu },
  { name: "DB", icon: Database },
  { name: "Bots", icon: Monitor },
];
const activeTab = ref(0);

let liveInterval: ReturnType<typeof setInterval>;

onMounted(() => {
  liveInterval = setInterval(() => {
    activePositions.value.forEach(pos => {
      // Simulate real-time logic
      const volatility = pos.entry * 0.001; 
      const delta = (Math.random() - 0.5) * volatility;
      pos.mark += delta;
      
      const levString = pos.leverage.replace(/\D/g,'');
      const lev = parseInt(levString) || 10;
      const isLong = pos.type === 'LONG';
      const priceDiff = isLong ? pos.mark - pos.entry : pos.entry - pos.mark;
      
      // Update Delta completely dynamically
      pos.liveDelta = priceDiff * pos.size * lev;
      
      const margin = (pos.entry * pos.size) / lev;
      pos.liveDeltaPercent = margin > 0 ? (pos.liveDelta / margin) * 100 : 0;
    });
  }, 1000);
});

onUnmounted(() => {
  clearInterval(liveInterval);
});

</script>

<template>
  <div class="bg-[#0b0e11] flex-1 flex flex-col min-h-0 border border-[#1e2329] rounded overflow-hidden">
    
    <!-- Tabs Header -->
    <div class="flex items-center border-b border-[#1e2329] shrink-0 overflow-x-auto pt-2 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
      <div class="flex">
        <button 
          v-for="(tab, i) in tabs"
          :key="tab.name"
          @click="activeTab = i"
          :class="cn(
            'flex items-center gap-2 px-4 py-2 text-[10px] sm:text-[11px] font-bold transition-colors uppercase tracking-[0.1em] whitespace-nowrap border-b-[3px]',
            activeTab === i 
              ? 'border-[#F0B90B] text-[#F0B90B]' 
              : 'border-transparent text-[#848e9c] hover:text-[#EAECEF]'
          )"
        >
          <component :is="tab.icon" class="w-3.5 h-3.5" />
          {{ tab.name }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-auto overflow-x-hidden p-3 bg-[#0b0e11] flex flex-col gap-3 no-scrollbar">
      
      <div v-if="activeTab === 0" class="flex flex-col gap-3">
        <!-- Sub-header -->
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center gap-3">
             <div class="flex items-center justify-center bg-[#00f0ff]/10 w-6 h-6 rounded border border-[#00f0ff]/30">
                <div class="w-1.5 h-1.5 bg-[#00f0ff] rounded-full shadow-[0_0_8px_#00f0ff]"></div>
             </div>
             <span class="text-white font-bold text-xs tracking-wider uppercase">Active Nodes</span>
             <div class="bg-[#00f0ff] text-[#0b0e11] text-[10px] font-black px-1.5 py-0.5 rounded leading-none">{{ activePositions.length }}</div>
          </div>
        </div>

        <div v-if="activePositions.length === 0" class="flex-1 flex items-center justify-center text-[#848e9c] font-medium text-sm mt-10">
          No active positions
        </div>

        <!-- Position Item List Wrapper -->
        <div class="overflow-y-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']" v-else>
          <div class="flex flex-col gap-4">
            <div 
              v-for="(pos, index) in activePositions" 
              :key="pos.id"
              :class="cn(
                'relative group overflow-hidden bg-gradient-to-br from-[#12161a] to-[#090b0e] border border-[#1e2329] rounded-xl flex flex-col p-2 gap-1.5 transition-all duration-500 font-[\'Space_Grotesk\']',
                pos.type === 'LONG' ? 'hover:border-[#0ecb81]/50 hover:shadow-[0_8px_32px_-8px_rgba(14,203,129,0.15)]' : 'hover:border-[#f6465d]/50 hover:shadow-[0_8px_32px_-8px_rgba(246,70,93,0.15)]'
              )">
              
              <!-- Left Border Glow -->
              <div :class="cn(
                'absolute top-0 left-0 w-[3px] h-full shadow-[0_0_10px_rgba(0,0,0,0.5)]',
                pos.type === 'LONG' ? 'bg-gradient-to-b from-[#0ecb81] to-[#0ecb81]/10 shadow-[#0ecb81]/50' : 'bg-gradient-to-b from-[#f6465d] to-[#f6465d]/10 shadow-[#f6465d]/50'
              )"></div>

              <!-- Ambient glow -->
              <div :class="cn(
                'absolute -right-16 -top-16 w-40 h-40 blur-[60px] rounded-full transition-opacity duration-500 opacity-0 group-hover:opacity-20 pointer-events-none',
                pos.type === 'LONG' ? 'bg-[#0ecb81]' : 'bg-[#f6465d]'
              )"></div>
              
              <!-- Top info -->
              <div class="flex justify-between items-center z-10 w-full pl-1">
                 <div class="flex items-center gap-3">
                    <!-- Icon -->
                    <div :class="cn(
                        'w-10 h-10 rounded-lg shrink-0 border text-sm font-black flex items-center justify-center leading-none shadow-inner tracking-widest',
                        pos.type === 'LONG' ? 'border-[#0ecb81]/30 text-[#0ecb81] bg-[#0ecb81]/10' : 'border-[#f6465d]/30 text-[#f6465d] bg-[#f6465d]/10'
                      )">
                       {{ pos.pair.substring(0, 2) }}
                    </div>
                    <!-- Title & Badges -->
                    <div class="flex flex-col gap-1.5">
                       <h3 class="text-[#EAECEF] font-bold text-[16px] leading-none tracking-wider">
                         {{ pos.pair }}
                       </h3>
                       <div class="flex items-center gap-2 mt-0.5">
                          <span :class="cn(
                            'text-[11px] font-bold px-1.5 py-[2px] rounded uppercase leading-none border',
                            pos.type === 'LONG' ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20' : 'bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20'
                          )">{{ pos.type }}</span>
                          <span class="text-[11px] font-bold text-[#F0B90B] bg-[#F0B90B]/10 px-1.5 py-[2px] border border-[#F0B90B]/20 rounded uppercase leading-none">{{ pos.leverage }}</span>
                       </div>
                    </div>
                 </div>
                 <div class="flex flex-col items-end">
                    <div class="text-[11px] uppercase tracking-[0.1em] text-[#848e9c] font-semibold mb-1">Unrealized PNL</div>
                    <div :class="cn(
                      'font-bold text-[22px] leading-none tracking-tight transition-colors duration-300',
                      pos.liveDelta >= 0 ? 'text-[#0ecb81] drop-shadow-[0_0_8px_rgba(14,203,129,0.3)]' : 'text-[#f6465d] drop-shadow-[0_0_8px_rgba(246,70,93,0.3)]'
                    )">
                      {{ pos.liveDelta >= 0 ? '+' : '' }}{{ pos.liveDelta.toFixed(2) }}
                    </div>
                    <div :class="cn(
                      'font-semibold text-[12px] mt-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5',
                      pos.liveDeltaPercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                    )">
                      {{ pos.liveDeltaPercent >= 0 ? '+' : '' }}{{ pos.liveDeltaPercent.toFixed(2) }}%
                    </div>
                 </div>
              </div>

              <!-- Middle Stats Grid -->
              <div class="flex w-full bg-black/20 rounded-lg p-2 border border-white/5 z-10 ml-1 items-center divide-x divide-white/5">
                 <div class="flex-1 flex flex-col gap-1 items-center text-center px-1 w-1/4">
                    <div class="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#848e9c] font-medium whitespace-nowrap">Size</div>
                    <div class="text-[13px] sm:text-[14px] font-semibold text-[#EAECEF] truncate w-full">{{ pos.size.toFixed(4) }}</div>
                 </div>
                 <div class="flex-1 flex flex-col gap-1 items-center text-center px-1 w-1/4">
                    <div class="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#848e9c] font-medium whitespace-nowrap">Entry Price</div>
                    <div class="text-[13px] sm:text-[14px] font-semibold text-[#EAECEF] truncate w-full">{{ pos.entry.toFixed(2) }}</div>
                 </div>
                 <div class="flex-1 flex flex-col gap-1 items-center text-center px-1 w-1/4">
                    <div class="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#848e9c] font-medium whitespace-nowrap">Mark Price</div>
                    <div class="text-[13px] sm:text-[14px] font-semibold text-[#F0B90B] truncate w-full">{{ pos.mark.toFixed(2) }}</div>
                 </div>
                 <div class="flex-1 flex flex-col gap-1 items-center text-center px-1 w-1/4">
                    <div class="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#848e9c] font-medium whitespace-nowrap">Liq. Price</div>
                    <div class="text-[13px] sm:text-[14px] font-semibold text-[#f6465d] truncate w-full">
                        {{ (pos.entry * (pos.type === 'LONG' ? 0.95 : 1.05)).toFixed(2) }}
                    </div>
                 </div>
              </div>

              <!-- Margin Progress Bar -->
              <div class="w-full flex flex-col gap-0.5 ml-1 z-10 my-0">
                <div class="flex justify-between items-center text-[11px] text-[#848e9c] font-medium uppercase tracking-wider">
                  <span>Margin Ratio</span>
                  <span>{{ Math.min(100, Math.abs(pos.liveDeltaPercent) * 2).toFixed(1) }}%</span>
                </div>
                <div class="w-full h-2 bg-[#12161a] rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <div :class="cn(
                    'h-full rounded-full transition-all duration-300',
                    pos.liveDelta >= 0 ? 'bg-gradient-to-r from-[#0ecb81]/50 to-[#0ecb81]' : 'bg-gradient-to-r from-[#f6465d]/50 to-[#f6465d]'
                  )" :style="{ width: `${Math.min(100, Math.abs(pos.liveDeltaPercent) * 2)}%` }"></div>
                </div>
              </div>

              <!-- Bottom Actions -->
              <div class="flex items-center gap-2.5 w-full ml-1 z-10">
                 <button class="flex-1 py-1 rounded-md border border-[#2a2b30] bg-[#18191c] hover:bg-[#2a2b30] hover:text-white text-[#8b8d96] font-medium text-[12px] uppercase tracking-wider transition-all duration-200">
                    TP/SL
                 </button>
                 <button @click="closePosition(pos.id)" class="flex-1 py-1 rounded-md border border-[#f6465d]/30 bg-[#f6465d]/10 hover:bg-[#f6465d] hover:text-white text-[#f6465d] font-bold text-[12px] uppercase tracking-widest transition-all duration-300 shadow-[0_0_10px_rgba(246,70,93,0.1)] hover:shadow-[0_0_15px_rgba(246,70,93,0.4)]">
                    Market Close
                 </button>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

