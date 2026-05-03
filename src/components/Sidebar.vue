<script setup lang="ts">
import { 
  Activity, 
  BarChart2, 
  Briefcase, 
  Crown, 
  HeadphonesIcon, 
  Settings, 
  Signal, 
  Trophy, 
  Wallet,
  Pin,
  PinOff
} from 'lucide-vue-next';
import { computed } from 'vue';
import { cn } from '../lib/utils';
import { useSidebar } from '../composables/useSidebar';
import { currentPrice, previousPrice, marketData } from '../store/tradeStore';
import SidebarWatchlist from './SidebarWatchlist.vue';
import SidebarProfile from './SidebarProfile.vue';
import SidebarPromo from './SidebarPromo.vue';
import MobileBottomBar from './MobileBottomBar.vue';

const props = defineProps<{ activeItem: string }>();
defineEmits<{ (e: 'update:active-item', value: string): void }>();

const { isPinned, isExpanded, togglePin, setHovered } = useSidebar();

const navItems = [
  { icon: Briefcase, label: 'Trade' },
  { icon: Activity, label: 'Market' },
  { icon: Trophy, label: 'Tournaments', badge: 3 },
  { icon: BarChart2, label: 'Analytics' },
  { icon: Wallet, label: 'Transactions' },
  { icon: Crown, label: 'Leader Board', badge: 12 },
  { icon: Signal, label: 'Trading signals', isNew: true },
];

const activeIndex = computed(() => navItems.findIndex(item => item.label === props.activeItem));
</script>

<template>
  <div :class="cn('relative flex flex-col', $attrs.class as string)">
    <!-- Desktop Sidebar Wrapper -->
    <div 
      class="hidden md:block shrink-0 h-screen transition-all duration-300 ease-in-out"
      :class="isExpanded ? 'w-[240px]' : 'w-[64px]'"
    >
      <!-- Actual Sidebar -->
      <div 
        @mouseenter="setHovered(true)"
        @mouseleave="setHovered(false)"
        class="fixed left-0 top-0 h-screen bg-[#0b0e11]/60 backdrop-blur-2xl border-r border-white/5 flex flex-col justify-between py-4 select-none transition-all duration-300 ease-in-out overflow-y-auto no-scrollbar z-50 shadow-[10px_0_30px_rgba(0,0,0,0.5)]"
        :class="isExpanded ? 'w-[240px]' : 'w-[64px]'"
        role="navigation"
        aria-label="Main Navigation"
      >
        
        <div class="flex flex-col gap-4 w-[240px]">
          <!-- Header -->
          <div class="h-[60px] flex items-center px-4 shrink-0 justify-between">
            <div class="flex items-center gap-4 text-[#F0B90B]">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group/logo">
                 <svg class="w-6 h-6 text-[#F0B90B] group-hover/logo:animate-[spin_4s_linear_infinite]" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 0L19.227 3.227L16 6.454L12.773 3.227L16 0ZM6.454 9.546L9.681 12.773L6.454 16L3.227 12.773L6.454 9.546ZM25.546 9.546L28.773 12.773L25.546 16L22.319 12.773L25.546 9.546ZM16 11.233L20.767 16L16 20.767L11.233 16L16 11.233ZM3.227 19.227L6.454 22.454L9.681 19.227L6.454 16L3.227 19.227ZM28.773 19.227L25.546 22.454L22.319 19.227L25.546 16L28.773 19.227ZM16 32L12.773 28.773L16 25.546L19.227 28.773L16 32Z" />
                </svg>
              </div>
              <div class="flex flex-col transition-opacity duration-300" :class="isExpanded ? 'opacity-100' : 'opacity-0'">
                <span class="font-bold text-xl tracking-wide text-[#EAECEF]">TradeX</span>
                <span class="text-[9px] text-[#0ECB81] font-bold flex items-center gap-1">
                  <span class="w-1.5 h-1.5 bg-[#0ECB81] rounded-full animate-pulse"></span>
                  BULLISH MARKET
                </span>
              </div>
            </div>
            
            <!-- Pin Toggle -->
            <button 
              v-if="isExpanded"
              @click="togglePin"
              class="p-1.5 rounded-md hover:bg-[#2b3139] text-[#848e9c] hover:text-[#EAECEF] transition-colors"
              :title="isPinned ? 'Unpin Sidebar' : 'Pin Sidebar'"
            >
              <PinOff v-if="isPinned" class="w-4 h-4" />
              <Pin v-else class="w-4 h-4" />
            </button>
          </div>

          <!-- Mini Ticker -->
          <div 
            class="px-4 transition-all duration-300 overflow-hidden"
            :class="isExpanded ? 'h-10 opacity-100' : 'h-0 opacity-0'"
          >
            <div class="flex items-center justify-between bg-[#2b3139]/30 rounded-lg px-2 py-1.5 border border-[#2b3139]">
              <span class="text-[10px] font-bold text-[#848e9c]">BTC/USDT</span>
              <span 
                class="text-xs font-mono font-bold transition-colors duration-300"
                :class="currentPrice >= previousPrice ? 'text-[#0ECB81]' : 'text-[#f6465d]'"
              >
                {{ currentPrice.toLocaleString() }}
              </span>
            </div>
          </div>

          <!-- Nav Links -->
          <nav class="flex flex-col px-2 gap-1 shrink-0 relative">
            <!-- Active Indicator -->
            <div 
              class="absolute left-0 w-1 bg-[#F0B90B] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-r"
              :style="{ 
                height: '32px', 
                top: `${activeIndex * 48 + 6}px`,
                opacity: activeIndex !== -1 ? 1 : 0
              }"
            ></div>

            <button
              v-for="(item, index) in navItems"
              :key="item.label"
              @click="$emit('update:active-item', item.label)"
              @keydown.up.prevent="index > 0 && (($event.target as HTMLElement).previousElementSibling as HTMLElement)?.focus()"
              @keydown.down.prevent="index < navItems.length - 1 && (($event.target as HTMLElement).nextElementSibling as HTMLElement)?.focus()"
              :class="cn(
                'group/item flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left font-medium outline-none h-[44px] relative',
                activeItem === item.label 
                  ? 'bg-[#2b3139] text-[#EAECEF]' 
                  : 'text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139]/50'
              )"
              :aria-current="activeItem === item.label ? 'page' : undefined"
            >
              <component :is="item.icon" :class="cn('w-5 h-5 shrink-0 transition-transform duration-200 group-hover/item:scale-110', activeItem === item.label ? 'text-[#F0B90B]' : 'text-[#848e9c]')" />
              
              <span 
                class="flex-1 transition-opacity duration-300 whitespace-nowrap text-sm"
                :class="isExpanded ? 'opacity-100' : 'opacity-0'"
              >
                {{ item.label }}
              </span>

              <!-- Badge -->
              <span v-if="item.badge || item.isNew" 
                class="shrink-0 transition-all duration-300"
                :class="[
                  isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0',
                  item.isNew ? 'bg-[#F0B90B] px-1.5 py-0.5 rounded text-[9px] text-[#161a1e] font-bold' : 'bg-[#2b3139] text-[#848e9c] px-1.5 py-0.5 rounded-full text-[10px]'
                ]"
              >
                {{ item.isNew ? 'NEW' : item.badge }}
              </span>

              <!-- Tooltip (Mobile/Collapsed) -->
              <div v-if="!isExpanded" class="absolute left-16 px-2 py-1 bg-[#2b3139] text-white text-xs rounded opacity-0 group-hover/item:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl">
                {{ item.label }}
              </div>
            </button>
          </nav>

          <!-- Watchlist -->
          <SidebarWatchlist 
            class="transition-opacity duration-300"
            :class="isExpanded ? 'opacity-100 h-auto visible' : 'opacity-0 h-0 invisible'"
          />
        </div>

        <div class="flex flex-col gap-4 px-2 w-[240px]">
          <!-- Bottom Nav -->
          <div class="flex flex-col gap-1">
            <button class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left font-medium outline-none h-[44px] text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139]/50">
              <HeadphonesIcon class="w-5 h-5 shrink-0" />
              <span 
                class="transition-opacity duration-300 whitespace-nowrap text-sm"
                :class="isExpanded ? 'opacity-100' : 'opacity-0'"
              >
                Support
              </span>
            </button>
            <button class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left font-medium outline-none h-[44px] text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139]/50">
              <Settings class="w-5 h-5 shrink-0" />
              <span 
                class="transition-opacity duration-300 whitespace-nowrap text-sm"
                :class="isExpanded ? 'opacity-100' : 'opacity-0'"
              >
                Settings
              </span>
            </button>
          </div>

          <!-- Promo Card -->
          <SidebarPromo :is-expanded="isExpanded" />

          <!-- Profile -->
          <SidebarProfile :is-expanded="isExpanded" />

          <!-- Attribution -->
          <div 
            class="pb-2 text-[#848e9c] text-[10px] text-center transition-opacity duration-300 whitespace-nowrap"
            :class="isExpanded ? 'opacity-100' : 'opacity-0'"
          >
            Designed & Built by MOBEEN
          </div>
        </div>

      </div>
    </div>

    <!-- Mobile Bottom Bar -->
    <MobileBottomBar 
      :nav-items="navItems" 
      :active-item="activeItem" 
      @update:active-item="$emit('update:active-item', $event)" 
    />
  </div>
</template>

