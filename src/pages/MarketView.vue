<script setup lang="ts">
import { ref, computed } from 'vue';
import { cn } from '../lib/utils';
import MiniSparkline from '../components/MiniSparkline.vue';
import { Search, Activity, TrendingUp, TrendingDown, Flame, ArrowUpRight, BarChart2 } from 'lucide-vue-next';

const searchQuery = ref('');

// Mock Data for the Market Overview
const categories = ['All', 'Layer 1', 'DeFi', 'Gaming', 'AI', 'Meme'];
const activeCategory = ref('All');

const topMarkets = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67342.12, change: 2.34, volume: '45.2B', marketCap: '1.3T' },
  { symbol: 'ETH', name: 'Ethereum', price: 3456.89, change: 5.12, volume: '18.9B', marketCap: '415B' },
  { symbol: 'SOL', name: 'Solana', price: 145.67, change: -1.23, volume: '5.1B', marketCap: '65B' },
  { symbol: 'BNB', name: 'Binance Coin', price: 589.34, change: 0.45, volume: '1.2B', marketCap: '90B' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.16, change: 12.4, volume: '3.4B', marketCap: '22B' },
  { symbol: 'ADA', name: 'Cardano', price: 0.45, change: -2.1, volume: '400M', marketCap: '16B' },
  { symbol: 'AVAX', name: 'Avalanche', price: 35.67, change: 4.5, volume: '800M', marketCap: '13B' },
  { symbol: 'LINK', name: 'Chainlink', price: 18.9, change: 1.2, volume: '600M', marketCap: '11B' },
  { symbol: 'DOT', name: 'Polkadot', price: 7.23, change: -0.5, volume: '300M', marketCap: '10B' },
  { symbol: 'NEAR', name: 'NEAR Protocol', price: 6.78, change: 8.9, volume: '550M', marketCap: '7B' },
];

const trendingCoins = [
  { symbol: 'PEPE', name: 'Pepe', change: 45.6, price: 0.000008, icon: Flame },
  { symbol: 'FET', name: 'Fetch.ai', change: 23.4, price: 2.34, icon: Activity },
  { symbol: 'RNDR', name: 'Render', change: 18.9, price: 9.87, icon: ArrowUpRight },
];

const filteredMarkets = computed(() => {
  if (!searchQuery.value) return topMarkets;
  return topMarkets.filter(m => 
    m.symbol.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
    m.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const formatNum = (num: number, decimals: number = 2) => num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-[#030712] relative overflow-hidden font-sans">
    
    <!-- Liquid Glassmorphism Ambient Background -->
    <div class="absolute top-[-20%] left-[20%] w-[50%] h-[50%] bg-gradient-to-br from-[#14F195]/10 to-transparent blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-gradient-to-tl from-[#627EEA]/10 to-transparent blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

    <div class="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8 z-10 relative">
      <div class="max-w-[1400px] mx-auto flex flex-col gap-8">
        
        <!-- Header & Top Highlights -->
        <div class="flex flex-col xl:flex-row gap-6">
          <div class="flex-1 flex flex-col justify-center">
            <h1 class="text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
              Markets Overview
            </h1>
            <p class="text-[#848e9c] text-lg max-w-xl">
              Track global crypto market performance, discover trending assets, and analyze volume leaders in real-time.
            </p>
            
            <div class="flex flex-wrap gap-4 mt-8">
              <div class="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-5 flex-1 min-w-[200px]">
                <div class="text-[#848e9c] text-sm font-semibold uppercase tracking-wider mb-2">Global Market Cap</div>
                <div class="text-3xl font-mono font-bold text-white">$2.45T</div>
                <div class="text-[#0ecb81] text-sm mt-1 flex items-center gap-1 font-medium bg-[#0ecb81]/10 w-fit px-2 py-0.5 rounded">
                  <TrendingUp class="w-4 h-4" /> +2.4% (24h)
                </div>
              </div>
              <div class="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-5 flex-1 min-w-[200px]">
                <div class="text-[#848e9c] text-sm font-semibold uppercase tracking-wider mb-2">24h Vol</div>
                <div class="text-3xl font-mono font-bold text-white">$98.2B</div>
                <div class="text-[#f6465d] text-sm mt-1 flex items-center gap-1 font-medium bg-[#f6465d]/10 w-fit px-2 py-0.5 rounded">
                  <TrendingDown class="w-4 h-4" /> -5.1% (24h)
                </div>
              </div>
            </div>
          </div>
          
          <!-- Hot/Trending Mini Board -->
          <div class="xl:w-[400px] bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/5 backdrop-blur-2xl rounded-[24px] p-6 shadow-xl flex flex-col gap-4 relative overflow-hidden group hover:border-[#F0B90B]/30 transition-colors duration-500">
             <!-- Glow Top -->
             <div class="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#F0B90B]/50 to-transparent"></div>
             
             <div class="flex justify-between items-center z-10">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                  <Flame class="w-5 h-5 text-[#F0B90B]" />
                  Trending Hot
                </h3>
             </div>
             
             <div class="flex flex-col gap-3 z-10">
               <div v-for="(coin, index) in trendingCoins" :key="coin.symbol" class="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group/item border border-transparent hover:border-white/10">
                 <div class="flex items-center gap-3">
                   <div class="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center font-bold text-xs text-[#848e9c] group-hover/item:text-white transition-colors">
                     {{ index + 1 }}
                   </div>
                   <div>
                     <div class="text-white font-bold leading-tight">{{ coin.symbol }}</div>
                     <div class="text-[#848e9c] text-xs">{{ coin.name }}</div>
                   </div>
                 </div>
                 <div class="text-right">
                   <div class="text-white font-mono text-sm">${{ coin.price }}</div>
                   <div class="text-[#0ecb81] text-xs font-medium">
                     +{{ coin.change }}%
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
           <div class="flex items-center overflow-x-auto no-scrollbar gap-2 w-full sm:w-auto pb-2 sm:pb-0">
             <button 
               v-for="cat in categories" 
               :key="cat"
               @click="activeCategory = cat"
               :class="cn(
                 'px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap outline-none',
                 activeCategory === cat ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-white/5 text-[#848e9c] hover:bg-white/10 hover:text-white'
               )"
             >
               {{ cat }}
             </button>
           </div>
           
           <div class="relative w-full sm:w-64">
             <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#848e9c]" />
             <input 
               v-model="searchQuery" 
               type="text" 
               placeholder="Search coin Name/Symbol..." 
               class="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#F0B90B]/50 transition-colors" 
             />
           </div>
        </div>

        <!-- The List -->
        <div class="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div class="grid grid-cols-[1fr_1fr] sm:grid-cols-[1fr_1fr_1fr_1fr] md:grid-cols-[1fr_1fr_1fr_1fr_1fr] lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_2fr] gap-4 p-4 border-b border-white/5 bg-black/20 text-[#848e9c] text-xs font-bold uppercase tracking-wider">
            <div class="pl-4">Asset</div>
            <div class="text-right">Price</div>
            <div class="text-right">24h Change</div>
            <div class="text-right hidden sm:block">24h Volume</div>
            <div class="text-right hidden md:block">Market Cap</div>
            <div class="text-right pr-4 hidden lg:block">7 Days Chart (Mock)</div>
          </div>
          
          <div class="flex flex-col">
            <div 
              v-for="market in filteredMarkets" 
              :key="market.symbol"
              class="grid grid-cols-[1fr_1fr] sm:grid-cols-[1fr_1fr_1fr_1fr] md:grid-cols-[1fr_1fr_1fr_1fr_1fr] lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_2fr] gap-4 p-4 items-center border-b border-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group"
            >
              <div class="flex items-center gap-3 pl-4">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e2329] to-[#0b0e11] border border-white/10 flex items-center justify-center font-bold text-[#F0B90B] shadow-inner group-hover:scale-110 group-hover:border-[#F0B90B]/30 transition-all duration-300">
                  {{ market.symbol[0] }}
                </div>
                <div>
                  <div class="text-white font-bold">{{ market.symbol }}</div>
                  <div class="text-[#848e9c] text-xs">{{ market.name }}</div>
                </div>
              </div>
              
              <div class="text-right font-mono text-white">
                ${{ formatNum(market.price) }}
              </div>
              
              <div :class="cn('text-right font-medium flex items-center justify-end gap-1', market.change >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                <TrendingUp v-if="market.change >= 0" class="w-4 h-4 hidden sm:block" />
                <TrendingDown v-else class="w-4 h-4 hidden sm:block" />
                {{ market.change >= 0 ? '+' : '' }}{{ market.change }}%
              </div>
              
              <div class="text-right text-[#EAECEF] font-mono hidden sm:block">
                ${{ market.volume }}
              </div>
              
              <div class="text-right text-[#EAECEF] font-mono hidden md:block">
                ${{ market.marketCap }}
              </div>
              
              <div class="h-12 w-full pr-4 opacity-70 group-hover:opacity-100 transition-opacity hidden lg:block pointer-events-none">
                <!-- Using MiniSparkline to represent the 7D trend -->
                <MiniSparkline :data="[10, 15, 8, 20, 12, 25, 18]" :color="market.change >= 0 ? '#0ecb81' : '#f6465d'" />
              </div>
            </div>
            
            <div v-if="filteredMarkets.length === 0" class="p-12 text-center text-[#848e9c]">
              No markets found matching "{{ searchQuery }}".
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');

.font-sans {
  font-family: 'Inter', sans-serif;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
