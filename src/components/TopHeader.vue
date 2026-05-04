<script setup lang="ts">
import { ChevronDown, Settings, PlayCircle, ArrowUp, ArrowDown, Search, Download, Bell, User, Globe } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { currentPrice, previousPrice, marketData, isLiveMode } from '../store/tradeStore';
import { activeNotifications, notificationHistory, markAsRead, clearNotifications } from '../store/alertStore';
import { isLoggedIn, userProfile, login, logout } from '../store/authStore';
import SearchModal from './SearchModal.vue';
import NotificationHistoryModal from './NotificationHistoryModal.vue';
import MarketTicker from './MarketTicker.vue';
import { ref, onMounted, onUnmounted } from 'vue';

const showNotifications = ref(false);
const showUserDropdown = ref(false);
const isSearchOpen = ref(false);
const isNotifHistoryOpen = ref(false);
const currentTime = ref('');
let timer: any;

onMounted(() => {
  const updateTime = () => {
    const d = new Date();
    currentTime.value = d.toLocaleTimeString('en-US', { hour12: false });
  };
  updateTime();
  timer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});

defineProps<{ title?: string }>();
const emit = defineEmits(['open-settings']);
</script>

<template>
  <header class="h-[60px] border-b border-white/5 flex items-center justify-between pl-4 pr-4 shrink-0 z-10 bg-[#0b0e11]/60 backdrop-blur-2xl text-[#848e9c] gpu-glass">
    <!-- Left Section -->
    <div class="flex items-center h-full overflow-hidden">
      <!-- Removed Logo per user request -->


      <!-- Pair info -->
      <div class="flex items-center gap-4 lg:gap-6 h-full font-sans whitespace-nowrap">
        <div class="flex items-center gap-1 cursor-pointer hover:bg-[#2b3139] px-2 py-1 rounded transition-colors group">
          <h1 class="text-lg lg:text-xl font-bold text-[#EAECEF] flex items-center gap-1">BTC/USDT</h1>
          <ChevronDown class="w-4 h-4 text-[#848e9c] group-hover:text-white" />
          <div :class="cn('px-1.5 py-0.5 rounded text-[10px] font-bold ml-1 tracking-tighter uppercase', isLiveMode ? 'bg-[#0ecb81]/10 text-[#0ecb81] border border-[#0ecb81]/20' : 'bg-[#F0B90B]/10 text-[#F0B90B] border border-[#F0B90B]/20')">
            {{ isLiveMode ? 'Live' : 'Demo' }}
          </div>
        </div>

        <div class="flex flex-col justify-center">
          <div :class="[currentPrice >= previousPrice ? 'text-[#0ECB81]' : 'text-[#f6465d]', 'text-base font-semibold leading-tight flex items-center gap-1 transition-colors duration-300']">
            {{ currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            <ArrowUp v-if="currentPrice >= previousPrice" class="w-3 h-3" />
            <ArrowDown v-else class="w-3 h-3" />
          </div>
          <div class="text-xs text-[#EAECEF] hover:underline cursor-pointer transition-colors duration-300">
            ${{ currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </div>
        </div>

        <div class="hidden sm:flex flex-col justify-center">
          <div class="text-[11px] text-[#848e9c] mb-[1px]">24h Change</div>
          <div :class="[marketData.change24h.startsWith('+') ? 'text-[#0ECB81]' : 'text-[#f6465d]', 'text-[12px] font-medium']">
            {{ marketData.change24h }}
          </div>
        </div>

        <div class="hidden md:flex flex-col justify-center">
          <div class="text-[11px] text-[#848e9c] mb-[1px]">24h High</div>
          <div class="text-[12px] text-[#EAECEF] font-medium">{{ marketData.high24h }}</div>
        </div>

        <div class="hidden lg:flex flex-col justify-center">
          <div class="text-[11px] text-[#848e9c] mb-[1px]">24h Low</div>
          <div class="text-[12px] text-[#EAECEF] font-medium">{{ marketData.low24h }}</div>
        </div>

        <div class="hidden xl:flex flex-col justify-center">
          <div class="text-[11px] text-[#848e9c] mb-[1px]">24h Vol(BTC)</div>
          <div class="text-[12px] text-[#EAECEF] font-medium">{{ marketData.volBtc24h }}</div>
        </div>

        <div class="hidden xl:flex flex-col justify-center">
          <div class="text-[11px] text-[#848e9c] mb-[1px]">24h Vol(USDT)</div>
          <div class="text-[12px] text-[#EAECEF] font-medium">{{ marketData.volUsdt24h }}</div>
        </div>
      </div>
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-3 ml-auto">
      <MarketTicker />
      <div class="flex items-center text-[#848e9c] text-xs font-mono px-2">
        {{ currentTime }}
      </div>
      <div 
        @click="isSearchOpen = true"
        class="hidden sm:flex items-center gap-1 hover:bg-[#2b3139] px-2 py-1 rounded cursor-pointer transition-colors"
      >
        <Search class="w-4 h-4" />
      </div>
      <div class="hidden sm:flex items-center gap-1 hover:bg-[#2b3139] px-2 py-1 rounded cursor-pointer transition-colors">
        <Download class="w-4 h-4" />
      </div>
      <div class="flex items-center gap-1 hover:bg-[#2b3139] px-2 py-1 rounded cursor-pointer transition-colors relative group">
        <div @click="showNotifications = !showNotifications" class="relative">
          <Bell class="w-4 h-4" />
          <div v-if="activeNotifications.length > 0" class="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-[#f6465d] rounded-full border border-[#161a1e] flex items-center justify-center text-[8px] font-black text-white px-0.5">
            {{ activeNotifications.length > 9 ? '9+' : activeNotifications.length }}
          </div>
        </div>

        <!-- Notification Dropdown -->
        <div 
          v-if="showNotifications" 
          class="absolute top-full right-0 mt-2 w-80 bg-[#1e2329] border border-[#2b3139] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 gpu-overlay"
        >
          <div class="px-4 py-3 border-b border-[#2b3139] flex items-center justify-between">
            <span class="text-xs font-black text-[#EAECEF] uppercase tracking-widest">Notifications</span>
            <button @click="clearNotifications" class="text-[10px] text-[#848e9c] hover:text-white transition-colors">Clear All</button>
          </div>
          
          <div class="max-h-[400px] overflow-y-auto no-scrollbar">
            <div 
              v-for="notif in notificationHistory" 
              :key="notif.id"
              class="px-4 py-3 border-b border-[#2b3139]/50 hover:bg-[#2b3139] transition-colors relative group/item"
              @click="markAsRead(notif.id)"
            >
              <div class="flex items-start gap-3">
                <div :class="cn('w-2 h-2 rounded-full mt-1.5 shrink-0', notif.read ? 'bg-[#474d57]' : 'bg-[#F0B90B] shadow-[0_0_8px_#F0B90B]')"></div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2 mb-0.5">
                    <span class="text-[11px] font-bold text-[#EAECEF]">{{ notif.title }}</span>
                    <span class="text-[9px] text-[#474d57] font-mono">{{ new Date(notif.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
                  </div>
                  <p class="text-[10px] text-[#848e9c] leading-tight">{{ notif.message }}</p>
                </div>
              </div>
            </div>
            
            <div v-if="notificationHistory.length === 0" class="py-12 flex flex-col items-center justify-center text-center px-6">
              <Bell class="w-8 h-8 text-[#2b3139] mb-3" />
              <p class="text-xs text-[#474d57] font-bold uppercase tracking-widest">No notifications yet</p>
            </div>
          </div>
          
          <div class="px-4 py-2 bg-[#2b3139]/50 text-center">
            <button @click="isNotifHistoryOpen = true; showNotifications = false" class="text-[10px] font-bold text-[#F0B90B] hover:underline uppercase tracking-tighter">View All History</button>
          </div>
        </div>
      </div>
      <div 
        @click="emit('open-settings')"
        class="hidden md:flex items-center gap-1 hover:bg-[#2b3139] px-2 py-1 rounded cursor-pointer transition-colors"
      >
        <Settings class="w-4 h-4" />
      </div>
      <div class="hidden lg:flex items-center gap-1 hover:bg-[#2b3139] px-2 py-1 rounded cursor-pointer transition-colors">
        <Globe class="w-4 h-4" />
      </div>
      
      <div class="h-6 w-[1px] bg-dash-border mx-1"></div>
      
      <!-- Auth Section -->
      <div v-if="!isLoggedIn" class="flex items-center gap-3 ml-1">
        <button @click="login" class="text-xs font-bold text-[#EAECEF] hover:text-[#F0B90B] transition-all duration-300">Log In</button>
        <button class="text-xs font-black bg-[#F0B90B] text-[#0b0e11] px-4 py-1.5 rounded-lg hover:bg-[#FCD535] transition-all duration-300 shadow-lg shadow-[#F0B90B]/10 active:scale-95">Register</button>
      </div>
      
      <div v-else class="relative">
        <div 
          @click="showUserDropdown = !showUserDropdown"
          class="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#F0B90B]/30 cursor-pointer ml-1 transition-all duration-300 group"
        >
          <User class="w-4 h-4 text-[#EAECEF] group-hover:text-[#F0B90B]" />
        </div>

        <!-- User Dropdown -->
        <div 
          v-if="showUserDropdown" 
          class="absolute top-full right-0 mt-2 w-56 bg-[#1e2329] border border-[#2b3139] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 gpu-overlay"
        >
          <div class="px-4 py-3 border-b border-[#2b3139] bg-[#2b3139]/20">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-[#F0B90B] flex items-center justify-center text-[#1e2329] font-black text-xs">
                {{ userProfile?.name.charAt(0) }}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-bold text-[#EAECEF] truncate">{{ userProfile?.name }}</span>
                <span class="text-[10px] text-[#0ecb81] font-bold">VIP {{ userProfile?.vipLevel }}</span>
              </div>
            </div>
          </div>
          
          <div class="p-2 flex flex-col gap-1">
            <button class="w-full text-left px-3 py-2 text-[11px] font-bold text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139] rounded-lg transition-colors">My Profile</button>
            <button class="w-full text-left px-3 py-2 text-[11px] font-bold text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139] rounded-lg transition-colors">Security</button>
            <button class="w-full text-left px-3 py-2 text-[11px] font-bold text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139] rounded-lg transition-colors">Identification</button>
            <div class="h-[1px] bg-[#2b3139] my-1"></div>
            <button 
              @click="logout(); showUserDropdown = false"
              class="w-full text-left px-3 py-2 text-[11px] font-bold text-[#f6465d] hover:bg-[#f6465d]/10 rounded-lg transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>


    <SearchModal :isOpen="isSearchOpen" @close="isSearchOpen = false" />
    <NotificationHistoryModal :isOpen="isNotifHistoryOpen" @close="isNotifHistoryOpen = false" />
  </header>
</template>
