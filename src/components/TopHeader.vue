<script setup lang="ts">
import {
  ChevronDown,
  Settings,
  PlayCircle,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Bell,
  User,
  Globe,
  Cpu,
  Wallet,
  Menu,
} from "lucide-vue-next";
import { cn } from "../lib/utils";
import {
  currentPrice,
  previousPrice,
  marketData,
  isLiveMode,
} from "../store/tradeStore";
import {
  activeNotifications,
  notificationHistory,
  markAsRead,
  clearNotifications,
} from "../store/alertStore";
import { isLoggedIn, userProfile, login, logout } from "../store/authStore";
import CoinSelector from "./CoinSelector.vue";
import CandleCountdown from "./CandleCountdown.vue";
import SearchModal from "./SearchModal.vue";
import NotificationHistoryModal from "./NotificationHistoryModal.vue";
import MarketTicker from "./MarketTicker.vue";
import SystemStatusBar from "./SystemStatusBar.vue";
import { ref, onMounted, onUnmounted, computed } from "vue";

const showNotifications = ref(false);
const showUserDropdown = ref(false);
const isSearchOpen = ref(false);
const isNotifHistoryOpen = ref(false);
const currentTime = ref("");
let timer: any;

const formatNumber = (num: string | number) => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if(isNaN(n)) return num;
  if(n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if(n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if(n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const pulsePrice = ref(false);
let lastUpdatePrice = currentPrice.value;

const closeDropdowns = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest(".nav-notif-container")) showNotifications.value = false;
  if (!target.closest(".nav-user-container")) showUserDropdown.value = false;
};

const handleDeposit = () => {
    // Mock deposit logic
    alert("Deposit Flow Triggered");
}

onMounted(() => {
  const updateTime = () => {
    const d = new Date();
    currentTime.value = `${d.getUTCHours().toString().padStart(2,'0')}:${d.getUTCMinutes().toString().padStart(2,'0')}:${d.getUTCSeconds().toString().padStart(2,'0')} UTC`;
  };
  updateTime();
  timer = setInterval(updateTime, 1000);
  window.addEventListener("mousedown", closeDropdowns);
});

onUnmounted(() => {
  clearInterval(timer);
  window.removeEventListener("mousedown", closeDropdowns);
});

defineProps<{ title?: string }>();
const emit = defineEmits(["open-settings", "toggle-sidebar"]);
</script>

<template>
  <header
    class="h-[64px] border-b border-[#2b3139] flex items-center justify-between pl-2 pr-4 shrink-0 z-40 bg-[#0b0e11]/90 backdrop-blur-3xl text-[#848e9c] shadow-[0_4px_30px_rgba(0,0,0,0.3)] select-none"
  >
    <!-- Left Section -->
    <div
      class="flex items-center gap-2 md:gap-5 min-w-0 flex-1 h-full"
    >
      <!-- Mobile Menu Button (Only needed if you want standalone logic, emit to parent) -->
      <button @click="emit('toggle-sidebar')" class="md:hidden p-2 hover:bg-[#2b3139] rounded-lg transition-colors">
        <Menu class="w-5 h-5 text-[#EAECEF]" />
      </button>

      <!-- 1. Trading Pair Selector (CoinSelector is self-contained) -->
      <div class="shrink-0 relative z-50">
        <CoinSelector />
      </div>

      <!-- 2. Live Price Display -->
      <div class="hidden sm:flex flex-col justify-center shrink-0 min-w-[90px]">
        <span
          :class="[
            'font-mono font-bold text-lg xl:text-xl tracking-tight transition-colors duration-300',
            currentPrice >= previousPrice
              ? 'text-[#0ECB81] drop-shadow-[0_0_8px_rgba(14,203,129,0.3)]'
              : 'text-[#f6465d] drop-shadow-[0_0_8px_rgba(246,70,93,0.3)]',
          ]"
        >
          {{
            currentPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          }}
        </span>
        <span class="text-[10px] font-mono text-[#848e9c] flex items-center gap-1.5 opacity-80 uppercase tracking-widest mt-[-2px]">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse"></span>
            Live
        </span>
      </div>

      <!-- 3. Market Statistics (Desktop Only) -->
      <div
        class="hidden xl:flex items-center gap-6 pl-6 border-l border-[#2b3139]/50 h-10"
      >
        <div class="flex flex-col justify-center cursor-pointer hover:bg-white/5 px-2 py-0.5 rounded transition-colors group">
          <span
            class="text-[9px] text-[#5e6673] flex items-center gap-1 uppercase tracking-widest font-black"
            >24h Change</span
          >
          <span
            v-if="marketData.change24h"
            :class="[
              'text-[12px] font-mono font-bold transition-all',
              marketData.change24h.startsWith('+')
                ? 'text-[#0ECB81]'
                : 'text-[#f6465d]',
            ]"
          >
            {{ marketData.change24h }}
          </span>
          <span v-else class="text-[12px] font-mono font-bold text-[#848e9c]">--</span>
        </div>

        <div class="flex flex-col justify-center cursor-pointer hover:bg-white/5 px-2 py-0.5 rounded transition-colors">
          <span class="text-[9px] text-[#5e6673] uppercase tracking-widest font-black">24h High</span>
          <span class="text-[12px] font-mono font-bold text-[#EAECEF]">{{ formatNumber(currentPrice * 1.05) }}</span>
        </div>
        
        <div class="flex flex-col justify-center cursor-pointer hover:bg-white/5 px-2 py-0.5 rounded transition-colors">
          <span class="text-[9px] text-[#5e6673] uppercase tracking-widest font-black">24h Low</span>
          <span class="text-[12px] font-mono font-bold text-[#EAECEF]">{{ formatNumber(currentPrice * 0.95) }}</span>
        </div>

        <div class="flex flex-col justify-center cursor-pointer hover:bg-white/5 px-2 py-0.5 rounded transition-colors">
          <span class="text-[9px] text-[#5e6673] uppercase tracking-widest font-black">24h Vol (USDT)</span>
          <span class="text-[12px] font-mono font-bold text-[#EAECEF]">{{ marketData.volUsdt24h || '--' }}</span>
        </div>
      </div>
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-2 md:gap-3 ml-auto">
      <MarketTicker class="hidden xl:flex" />
      <SystemStatusBar class="hidden 2xl:flex" />
      
      <!-- Clock -->
      <div class="hidden md:flex items-center text-[#848e9c] text-xs font-mono font-bold tracking-widest bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
        {{ currentTime }}
      </div>
      
      <!-- Quick Action Icons -->
      <div
        @click="isSearchOpen = true"
        class="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 hover:bg-[#2b3139] hover:text-white rounded-lg cursor-pointer transition-colors relative group"
        title="Search (Ctrl+K)"
      >
        <Search class="w-4 h-4 md:w-4 md:h-4" />
      </div>
      
      <!-- Notifications -->
      <div
        class="nav-notif-container flex items-center justify-center w-8 h-8 md:w-9 md:h-9 hover:bg-[#2b3139] hover:text-white rounded-lg cursor-pointer transition-colors relative"
      >
        <div @click="showNotifications = !showNotifications" class="relative w-full h-full flex items-center justify-center">
          <Bell class="w-4 h-4 md:w-4 md:h-4" />
          <div
            v-if="activeNotifications.length > 0"
            class="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-[#f0b90b] rounded-full border border-[#0b0e11] flex items-center justify-center text-[9px] font-black text-black px-0.5 animate-pulse"
          >
            {{ activeNotifications.length > 9 ? "9+" : activeNotifications.length }}
          </div>
        </div>

        <!-- Notification Dropdown -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-2 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-2 scale-95"
        >
            <div
              v-if="showNotifications"
              class="absolute top-[calc(100%+8px)] right-0 w-80 md:w-96 bg-[#161a1e]/95 backdrop-blur-3xl border border-[#2b3139] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100]"
            >
              <div
                class="px-5 py-4 border-b border-[#2b3139] flex items-center justify-between bg-[#1e2329]/50"
              >
                <span class="text-sm font-black text-[#EAECEF] uppercase tracking-widest font-mono">Notifications</span>
                <button
                  @click="clearNotifications"
                  class="text-[10px] text-[#848e9c] hover:text-[#f0b90b] font-bold uppercase tracking-wider transition-colors"
                >
                  Clear All
                </button>
              </div>

              <div class="max-h-[400px] overflow-y-auto no-scrollbar">
                <div
                  v-for="notif in notificationHistory"
                  :key="notif.id"
                  class="px-5 py-4 border-b border-[#2b3139]/50 hover:bg-[#2b3139]/40 transition-colors relative group/item cursor-pointer"
                  @click="markAsRead(notif.id)"
                >
                  <div class="flex items-start gap-4">
                    <div
                      :class="
                        cn(
                          'w-2 h-2 rounded-full mt-1.5 shrink-0 transition-colors duration-300',
                          notif.read
                            ? 'bg-[#474d57]'
                            : 'bg-[#f0b90b] shadow-[0_0_10px_rgba(240,185,11,0.5)]',
                        )
                      "
                    ></div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2 mb-1">
                        <span :class="cn('text-[12px] font-bold', notif.read ? 'text-[#848e9c]' : 'text-[#EAECEF]')">{{
                          notif.title
                        }}</span>
                        <span class="text-[10px] text-[#474d57] font-mono font-medium">{{
                          new Date(notif.time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        }}</span>
                      </div>
                      <p :class="cn('text-[11px] leading-relaxed', notif.read ? 'text-[#5e6673]' : 'text-[#848e9c]')">
                        {{ notif.message }}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  v-if="notificationHistory.length === 0"
                  class="py-16 flex flex-col items-center justify-center text-center px-6"
                >
                  <div class="w-12 h-12 rounded-full bg-[#1e2329] flex items-center justify-center mb-4">
                      <Bell class="w-5 h-5 text-[#474d57]" />
                  </div>
                  <p class="text-[11px] text-[#5e6673] font-bold uppercase tracking-widest">
                    You're all caught up
                  </p>
                </div>
              </div>

              <div class="px-5 py-3 bg-[#1e2329]/80 text-center border-t border-[#2b3139]">
                <button
                  @click="
                    isNotifHistoryOpen = true;
                    showNotifications = false;
                  "
                  class="text-[11px] font-bold text-[#f0b90b] hover:text-white uppercase tracking-widest transition-colors w-full"
                >
                  View All History
                </button>
              </div>
            </div>
        </Transition>
      </div>
      
      <div
        @click="emit('open-settings')"
        class="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 hover:bg-[#2b3139] hover:text-white rounded-lg cursor-pointer transition-colors"
        title="Settings"
      >
        <Settings class="w-4 h-4 md:w-4 md:h-4" />
      </div>

      <!-- Auth Section -->
      <div class="h-8 w-[1px] bg-[#2b3139] mx-1 md:mx-2 hidden sm:block"></div>

      <div v-if="!isLoggedIn" class="flex items-center gap-3 pl-1">
        <button
          @click="login"
          class="hidden sm:flex text-[13px] font-bold text-[#EAECEF] hover:text-[#F0B90B] transition-colors"
        >
          Log In
        </button>
        <button
          @click="login"
          class="text-[13px] font-black bg-[#F0B90B] text-[#0b0e11] px-5 py-2 rounded-lg hover:bg-[#FCD535] transition-all duration-300 shadow-[0_0_15px_rgba(240,185,11,0.2)] hover:shadow-[0_0_20px_rgba(240,185,11,0.4)] active:scale-95"
        >
          Sign Up
        </button>
      </div>

      <div v-else class="flex items-center gap-2 md:gap-3 pl-1 relative nav-user-container">
        <button 
           @click="handleDeposit"
           class="hidden lg:flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300"
        >
           <Wallet class="w-3.5 h-3.5 text-[#0ECB81]" />
           Deposit
        </button>

        <div
          @click="showUserDropdown = !showUserDropdown"
          class="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#f0b90b] text-[#0b0e11] hover:shadow-[0_0_15px_rgba(240,185,11,0.5)] cursor-pointer transition-all duration-300 group ring-2 ring-transparent hover:ring-[#f0b90b]/30"
        >
          <span class="font-black text-[13px]">{{ userProfile?.name.charAt(0) }}</span>
        </div>

        <!-- User Dropdown (Premium Style) -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-2 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-2 scale-95"
        >
            <div
              v-if="showUserDropdown"
              class="absolute top-[calc(100%+8px)] right-0 w-64 bg-[#161a1e]/95 backdrop-blur-3xl border border-[#2b3139] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100]"
            >
              <div class="px-5 py-4 border-b border-[#2b3139] bg-gradient-to-b from-white/[0.02] to-transparent">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-gradient-to-br from-[#f0b90b] to-[#c69700] flex items-center justify-center text-[#161a1e] font-black text-sm shadow-lg shadow-[#f0b90b]/20"
                  >
                    {{ userProfile?.name.charAt(0) }}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-[14px] font-bold text-[#EAECEF] truncate leading-tight">{{
                      userProfile?.name
                    }}</span>
                    <span class="text-[10px] text-[#f0b90b] font-bold tracking-widest uppercase mt-0.5"
                      >VIP {{ userProfile?.vipLevel }}</span
                    >
                  </div>
                </div>
              </div>

              <div class="p-2 flex flex-col gap-0.5">
                <button
                  class="w-full text-left px-4 py-2.5 text-[12px] font-bold text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139]/50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <User class="w-4 h-4" /> Dashboard
                </button>
                <button
                  class="w-full text-left px-4 py-2.5 text-[12px] font-bold text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139]/50 rounded-lg transition-colors flex items-center gap-2"
                >
                   <Wallet class="w-4 h-4" /> Balances
                </button>
                <div class="h-[1px] bg-[#2b3139] my-1 mx-2"></div>
                <button
                  @click="
                    logout();
                    showUserDropdown = false;
                  "
                  class="w-full text-left px-4 py-2.5 text-[12px] font-bold text-[#f6465d] hover:bg-[#f6465d]/10 rounded-lg transition-colors flex items-center gap-2"
                >
                  Log Out
                </button>
              </div>
            </div>
        </Transition>
      </div>
    </div>

    <SearchModal :isOpen="isSearchOpen" @close="isSearchOpen = false" />
    <NotificationHistoryModal
      :isOpen="isNotifHistoryOpen"
      @close="isNotifHistoryOpen = false"
    />
  </header>
</template>
