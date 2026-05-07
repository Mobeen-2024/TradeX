<script setup lang="ts">
import { currentPrice, activePositions } from '../store/tradeStore';
import MarketSentiment from '../components/MarketSentiment.vue';
import TickerRibbon from '../components/TickerRibbon.vue';
import { cn } from '../lib/utils';
import { Bitcoin, Signal, Activity, TrendingUp, TrendingDown, Info, ShieldAlert } from 'lucide-vue-next';

const icons: Record<string, any> = {
  Activity,
  Bitcoin,
  Signal,
  TrendingUp,
};

const pairs = [
  { name: 'Bitcoin', symbol: 'BTC', price: currentPrice, change: '+1.99%', icon: 'Bitcoin', color: '#F0B90B' },
  { name: 'Ethereum', symbol: 'ETH', price: '3077.93', change: '+2.45%', icon: 'Signal', color: '#627EEA' },
  { name: 'Solana', symbol: 'SOL', price: '145.22', change: '-0.82%', icon: 'Activity', color: '#14F195' },
  { name: 'Binance Coin', symbol: 'BNB', price: '580.44', change: '+0.15%', icon: 'TrendingUp', color: '#F3BA2F' },
  { name: 'Cardano', symbol: 'ADA', price: '0.45', change: '-1.12%', icon: 'Signal', color: '#0033AD' },
  { name: 'Ripple', symbol: 'XRP', price: '0.62', change: '+0.88%', icon: 'Activity', color: '#23292F' }
];

const formatPrice = (price: string | number) => {
  return typeof price === 'number' ? price.toFixed(2) : price;
};

// Calculate unrealized PNL % based on entry, mark, and size.
// Using formula: (PnL / Initial Margin) * 100
// Initial Margin = (entry * size) / leverage
// PnL (USDT) = (mark - entry) * size [LONG] | (entry - mark) * size [SHORT]
const calculatePnlPercent = (pos: any) => {
  const mark = pos.mark || pos.entry;
  const leverageNum = parseFloat(pos.leverage) || 1;
  const initialMargin = (pos.entry * pos.size) / leverageNum;
  
  if (initialMargin === 0) return 0;

  const pnlUsdt = pos.type === 'LONG' 
    ? (mark - pos.entry) * pos.size 
    : (pos.entry - mark) * pos.size;
    
  return (pnlUsdt / initialMargin) * 100;
};
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 no-scrollbar bg-[#0b0e11]/50 backdrop-blur-md">
    <div class="flex flex-col gap-6">
      <div class="flex justify-between items-end">
        <div>
          <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Market Overview</h2>
          <p class="text-xs text-[#848e9c] font-medium uppercase tracking-[0.2em] mt-1 opacity-60">Live market analytics and top movers</p>
        </div>
        <div class="hidden sm:flex gap-4">
            <div class="text-right">
              <div class="text-[10px] text-[#848e9c] uppercase font-bold">24h Volume</div>
              <div class="text-sm font-mono text-white">$2.68B</div>
            </div>
            <div class="text-right border-l border-[#2b3139] pl-4">
              <div class="text-[10px] text-[#848e9c] uppercase font-bold">Total Cap</div>
              <div class="text-sm font-mono text-white">$2.42T</div>
            </div>
        </div>
      </div>
      
      <MarketSentiment />
      <TickerRibbon />

      <!-- Active Positions Section -->
      <div v-if="activePositions.length > 0" class="mt-4">
        <h3 class="text-xl font-black text-white tracking-tight mb-4 flex items-center gap-2">
          Your Active Positions <span class="text-xs px-2 py-0.5 bg-white/10 rounded-full font-mono">{{ activePositions.length }}</span>
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div v-for="pos in activePositions" :key="pos.id" class="bg-white/5 backdrop-blur-2xl border border-white/5 p-5 rounded-[24px] hover:border-white/10 transition-colors relative overflow-hidden group">
            <!-- Background Glow based on PnL -->
            <div :class="cn('absolute -right-10 -top-10 w-32 h-32 opacity-10 blur-3xl rounded-full transition-colors duration-1000', calculatePnlPercent(pos) >= 0 ? 'bg-[#0ecb81]' : 'bg-[#f6465d]')"></div>

            <div class="flex items-center justify-between mb-4 relative z-10">
              <div class="flex items-center gap-3">
                <div :class="cn('w-10 h-10 rounded-xl flex items-center justify-center text-white', pos.type === 'LONG' ? 'bg-[#0ecb81]/20 text-[#0ecb81]' : 'bg-[#f6465d]/20 text-[#f6465d]')">
                  <TrendingUp v-if="pos.type === 'LONG'" class="w-5 h-5" />
                  <TrendingDown v-else class="w-5 h-5" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <div class="font-bold text-white text-[16px]">{{ pos.pair }}</div>
                    <span :class="cn('text-[9px] font-bold px-1.5 py-0.5 rounded', pos.type === 'LONG' ? 'bg-[#0ecb81] text-[#0b0e11]' : 'bg-[#f6465d] text-white')">
                      {{ pos.leverage }}
                    </span>
                  </div>
                  <div class="text-[10px] text-[#848e9c] font-mono tracking-wider mt-0.5 text-left">
                    Size: <span class="text-[#EAECEF] font-bold">{{ pos.size.toFixed(4) }}</span> 
                  </div>
                </div>
              </div>
              
              <!-- PnL Block -->
              <div class="text-right flex flex-col items-end">
                <div class="text-[10px] text-[#848e9c] uppercase font-bold tracking-widest flex items-center gap-1 mb-1">
                  Unrealized PNL <Info class="w-3 h-3 opacity-40" />
                </div>
                <!-- USDT PnL Calculation -->
                <div :class="cn('text-xl font-mono font-black leading-none drop-shadow-md', (pos.type === 'LONG' ? ((pos.mark || pos.entry) - pos.entry) * pos.size : (pos.entry - (pos.mark || pos.entry)) * pos.size) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                  {{ ((pos.type === 'LONG' ? ((pos.mark || pos.entry) - pos.entry) * pos.size : (pos.entry - (pos.mark || pos.entry)) * pos.size) > 0 ? '+' : '') }}{{ (pos.type === 'LONG' ? ((pos.mark || pos.entry) - pos.entry) * pos.size : (pos.entry - (pos.mark || pos.entry)) * pos.size).toFixed(2) }} <span class="text-xs uppercase">USDT</span>
                </div>
                <!-- PnL Percent Calculation -->
                <div :class="cn('text-[12px] font-mono font-medium mt-1.5 px-2 py-0.5 rounded-full', calculatePnlPercent(pos) >= 0 ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]')">
                  {{ calculatePnlPercent(pos) > 0 ? '+' : '' }}{{ calculatePnlPercent(pos).toFixed(2) }}% ROE
                </div>
              </div>
            </div>

            <!-- Stats Footer -->
            <div class="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5 relative z-10">
              <div>
                <div class="text-[10px] text-[#848e9c] uppercase font-bold tracking-wider mb-1">Entry Price</div>
                <div class="text-sm font-mono text-[#EAECEF]">{{ pos.entry.toFixed(2) }}</div>
              </div>
              <div>
                <div class="text-[10px] text-[#848e9c] uppercase font-bold tracking-wider mb-1">Mark Price</div>
                <div class="text-sm font-mono text-[#F0B90B]">{{ (pos.mark || pos.entry).toFixed(2) }}</div>
              </div>
            </div>
            
            <!-- Safe / Danger indicator -->
            <div class="mt-4 pt-4 border-t border-white/5 flex gap-2 items-center relative z-10" v-if="calculatePnlPercent(pos) < -50">
                <ShieldAlert class="w-4 h-4 text-[#f6465d] animate-pulse" />
                <span class="text-[10px] text-[#f6465d] uppercase font-bold tracking-widest">High Liquidation Risk</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
        <div v-for="pair in pairs" :key="pair.symbol" class="bg-white/5 backdrop-blur-2xl border border-white/5 p-5 rounded-[24px] hover:border-[#F0B90B]/40 transition-all duration-500 cursor-pointer group hover:bg-white/10 relative overflow-hidden hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:-translate-y-2">
          <!-- Glow Effect -->
          <div class="absolute -right-4 -top-4 w-16 h-16 opacity-10 blur-2xl rounded-full" :style="`background-color: ${pair.color}`"></div>
          
          <div class="flex justify-between items-center mb-4 relative z-10">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-[#0b0e11] flex items-center justify-center border border-[#2b3139] group-hover:border-[#F0B90B]/30 transition-colors">
                  <component :is="icons[pair.icon]" class="w-5 h-5" :style="`color: ${pair.color}`" />
                </div>
              <div>
                <div class="font-bold text-white text-[15px]">{{ pair.name }}</div>
                <div class="text-[10px] text-[#848e9c] uppercase font-mono tracking-tighter">{{ pair.symbol }}/USDT</div>
              </div>
            </div>
            <div class="text-right">
              <div :class="cn('text-[13px] font-bold px-1.5 py-0.5 rounded', pair.change.startsWith('+') ? 'text-[#0ecb81] bg-[#0ecb81]/10' : 'text-[#f6465d] bg-[#f6465d]/10')">
                {{ pair.change }}
              </div>
            </div>
          </div>
          <div class="flex justify-between items-end relative z-10">
            <div>
              <div class="text-xs text-[#848e9c] mb-1">Price</div>
              <div class="text-xl font-mono font-bold text-white leading-none">${{ formatPrice(pair.price) }}</div>
            </div>
            <div class="w-24 h-10 flex items-end gap-[2px]">
                <div v-for="j in 10" :key="j" :class="cn('flex-1 rounded-t-sm transition-all duration-500', pair.change.startsWith('+') ? 'bg-[#0ecb81]' : 'bg-[#f6465d]')" :style="`height: ${20 + Math.random() * 80}%; opacity: ${0.2 + (j/10) * 0.8}`"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
