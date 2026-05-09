<script setup lang="ts">
import {
  Search,
  Bell,
  Globe,
  Settings,
  Menu,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-vue-next";
import { cn } from "../lib/utils";
import { currentPrice, previousPrice, marketData } from "../store/tradeStore";
import {
  activeNotifications,
  notificationHistory,
  markAsRead,
  clearNotifications,
} from "../store/alertStore";
import CoinSelector from "./CoinSelector.vue";
import SearchModal from "./SearchModal.vue";
import NotificationHistoryModal from "./NotificationHistoryModal.vue";
import MarketTicker from "./MarketTicker.vue";
import SystemStatusBar from "./SystemStatusBar.vue";
import { ref, onMounted, onUnmounted, computed } from "vue";

const showNotifications = ref(false);
const isSearchOpen = ref(false);
const isNotifHistoryOpen = ref(false);
const currentTime = ref("");
let timer: any;

// Status state mapping mock
const connectionStatus = ref<"connecting" | "connected" | "error">("connected");

const formatNumber = (num: string | number) => {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return num;
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const closeDropdowns = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest(".nav-notif-container")) showNotifications.value = false;
};

onMounted(() => {
  const updateTime = () => {
    const d = new Date();
    currentTime.value = `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}:${d.getUTCSeconds().toString().padStart(2, "0")} UTC`;
  };
  updateTime();
  timer = setInterval(updateTime, 1000);
  window.addEventListener("mousedown", closeDropdowns);

  // Simulate startup connection
  connectionStatus.value = "connecting";
  setTimeout(() => (connectionStatus.value = "connected"), 1500);
});

onUnmounted(() => {
  clearInterval(timer);
  window.removeEventListener("mousedown", closeDropdowns);
});

defineProps<{ title?: string }>();
const emit = defineEmits(["open-settings", "toggle-sidebar"]);

const hasNotifications = computed(() => activeNotifications.value.length > 0);
</script>

<template>
  <header
    class="h-[76px] border-b border-white/[0.05] flex items-center justify-between px-4 lg:px-6 shrink-0 z-40 bg-[#0a0c10]/80 backdrop-blur-3xl text-white/70 shadow-[0_4px_40px_rgba(0,0,0,0.6)] select-none relative overflow-visible"
  >
    <!-- Subtle top ambient light -->
    <div
      class="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#F0B90B]/30 to-transparent"
    ></div>

    <!-- Left Section -->
    <div class="flex items-center gap-4 md:gap-6 min-w-0 flex-1 h-full">
      <!-- Mobile Menu Button -->
      <button
        @click="emit('toggle-sidebar')"
        class="md:hidden p-2.5 bg-white/[0.02] hover:bg-white/[0.08] active:scale-95 border border-white/[0.05] rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B90B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e11]"
        aria-label="Toggle Menu"
      >
        <Menu class="w-5 h-5 text-white/80" />
      </button>

      <!-- 1. Trading Pair Selector -->
      <div class="shrink-0 relative z-50 flex items-center gap-3">
        <CoinSelector />
      </div>

      <!-- 2. Live Price Display w/ Loading State -->
      <div
        class="hidden sm:flex flex-col justify-center shrink-0 min-w-[120px] px-4 border-l border-white/[0.05]"
      >
        <div
          v-if="connectionStatus === 'connecting'"
          class="h-6 w-24 bg-white/[0.05] animate-pulse rounded mb-1"
        ></div>
        <span
          v-else
          :class="[
            'font-mono font-black text-xl xl:text-2xl tracking-tight transition-colors duration-500',
            currentPrice >= previousPrice
              ? 'text-[#0ECB81] drop-shadow-[0_0_12px_rgba(14,203,129,0.4)]'
              : 'text-[#f6465d] drop-shadow-[0_0_12px_rgba(246,70,93,0.4)]',
          ]"
        >
          {{
            currentPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          }}
        </span>

        <div class="flex items-center gap-1.5 mt-0.5">
          <span
            v-if="connectionStatus === 'connected'"
            class="relative flex h-2 w-2"
          >
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ECB81] opacity-75"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2 bg-[#0ECB81]"
            ></span>
          </span>
          <AlertCircle
            v-else-if="connectionStatus === 'error'"
            class="w-2.5 h-2.5 text-[#f6465d]"
          />
          <Activity v-else class="w-2.5 h-2.5 text-[#F0B90B] animate-spin" />

          <span
            :class="
              cn(
                'text-[9px] font-mono flex items-center gap-1.5 uppercase tracking-widest font-black',
                connectionStatus === 'connected'
                  ? 'text-[#0ECB81]/80'
                  : connectionStatus === 'connecting'
                    ? 'text-[#F0B90B]/80'
                    : 'text-[#f6465d]/80',
              )
            "
          >
            {{
              connectionStatus === "connected"
                ? "Live Stream"
                : connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected"
            }}
          </span>
        </div>
      </div>

      <!-- 3. Market Statistics (Desktop Only) -->
      <div class="hidden xl:flex items-center gap-3 pl-6 h-full py-4">
        <div
          class="flex flex-col justify-center bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.15] px-4 py-1.5 rounded-xl transition-all group relative cursor-help"
        >
          <div
            class="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#0a0c10] border border-white/10 px-3 py-1.5 rounded-lg text-[10px] text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl"
          >
            Rolling 24 Hour Change percentage
          </div>
          <span
            class="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-0.5"
            >24h Change</span
          >
          <span
            v-if="marketData.change24h"
            :class="[
              'text-[13px] font-mono font-black transition-all drop-shadow-sm',
              marketData.change24h.startsWith('+')
                ? 'text-[#0ECB81]'
                : 'text-[#f6465d]',
            ]"
          >
            {{ marketData.change24h }}
          </span>
          <span v-else class="text-[13px] font-mono font-black text-white/20"
            >--</span
          >
        </div>

        <div
          class="flex flex-col justify-center bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.15] px-4 py-1.5 rounded-xl transition-all cursor-default"
        >
          <span
            class="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-0.5"
            >24h High</span
          >
          <span class="text-[13px] font-mono font-black text-white/90">{{
            formatNumber(currentPrice * 1.05)
          }}</span>
        </div>

        <div
          class="flex flex-col justify-center bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.15] px-4 py-1.5 rounded-xl transition-all cursor-default"
        >
          <span
            class="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-0.5"
            >24h Low</span
          >
          <span class="text-[13px] font-mono font-black text-white/90">{{
            formatNumber(currentPrice * 0.95)
          }}</span>
        </div>

        <div
          class="flex flex-col justify-center bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.15] px-4 py-1.5 rounded-xl transition-all cursor-default relative group"
        >
          <div
            class="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#0a0c10] border border-white/10 px-3 py-1.5 rounded-lg text-[10px] text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl"
          >
            Total Traded Volume in USDT
          </div>
          <span
            class="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-0.5"
            >24h Vol (USDT)</span
          >
          <span class="text-[13px] font-mono font-black text-white/90">{{
            marketData.volUsdt24h || "--"
          }}</span>
        </div>
      </div>
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-3 lg:gap-4 ml-auto h-full py-4">
      <MarketTicker
        class="hidden 2xl:flex scale-90 origin-right transition-all"
      />
      <SystemStatusBar class="hidden 3xl:flex" />

      <!-- Clock -->
      <div
        class="hidden md:flex items-center gap-2 text-white/50 text-[11px] font-mono font-black tracking-widest bg-black/40 px-3 py-2 rounded-xl border border-white/[0.05] shadow-inner"
      >
        <Clock class="w-3.5 h-3.5 text-white/30" />
        {{ currentTime }}
      </div>

      <div class="h-8 w-px bg-white/[0.05] hidden md:block mx-1"></div>

      <!-- Quick Action Icons -->
      <div class="flex items-center gap-2">
        <!-- Search -->
        <button
          @click="isSearchOpen = true"
          class="group flex items-center justify-center w-10 h-10 bg-white/[0.02] hover:bg-white/[0.1] hover:text-[#F0B90B] border border-white/[0.05] hover:border-[#F0B90B]/30 rounded-xl cursor-pointer transition-all active:scale-95 focus:outline-none focus-[&:not(:focus-visible)]:ring-0 focus-visible:ring-2 focus-visible:ring-[#F0B90B]"
          title="Search (Ctrl+K)"
          aria-label="Search"
        >
          <Search class="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>

        <!-- Notifications -->
        <div
          class="nav-notif-container flex items-center justify-center relative"
        >
          <button
            @click="showNotifications = !showNotifications"
            class="group w-10 h-10 flex items-center justify-center bg-white/[0.02] hover:bg-white/[0.1] hover:text-[#F0B90B] border border-white/[0.05] hover:border-[#F0B90B]/30 rounded-xl cursor-pointer transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#F0B90B] focus:ring-offset-2 focus:ring-offset-[#0b0e11]"
            aria-label="Notifications"
          >
            <Bell
              class="w-4 h-4 transition-transform group-hover:scale-110 group-hover:animate-wiggle"
            />
            <div
              v-if="hasNotifications"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#f0b90b] rounded-full border-2 border-[#0a0c10] flex items-center justify-center text-[9px] font-black text-black px-1 shadow-[0_0_10px_rgba(240,185,11,0.5)] z-10"
            >
              {{
                activeNotifications.length > 9
                  ? "9+"
                  : activeNotifications.length
              }}
            </div>
          </button>

          <!-- Notification Dropdown Menu -->
          <Transition
            enter-active-class="transition duration-300 ease-out cubic-bezier(0.16, 1, 0.3, 1)"
            enter-from-class="opacity-0 translate-y-4 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-4 scale-95"
          >
            <div
              v-if="showNotifications"
              class="absolute top-[calc(100%+16px)] right-0 w-[340px] md:w-[420px] bg-[#0f1217]/95 backdrop-blur-3xl border border-white/[0.08] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.8)] overflow-hidden z-[100] flex flex-col"
            >
              <!-- Glossy highlight -->
              <div
                class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
              ></div>

              <div
                class="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.02] relative"
              >
                <div class="flex items-center gap-2">
                  <Bell class="w-4 h-4 text-[#F0B90B]" />
                  <span
                    class="text-xs font-black text-white uppercase tracking-widest"
                    >System Alerts</span
                  >
                </div>
                <button
                  v-if="hasNotifications"
                  @click="clearNotifications"
                  class="text-[10px] text-white/40 hover:text-[#f0b90b] font-black uppercase tracking-widest transition-colors px-2 py-1 hover:bg-white/5 rounded-lg"
                >
                  Clear All
                </button>
              </div>

              <div class="max-h-[420px] overflow-y-auto no-scrollbar relative">
                <!-- Notifications List -->
                <div
                  v-if="notificationHistory.length > 0"
                  class="flex flex-col"
                >
                  <div
                    v-for="notif in notificationHistory"
                    :key="notif.id"
                    class="px-5 py-4 border-b border-white/[0.02] hover:bg-white/[0.04] transition-all relative group/item cursor-pointer"
                    @click="markAsRead(notif.id)"
                  >
                    <div class="flex items-start gap-4">
                      <div
                        :class="
                          cn(
                            'w-2 h-2 rounded-full mt-1.5 shrink-0 transition-colors duration-500',
                            notif.read
                              ? 'bg-white/10'
                              : 'bg-[#f0b90b] shadow-[0_0_12px_rgba(240,185,11,0.8)]',
                          )
                        "
                      ></div>
                      <div class="flex-1 min-w-0">
                        <div
                          class="flex items-center justify-between gap-2 mb-1.5"
                        >
                          <span
                            :class="
                              cn(
                                'text-[12px] font-black tracking-wide',
                                notif.read
                                  ? 'text-white/40'
                                  : 'text-white/90 group-hover/item:text-[#F0B90B] transition-colors',
                              )
                            "
                            >{{ notif.title }}</span
                          >
                          <span
                            class="text-[9px] text-white/30 font-mono font-bold tracking-widest"
                            >{{
                              new Date(notif.time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            }}</span
                          >
                        </div>
                        <p
                          :class="
                            cn(
                              'text-[11px] leading-relaxed font-medium',
                              notif.read ? 'text-white/30' : 'text-white/60',
                            )
                          "
                        >
                          {{ notif.message }}
                        </p>
                      </div>
                    </div>

                    <!-- Hover indication highlight -->
                    <div
                      class="absolute left-0 top-0 bottom-0 w-[2px] bg-[#F0B90B] scale-y-0 group-hover/item:scale-y-100 transition-transform origin-center"
                    ></div>
                  </div>
                </div>

                <!-- Empty State -->
                <div
                  v-else
                  class="py-20 flex flex-col items-center justify-center text-center px-6"
                >
                  <div
                    class="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5 relative group"
                  >
                    <div
                      class="absolute inset-0 bg-[#F0B90B]/5 rounded-full blur-xl scale-0 group-hover:scale-100 transition-transform"
                    ></div>
                    <CheckCircle2 class="w-6 h-6 text-white/20" />
                  </div>
                  <h4
                    class="text-[13px] text-white/80 font-black uppercase tracking-widest mb-1.5"
                  >
                    No Active Alerts
                  </h4>
                  <p
                    class="text-[11px] text-white/40 font-medium tracking-wide"
                  >
                    Your trading environment is optimal and quiet.
                  </p>
                </div>
              </div>

              <div
                class="p-3 bg-black/40 border-t border-white/[0.05] relative z-10"
              >
                <button
                  @click="
                    isNotifHistoryOpen = true;
                    showNotifications = false;
                  "
                  class="w-full py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-black text-white/60 hover:text-[#f0b90b] uppercase tracking-widest transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B90B]"
                >
                  View All Logs
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Settings -->
        <button
          @click="emit('open-settings')"
          class="group flex items-center justify-center w-10 h-10 bg-white/[0.02] hover:bg-white/[0.1] hover:text-[#F0B90B] border border-white/[0.05] hover:border-[#F0B90B]/30 rounded-xl cursor-pointer transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#F0B90B]"
          title="Environment Architecture"
          aria-label="Settings"
        >
          <Settings
            class="w-4 h-4 transition-transform group-hover:rotate-90 group-hover:scale-110 duration-500"
          />
        </button>
      </div>
    </div>

    <!-- Modals -->
    <SearchModal :isOpen="isSearchOpen" @close="isSearchOpen = false" />
    <NotificationHistoryModal
      :isOpen="isNotifHistoryOpen"
      @close="isNotifHistoryOpen = false"
    />
  </header>
</template>

<style scoped>
/* Optional custom utility animations for Navbar */
@keyframes wiggle {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-10deg);
  }
  50% {
    transform: rotate(10deg);
  }
  75% {
    transform: rotate(-5deg);
  }
}
.animate-wiggle {
  animation: wiggle 0.4s ease-in-out;
}
</style>
