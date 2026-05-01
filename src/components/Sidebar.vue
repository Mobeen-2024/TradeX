<script setup lang="ts">
import { Activity, BarChart2, Briefcase, Crown, HeadphonesIcon, Settings, Signal, Trophy, Wallet } from 'lucide-vue-next';
import { cn } from '../lib/utils';

defineProps<{ activeItem: string }>();
defineEmits<{ (e: 'update:active-item', value: string): void }>();

const navItems = [
  { icon: Activity, label: 'Trade' },
  { icon: Briefcase, label: 'Market' },
  { icon: Trophy, label: 'Tournaments' },
  { icon: BarChart2, label: 'Analytics' },
  { icon: Wallet, label: 'Transactions' },
  { icon: Crown, label: 'Leader Board' },
  { icon: Signal, label: 'Trading signals' },
];
</script>

<template>
  <div :class="$attrs.class">
    <!-- Desktop Sidebar -->
    <div class="hidden md:block w-[64px] shrink-0 h-screen relative z-50">
      <div class="absolute left-0 top-0 h-screen w-[64px] hover:w-[240px] bg-[#161a1e] border-r border-[#2b3139] flex flex-col justify-between py-4 select-none transition-all duration-300 ease-in-out overflow-hidden group hover:shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        
        <div class="flex flex-col gap-6 w-[240px]">
          <!-- Header -->
          <div class="h-[60px] flex items-center px-4 shrink-0">
            <div class="flex items-center gap-4 text-[#F0B90B]">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                 <svg class="w-6 h-6 text-[#F0B90B]" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 0L19.227 3.227L16 6.454L12.773 3.227L16 0ZM6.454 9.546L9.681 12.773L6.454 16L3.227 12.773L6.454 9.546ZM25.546 9.546L28.773 12.773L25.546 16L22.319 12.773L25.546 9.546ZM16 11.233L20.767 16L16 20.767L11.233 16L16 11.233ZM3.227 19.227L6.454 22.454L9.681 19.227L6.454 16L3.227 19.227ZM28.773 19.227L25.546 22.454L22.319 19.227L25.546 16L28.773 19.227ZM16 32L12.773 28.773L16 25.546L19.227 28.773L16 32Z" />
                </svg>
              </div>
              <span class="font-bold text-xl tracking-wide text-[#EAECEF] opacity-0 group-hover:opacity-100 transition-opacity duration-300">TradeX</span>
            </div>
          </div>

          <!-- Nav Links -->
          <nav class="flex flex-col px-2 gap-1 shrink-0">
            <button
              v-for="item in navItems"
              :key="item.label"
              @click="$emit('update:active-item', item.label)"
              :class="cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left font-medium outline-none h-[44px]',
                activeItem === item.label 
                  ? 'bg-[#2b3139] text-[#EAECEF]' 
                  : 'text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139]/50'
              )"
            >
              <component :is="item.icon" :class="cn('w-5 h-5 shrink-0', activeItem === item.label ? 'text-[#F0B90B]' : 'text-[#848e9c] group-hover:text-[#EAECEF]')" />
              <span class="flex-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap text-sm">{{ item.label }}</span>
            </button>
          </nav>
        </div>

        <div class="flex flex-col gap-4 px-2 w-[240px]">
          <!-- Bottom Nav -->
          <div class="flex flex-col gap-1">
            <button class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left font-medium outline-none h-[44px] text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139]/50">
              <HeadphonesIcon class="w-5 h-5 shrink-0" />
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap text-sm">Support</span>
            </button>
            <button class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left font-medium outline-none h-[44px] text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139]/50">
              <Settings class="w-5 h-5 shrink-0" />
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap text-sm">Settings</span>
            </button>
          </div>

          <!-- Promo Card -->
          <div class="bg-[#2b3139]/30 border border-[#2b3139] rounded-xl p-[10px] relative overflow-hidden cursor-pointer hover:bg-[#2b3139]/50 transition-colors h-[44px] group-hover:h-[130px]">
             <div class="flex items-center gap-3 group-hover:flex-col group-hover:items-center transition-all duration-300 h-full">
               <div class="w-6 h-6 shrink-0 bg-[#F0B90B] rounded-full flex items-center justify-center group-hover:w-10 group-hover:h-10 transition-all duration-300 group-hover:mt-1">
                 <Crown class="w-3.5 h-3.5 text-[#181a20] group-hover:w-5 group-hover:h-5 transition-all duration-300" />
               </div>
               <div class="flex-1 text-left group-hover:text-center opacity-0 group-hover:opacity-100 w-0 group-hover:w-full overflow-hidden transition-all duration-300 group-hover:h-auto">
                  <h4 class="text-[#EAECEF] font-semibold text-xs mb-0.5 whitespace-nowrap">King of Asia</h4>
                  <div class="text-[11px] text-[#848e9c] leading-tight whitespace-nowrap">
                    Prize pool: <span class="text-[#EAECEF] font-medium">100k $</span>
                  </div>
                  <button class="mt-2 w-full py-1.5 rounded bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#181a20] font-bold text-[11px] transition-colors whitespace-nowrap">
                    Join Now
                  </button>
               </div>
             </div>
          </div>

          <!-- Attribution -->
          <div class="mt-2 text-[#848e9c] text-[10px] text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            Designed & Built by MOBEEN
          </div>
        </div>

      </div>
    </div>

    <!-- Mobile Bottom Bar -->
    <div class="md:hidden w-full shrink-0 bg-[#161a1e] border-t border-[#2b3139] flex flex-row items-center justify-around px-2 pb-safe" style="padding-bottom: env(safe-area-inset-bottom);">
      <button
        v-for="item in navItems.slice(0, 5)"
        :key="item.label"
        @click="$emit('update:active-item', item.label)"
        class="flex flex-col items-center justify-center gap-1 flex-1 h-[60px]"
        :class="activeItem === item.label ? 'text-[#F0B90B]' : 'text-[#848e9c]'"
      >
        <component :is="item.icon" class="w-5 h-5 shrink-0" />
        <span class="text-[9px] font-medium truncate w-full text-center px-1">{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>
