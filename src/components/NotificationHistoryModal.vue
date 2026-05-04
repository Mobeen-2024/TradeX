<script setup lang="ts">
import { ref } from 'vue';
import { Bell, X, Trash2, CheckCircle2, Info, AlertTriangle, AlertCircle } from 'lucide-vue-next';
import { notificationHistory, clearNotifications } from '../store/alertStore';
import { cn } from '../lib/utils';

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits(['close']);

const getIcon = (type: string) => {
  switch (type) {
    case 'success': return CheckCircle2;
    case 'warning': return AlertTriangle;
    case 'error': return AlertCircle;
    default: return Info;
  }
};

const getIconColor = (type: string) => {
  switch (type) {
    case 'success': return 'text-[#0ecb81]';
    case 'warning': return 'text-[#fcd535]';
    case 'error': return 'text-[#f6465d]';
    default: return 'text-[#3674ff]';
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center px-4">
    <!-- Backdrop -->
    <div @click="emit('close')" class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"></div>
    
    <!-- Modal -->
    <div class="w-full max-w-2xl bg-[#1e2329] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 fade-in duration-300">
      <div class="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-[#F0B90B]/10 flex items-center justify-center border border-[#F0B90B]/20">
            <Bell class="w-6 h-6 text-[#F0B90B]" />
          </div>
          <div>
            <h2 class="text-2xl font-black text-white tracking-tight">Notification History</h2>
            <p class="text-xs text-[#848e9c] font-medium uppercase tracking-widest mt-1">Review all your recent alerts and activity</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button 
            @click="clearNotifications"
            class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-[#f6465d]/10 text-[#848e9c] hover:text-[#f6465d] transition-all text-xs font-black uppercase tracking-wider border border-transparent hover:border-[#f6465d]/20"
          >
            <Trash2 class="w-4 h-4" /> Clear All
          </button>
          <button @click="emit('close')" class="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X class="w-6 h-6 text-[#848e9c]" />
          </button>
        </div>
      </div>

      <div class="max-h-[60vh] overflow-y-auto no-scrollbar p-6">
        <div v-if="notificationHistory.length === 0" class="py-20 flex flex-col items-center justify-center text-[#474d57] text-center">
          <div class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <Bell class="w-10 h-10 opacity-20" />
          </div>
          <h3 class="text-lg font-black text-white/40 uppercase tracking-[0.2em]">Silence is Golden</h3>
          <p class="text-sm font-medium mt-2 max-w-xs">You don't have any notifications yet. All your future activity will appear here.</p>
        </div>

        <div v-else class="flex flex-col gap-3">
          <div 
            v-for="notif in notificationHistory" 
            :key="notif.id"
            class="group p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all duration-300"
          >
            <div class="flex items-start gap-5">
              <div :class="cn('w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0', getIconColor(notif.type))">
                <component :is="getIcon(notif.type)" class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-4 mb-1">
                  <h4 class="font-black text-[#EAECEF] truncate">{{ notif.title }}</h4>
                  <span class="text-[10px] text-[#474d57] font-mono whitespace-nowrap">{{ new Date(notif.time).toLocaleString() }}</span>
                </div>
                <p class="text-xs text-[#848e9c] leading-relaxed">{{ notif.message }}</p>
                
                <div v-if="!notif.read" class="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F0B90B]/10 border border-[#F0B90B]/20">
                  <div class="w-1 h-1 rounded-full bg-[#F0B90B] animate-pulse"></div>
                  <span class="text-[8px] font-black text-[#F0B90B] uppercase">New</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-[#0ecb81]"></div>
          <span class="text-[10px] text-[#848e9c] font-bold uppercase tracking-widest">System Operational</span>
        </div>
        <span class="text-[10px] text-[#474d57] font-black italic">TradeX Notification Center v2.4</span>
      </div>
    </div>
  </div>
</template>
