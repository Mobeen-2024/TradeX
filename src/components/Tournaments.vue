<script setup lang="ts">
import { Trophy, Clock, Target, Gift, ChevronRight } from 'lucide-vue-next';

const tournaments = [
  { id: 1, title: 'Global Futures Masters', prizePool: '$500,000', participants: '4,200', timeLeft: '2d 14h', status: 'Active', image: 'bg-gradient-to-br from-[#F0B90B] to-[#917107]' },
  { id: 2, title: 'Altcoin Season Sprint', prizePool: '$100,000', participants: '1,850', timeLeft: '12h 45m', status: 'Active', image: 'bg-gradient-to-br from-[#0ecb81] to-[#087a4d]' },
  { id: 3, title: 'New Year Trading Cup', prizePool: '$250,000', participants: '3,120', timeLeft: 'Starts in 4d', status: 'Upcoming', image: 'bg-gradient-to-br from-[#627EEA] to-[#3a4b8c]' },
];
</script>

<template>
  <div class="flex flex-col gap-6 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-black text-white tracking-tight">Tournaments</h2>
        <p class="text-xs text-[#848e9c] font-medium uppercase tracking-[0.2em] mt-1 opacity-60">Compete with the best and win massive prizes</p>
      </div>
      <button class="flex items-center gap-2 text-xs font-black text-[#F0B90B] uppercase tracking-widest hover:underline">
        Tournament Rules <ChevronRight class="w-4 h-4" />
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div v-for="t in tournaments" :key="t.id" class="bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[32px] overflow-hidden group hover:border-[#F0B90B]/30 transition-all duration-500">
        <div class="flex flex-col sm:flex-row h-full">
          <div :class="['sm:w-48 h-48 sm:h-auto shrink-0 relative overflow-hidden', t.image]">
            <Trophy class="absolute inset-0 m-auto w-20 h-20 text-white/20 -rotate-12 group-hover:scale-110 transition-transform duration-700" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <span class="px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[9px] font-black text-white uppercase tracking-widest border border-white/10">
                {{ t.status }}
              </span>
            </div>
          </div>
          
          <div class="flex-1 p-6 flex flex-col justify-between">
            <div>
              <h3 class="text-xl font-black text-white leading-tight mb-2">{{ t.title }}</h3>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <div class="text-[10px] text-[#848e9c] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Gift class="w-3 h-3" /> Prize Pool
                  </div>
                  <div class="text-lg font-mono font-black text-[#F0B90B]">{{ t.prizePool }}</div>
                </div>
                <div>
                  <div class="text-[10px] text-[#848e9c] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock class="w-3 h-3" /> Time Left
                  </div>
                  <div class="text-lg font-mono font-black text-white">{{ t.timeLeft }}</div>
                </div>
              </div>
            </div>

            <div class="mt-6 flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-[10px] text-[#848e9c] font-bold uppercase">{{ t.participants }} joined</span>
                <div class="flex -space-x-2 mt-1">
                  <div v-for="i in 4" :key="i" class="w-6 h-6 rounded-full border-2 border-[#0b0e11] bg-[#2b3139] flex items-center justify-center text-[8px] font-bold text-white">
                    {{ String.fromCharCode(64 + i) }}
                  </div>
                  <div class="w-6 h-6 rounded-full border-2 border-[#0b0e11] bg-[#1e2329] flex items-center justify-center text-[8px] font-bold text-[#848e9c]">
                    +
                  </div>
                </div>
              </div>
              <button :class="cn('px-6 py-2.5 rounded-xl font-black text-xs uppercase transition-all active:scale-95 shadow-lg', t.status === 'Active' ? 'bg-[#F0B90B] text-[#0b0e11] shadow-[#F0B90B]/10 hover:bg-[#FCD535]' : 'bg-white/10 text-white cursor-not-allowed')">
                {{ t.status === 'Active' ? 'Join Now' : 'Starts Soon' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Section -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
       <div class="bg-white/5 p-6 rounded-[24px] border border-white/5 flex flex-col gap-1">
         <span class="text-[10px] text-[#848e9c] font-bold uppercase">Total Prize Paid</span>
         <span class="text-2xl font-mono font-black text-white">$1,240,500</span>
       </div>
       <div class="bg-white/5 p-6 rounded-[24px] border border-white/5 flex flex-col gap-1">
         <span class="text-[10px] text-[#848e9c] font-bold uppercase">Total Participants</span>
         <span class="text-2xl font-mono font-black text-white">45,820</span>
       </div>
       <div class="bg-white/5 p-6 rounded-[24px] border border-white/5 flex flex-col gap-1">
         <span class="text-[10px] text-[#848e9c] font-bold uppercase">Average ROI</span>
         <span class="text-2xl font-mono font-black text-[#0ecb81]">+24.5%</span>
       </div>
    </div>
  </div>
</template>
