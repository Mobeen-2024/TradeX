<script setup lang="ts">
import { Trophy, TrendingUp, Users, Crown } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const leaders = [
  { rank: 1, name: 'CryptoWhale', pnl: '+452.12%', winRate: '88%', volume: '$12.4M', color: '#F0B90B' },
  { rank: 2, name: 'MoonShot', pnl: '+382.45%', winRate: '82%', volume: '$8.2M', color: '#EAECEF' },
  { rank: 3, name: 'SatoshiN', pnl: '+312.88%', winRate: '79%', volume: '$15.1M', color: '#CD7F32' },
  { rank: 4, name: 'TradeMaster', pnl: '+245.15%', winRate: '75%', volume: '$5.6M', color: '#848e9c' },
  { rank: 5, name: 'BullRun', pnl: '+198.33%', winRate: '72%', volume: '$4.9M', color: '#848e9c' },
];
</script>

<template>
  <div class="flex flex-col gap-6 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-black text-white tracking-tight">Leader Board</h2>
        <p class="text-xs text-[#848e9c] font-medium uppercase tracking-[0.2em] mt-1 opacity-60">Top performing traders this month</p>
      </div>
      <div class="flex gap-4">
         <div class="flex items-center gap-2 bg-[#F0B90B]/10 px-4 py-2 rounded-xl border border-[#F0B90B]/20">
           <Users class="w-4 h-4 text-[#F0B90B]" />
           <span class="text-xs font-bold text-[#F0B90B]">12,450 Active Traders</span>
         </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-for="i in 3" :key="i" class="bg-white/5 backdrop-blur-2xl border border-white/5 p-6 rounded-[24px] relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 w-20 h-20 opacity-10 blur-2xl rounded-full" :style="`background-color: ${leaders[i-1].color}`"></div>
        <div class="flex flex-col items-center text-center gap-3">
          <div class="relative">
            <div class="w-16 h-16 rounded-2xl bg-[#0b0e11] border border-white/10 flex items-center justify-center relative z-10">
              <Crown v-if="i === 1" class="w-8 h-8 text-[#F0B90B]" />
              <Trophy v-else class="w-8 h-8" :style="`color: ${leaders[i-1].color}`" />
            </div>
            <div class="absolute -bottom-2 -right-2 w-7 h-7 bg-[#0b0e11] border border-white/10 rounded-full flex items-center justify-center font-black text-xs text-white z-20">
              {{ i }}
            </div>
          </div>
          <div>
            <div class="font-black text-white text-lg">{{ leaders[i-1].name }}</div>
            <div class="text-[10px] text-[#848e9c] font-bold uppercase tracking-widest mt-0.5">Professional Trader</div>
          </div>
          <div class="w-full h-[1px] bg-white/5 my-2"></div>
          <div class="grid grid-cols-2 w-full gap-2">
            <div class="text-left">
              <div class="text-[9px] text-[#848e9c] font-bold uppercase">PnL</div>
              <div class="text-sm font-mono font-bold text-[#0ecb81]">{{ leaders[i-1].pnl }}</div>
            </div>
            <div class="text-right">
              <div class="text-[9px] text-[#848e9c] font-bold uppercase">Win Rate</div>
              <div class="text-sm font-mono font-bold text-white">{{ leaders[i-1].winRate }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[24px] overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-white/5 text-[10px] text-[#848e9c] font-bold uppercase tracking-wider">
          <tr>
            <th class="px-6 py-4">Rank</th>
            <th class="px-6 py-4">Trader</th>
            <th class="px-6 py-4">PnL (Monthly)</th>
            <th class="px-6 py-4">Win Rate</th>
            <th class="px-6 py-4">Trading Volume</th>
            <th class="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr v-for="leader in leaders" :key="leader.rank" class="hover:bg-white/[0.02] transition-colors group">
            <td class="px-6 py-4 font-mono font-bold text-white">{{ leader.rank }}</td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-[#0b0e11] border border-white/10 flex items-center justify-center font-bold text-xs">
                  {{ leader.name.charAt(0) }}
                </div>
                <span class="font-bold text-white">{{ leader.name }}</span>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="font-mono font-bold text-[#0ecb81]">{{ leader.pnl }}</span>
            </td>
            <td class="px-6 py-4 font-mono text-[#EAECEF]">{{ leader.winRate }}</td>
            <td class="px-6 py-4 font-mono text-[#848e9c]">{{ leader.volume }}</td>
            <td class="px-6 py-4 text-right">
              <button class="px-4 py-1.5 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-[#0b0e11] text-[11px] font-black uppercase transition-all active:scale-95">Follow</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
