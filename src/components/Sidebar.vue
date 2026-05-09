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
import SidebarProfile from './SidebarProfile.vue';
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
  { icon: Signal, label: 'Signal' },
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
        class="fixed left-0 top-0 h-screen bg-[#0b0e11]/60 backdrop-blur-2xl border-r border-white/5 flex flex-col justify-between py-4 select-none transition-all duration-300 ease-in-out overflow-y-auto no-scrollbar z-50 shadow-[10px_0_30px_rgba(0,0,0,0.5)] gpu-glass"
        :class="isExpanded ? 'w-[240px]' : 'w-[64px]'"
        role="navigation"
        aria-label="Main Navigation"
      >
        
        <div class="flex flex-col gap-4 w-[240px]">
          <!-- Header -->
          <div class="h-[60px] flex items-center px-4 shrink-0 justify-between">
            <div class="flex items-center gap-4 text-[#F0B90B]">
              <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group/logo shadow-lg shadow-[#F0B90B]/5 hover:border-[#F0B90B]/30 transition-all duration-500">
                <svg class="w-7 h-7 text-[#F0B90B] group-hover/logo:animate-brain-pulse transition-all duration-700" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 2L19 5H13L16 2Z" fill="currentColor" />
                  <path d="M16 30L13 27H19L16 30Z" fill="currentColor" />
                  <path d="M2 16L5 13V19L2 16Z" fill="currentColor" />
                  <path d="M30 16L27 19V13L30 16Z" fill="currentColor" />
                  
                  <!-- Central Core -->
                  <rect x="11" y="11" width="10" height="10" rx="2" stroke="currentColor" stroke-width="2" />
                  <path d="M13 16L19 16M16 13L16 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                  
                  <!-- Circuit Paths -->
                  <path d="M16 5V11M16 21V27M5 16H11M21 16H27" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.5" />
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

          <!-- Nav Links -->
          <nav class="flex flex-col px-2 gap-1 shrink-0 relative">

            <button
              v-for="(item, index) in navItems"
              :key="item.label"
              @click="$emit('update:active-item', item.label)"
              @keydown.up.prevent="index > 0 && (($event.target as HTMLElement).previousElementSibling as HTMLElement)?.focus()"
              @keydown.down.prevent="index < navItems.length - 1 && (($event.target as HTMLElement).nextElementSibling as HTMLElement)?.focus()"
              :class="cn(
                'group/item flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-left font-bold outline-none h-[48px] relative overflow-hidden',
                activeItem === item.label 
                  ? 'bg-white/10 text-[#F0B90B] shadow-inner border border-white/5' 
                  : 'text-[#848e9c] hover:text-[#EAECEF] hover:bg-white/5'
              )"
              :aria-current="activeItem === item.label ? 'page' : undefined"
            >
              <div v-if="activeItem === item.label" class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#F0B90B] rounded-r-full shadow-[0_0_15px_rgba(240,185,11,0.5)]"></div>
              <component :is="item.icon" :class="cn('w-5 h-5 shrink-0 transition-all duration-300 group-hover/item:scale-110', activeItem === item.label ? 'text-[#F0B90B] drop-shadow-[0_0_8px_rgba(240,185,11,0.3)]' : 'text-[#848e9c] group-hover/item:text-[#EAECEF]')" />
              
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
              <div v-if="!isExpanded" class="absolute left-16 px-2 py-1 bg-[#2b3139] text-white text-xs rounded opacity-0 group-hover/item:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl gpu-overlay">
                {{ item.label }}
              </div>
            </button>
          </nav>
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

