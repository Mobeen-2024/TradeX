<script setup lang="ts">
import { ref } from 'vue';
import { cn } from '../lib/utils';
import { 
  ChevronRight, Activity, Cpu, Bot, Settings, Plus, Play, Square, Wallet
} from 'lucide-vue-next';
import { activePositions } from '../store/tradeStore';

const isCollapsed = ref(false);
const activeTab = ref('strategies'); // strategies, positions, ai

const strategies = ref([
  { id: 1, name: 'Delta Neutral', status: 'running', apy: '12.4%', uptime: '5d 14h' },
  { id: 2, name: 'Grid Bot (BTC)', status: 'stopped', apy: '--', uptime: '--' },
]);
</script>

<template>
  <div 
    :class="cn(
      'h-full border-l border-white/5 bg-[#0b0e11]/80 backdrop-blur-xl flex flex-col transition-all duration-300 z-10',
      isCollapsed ? 'w-[60px]' : 'w-[320px]'
    )"
  >
    <!-- Header / Toggle -->
    <div class="h-14 border-b border-white/5 flex items-center px-4 shrink-0 justify-between">
      <button 
        @click="isCollapsed = !isCollapsed"
        class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 text-[#848e9c] hover:text-white transition-colors -ml-2"
      >
        <ChevronRight :class="cn('w-4 h-4 transition-transform', isCollapsed ? 'rotate-180' : '')" />
      </button>

      <div v-if="!isCollapsed" class="font-bold text-sm text-[#EAECEF] uppercase tracking-widest flex items-center gap-2">
        Command Center
      </div>
    </div>

    <!-- Tabs -->
    <div v-if="!isCollapsed" class="flex p-2 gap-1 border-b border-white/5 shrink-0 bg-white/[0.02]">
      <button 
        @click="activeTab = 'strategies'"
        :class="cn(
          'flex-1 py-1.5 text-xs font-bold rounded flex flex-col items-center justify-center gap-1 transition-colors',
          activeTab === 'strategies' ? 'bg-[#F0B90B]/10 text-[#F0B90B]' : 'text-[#848e9c] hover:bg-white/5 hover:text-white'
        )"
      >
        <Cpu class="w-4 h-4" /> 
        <span class="text-[9px] uppercase tracking-wider">Bots</span>
      </button>
      <button 
        @click="activeTab = 'positions'"
        :class="cn(
          'flex-1 py-1.5 text-xs font-bold rounded flex flex-col items-center justify-center gap-1 transition-colors relative',
          activeTab === 'positions' ? 'bg-[#0ECB81]/10 text-[#0ECB81]' : 'text-[#848e9c] hover:bg-white/5 hover:text-white'
        )"
      >
        <Wallet class="w-4 h-4" />
        <span class="text-[9px] uppercase tracking-wider">Pos</span>
        <div v-if="activePositions.length > 0" class="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#0ecb81]"></div>
      </button>
      <button 
        @click="activeTab = 'ai'"
        :class="cn(
          'flex-1 py-1.5 text-xs font-bold rounded flex flex-col items-center justify-center gap-1 transition-colors',
          activeTab === 'ai' ? 'bg-[#8A2BE2]/10 text-[#8A2BE2]' : 'text-[#848e9c] hover:bg-white/5 hover:text-white'
        )"
      >
        <Bot class="w-4 h-4" />
        <span class="text-[9px] uppercase tracking-wider">AI</span>
      </button>
    </div>

    <!-- Collapsed State -->
    <div v-if="isCollapsed" class="flex flex-col gap-4 items-center pt-4 flex-1">
      <button @click="isCollapsed=false; activeTab='strategies'" class="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-[#F0B90B] transition-colors" title="Bots">
        <Cpu class="w-5 h-5" />
      </button>
      <button @click="isCollapsed=false; activeTab='positions'" class="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-[#0ECB81] transition-colors relative" title="Positions">
        <Wallet class="w-5 h-5" />
        <div v-if="activePositions.length > 0" class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#0ecb81]"></div>
      </button>
      <button @click="isCollapsed=false; activeTab='ai'" class="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-[#8A2BE2] transition-colors" title="AI Assistant">
        <Bot class="w-5 h-5" />
      </button>
    </div>

    <!-- Expanded Content -->
    <div v-else class="flex-1 overflow-y-auto no-scrollbar p-4 relative">
      
      <!-- STRATEGIES TAB -->
      <div v-if="activeTab === 'strategies'" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        
        <!-- Running Status -->
        <div class="bg-gradient-to-br from-black/40 to-black/10 border border-white/5 rounded-2xl p-4 relative overflow-hidden">
          <div class="absolute -right-4 -top-4 w-16 h-16 bg-[#F0B90B] opacity-10 blur-2xl rounded-full"></div>
          <div class="text-[10px] text-[#5e6673] uppercase font-black tracking-widest mb-3 flex items-center gap-2">
            <Activity class="w-3 h-3 text-[#F0B90B]" /> Running Status
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-2xl font-mono font-black text-white">1</div>
              <div class="text-[9px] text-[#848e9c] uppercase tracking-widest font-bold">Active Bots</div>
            </div>
            <div>
              <div class="text-2xl font-mono font-black text-[#0ecb81]">+12.4%</div>
              <div class="text-[9px] text-[#848e9c] uppercase tracking-widest font-bold">Daily APY</div>
            </div>
          </div>
        </div>

        <!-- Strategy List -->
        <div>
          <div class="text-[10px] text-[#5e6673] uppercase font-black tracking-widest mb-3 pl-1">Strategies</div>
          <div class="space-y-3">
            <div 
              v-for="strategy in strategies" 
              :key="strategy.id"
              class="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden"
            >
              <div v-if="strategy.status === 'running'" class="absolute left-0 top-0 bottom-0 w-1 bg-[#0ecb81]"></div>
              
              <div class="flex items-start justify-between mb-3 pl-2">
                <div>
                  <div class="font-bold text-sm text-[#EAECEF]">{{ strategy.name }}</div>
                  <div class="text-[10px] text-[#848e9c] font-mono mt-0.5">ID: #{{ strategy.id }}992A</div>
                </div>
                <div :class="cn('px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider', strategy.status === 'running' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-white/5 text-[#848e9c]')">
                  {{ strategy.status }}
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 pl-2">
                 <div>
                  <div class="text-[9px] text-[#5e6673] uppercase font-bold mb-0.5">Yield</div>
                  <div :class="cn('text-sm font-mono font-black', strategy.status === 'running' ? 'text-[#0ecb81]' : 'text-[#848e9c]')">{{ strategy.apy }}</div>
                </div>
                <div>
                  <div class="text-[9px] text-[#5e6673] uppercase font-bold mb-0.5">Uptime</div>
                  <div class="text-sm font-mono font-black text-[#EAECEF]">{{ strategy.uptime }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Create Strategy Button -->
        <button class="w-full py-4 rounded-2xl border border-dashed border-white/20 hover:border-[#F0B90B] bg-white/[0.01] hover:bg-[#F0B90B]/5 text-[#848e9c] hover:text-[#F0B90B] transition-all flex flex-col items-center justify-center gap-2 group">
          <div class="w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#F0B90B]/20 flex items-center justify-center transition-colors">
            <Plus class="w-4 h-4" />
          </div>
          <span class="text-[11px] font-bold uppercase tracking-widest">Create Strategy</span>
        </button>

      </div>

      <!-- POSITIONS TAB -->
      <div v-else-if="activeTab === 'positions'" class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
         <div class="text-[10px] text-[#5e6673] uppercase font-black tracking-widest pl-1 mb-2">Active Positions</div>
         
         <div v-if="activePositions.length === 0" class="text-center py-10 px-4 bg-white/[0.02] rounded-2xl border border-white/5">
            <Wallet class="w-8 h-8 text-[#2b3139] mx-auto mb-3" />
            <div class="text-xs text-[#848e9c] font-bold uppercase tracking-widest">No Active Positions</div>
         </div>
         
         <div v-else class="space-y-3">
             <div v-for="pos in activePositions" :key="pos.id" class="bg-white/[0.03] border border-white/5 rounded-2xl p-3">
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center gap-2">
                        <span :class="cn('w-2 h-2 rounded-full', pos.type === 'LONG' ? 'bg-[#0ecb81]' : 'bg-[#f6465d]')"></span>
                        <span class="font-bold text-white text-xs">{{ pos.pair }}</span>
                    </div>
                    <span class="text-[10px] text-[#848e9c] font-mono">{{ pos.leverage }}x</span>
                </div>
                <div class="grid grid-cols-2 gap-2 mt-3">
                    <div>
                        <div class="text-[9px] text-[#5e6673] uppercase font-bold">Entry</div>
                        <div class="text-xs font-mono text-white mt-0.5">{{ pos.entry.toFixed(2) }}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[9px] text-[#5e6673] uppercase font-bold">Size</div>
                        <div class="text-xs font-mono text-white mt-0.5">{{ pos.size.toFixed(4) }}</div>
                    </div>
                </div>
             </div>
         </div>
      </div>

      <!-- AI ASSISTANT TAB -->
      <div v-else-if="activeTab === 'ai'" class="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
         <div class="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col">
            <div class="text-[10px] text-[#8A2BE2] uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                <Bot class="w-3 h-3" /> Oracle AI
            </div>
            
            <div class="flex-1 flex flex-col justify-center items-center text-center opacity-50">
                <Bot class="w-10 h-10 text-[#8A2BE2] mb-3" />
                <p class="text-xs text-[#848e9c] leading-relaxed">
                    AI analysis is analyzing market sentiment and volume profile.
                </p>
            </div>
            
            <div class="mt-auto">
                <div class="bg-black/40 rounded-xl p-3 text-xs text-[#EAECEF] border border-white/10 relative">
                    "Consider scaling down BTC exposure; delta neutrality is slightly skewed."
                    <div class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#8A2BE2] rotate-45"></div>
                </div>
            </div>
         </div>
         
         <div class="mt-4 relative">
             <input type="text" placeholder="Ask AI..." class="w-full bg-[#1e2329] border border-white/10 rounded-xl py-3 pl-4 pr-10 text-xs text-white placeholder:text-[#474d57] focus:outline-none focus:border-[#8A2BE2] transition-colors" />
             <button class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-[#848e9c] hover:text-[#8A2BE2] transition-colors">
                 <ChevronRight class="w-4 h-4" />
             </button>
         </div>
      </div>

    </div>
  </div>
</template>
