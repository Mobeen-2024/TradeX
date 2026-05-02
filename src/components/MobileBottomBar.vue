<script setup lang="ts">
import { ref } from 'vue';
import { MoreHorizontal, X, HeadphonesIcon, Settings, User } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const props = defineProps<{ 
  navItems: any[], 
  activeItem: string 
}>();

const emit = defineEmits<{
  (e: 'update:active-item', value: string): void
}>();

const isMoreOpen = ref(false);

const toggleMore = () => {
  isMoreOpen.value = !isMoreOpen.value;
};

const selectItem = (label: string) => {
  emit('update:active-item', label);
  isMoreOpen.value = false;
};
</script>

<template>
  <div class="md:hidden w-full shrink-0">
    <!-- Bottom Bar -->
    <div class="bg-[#161a1e] border-t border-[#2b3139] flex flex-row items-center justify-around px-2 pb-safe relative z-[60]" style="padding-bottom: env(safe-area-inset-bottom);">
      <button
        v-for="item in navItems.slice(0, 4)"
        :key="item.label"
        @click="selectItem(item.label)"
        class="flex flex-col items-center justify-center gap-1 flex-1 h-[60px] relative"
        :class="activeItem === item.label ? 'text-[#F0B90B]' : 'text-[#848e9c]'"
      >
        <component :is="item.icon" class="w-5 h-5 shrink-0" />
        <span class="text-[9px] font-medium truncate w-full text-center px-1">{{ item.label }}</span>
        <!-- Active Dot -->
        <div v-if="activeItem === item.label" class="absolute bottom-1 w-1 h-1 bg-[#F0B90B] rounded-full"></div>
      </button>

      <!-- More Button -->
      <button
        @click="toggleMore"
        class="flex flex-col items-center justify-center gap-1 flex-1 h-[60px]"
        :class="isMoreOpen ? 'text-[#F0B90B]' : 'text-[#848e9c]'"
      >
        <MoreHorizontal class="w-5 h-5 shrink-0" />
        <span class="text-[9px] font-medium text-center">More</span>
      </button>
    </div>

    <!-- More Drawer (Bottom Sheet) -->
    <Teleport to="body">
      <div v-if="isMoreOpen" class="fixed inset-0 z-[100] md:hidden">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          @click="isMoreOpen = false"
        ></div>

        <!-- Sheet -->
        <div 
          class="absolute bottom-0 left-0 w-full bg-[#161a1e] border-t border-[#2b3139] rounded-t-2xl p-6 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] animate-[slide-up_0.3s_ease-out]"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-white">Menu</h3>
            <button @click="isMoreOpen = false" class="p-2 bg-[#2b3139] rounded-full text-[#848e9c]">
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <!-- Remaining Nav Items -->
            <button
              v-for="item in navItems.slice(4)"
              :key="item.label"
              @click="selectItem(item.label)"
              class="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#2b3139]/30 border border-[#2b3139]"
              :class="activeItem === item.label ? 'text-[#F0B90B] border-[#F0B90B]/30 bg-[#F0B90B]/5' : 'text-[#848e9c]'"
            >
              <component :is="item.icon" class="w-6 h-6" />
              <span class="text-xs font-medium">{{ item.label }}</span>
            </button>

            <!-- Extra items -->
            <button class="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#2b3139]/30 border border-[#2b3139] text-[#848e9c]">
              <HeadphonesIcon class="w-6 h-6" />
              <span class="text-xs font-medium">Support</span>
            </button>
            <button class="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#2b3139]/30 border border-[#2b3139] text-[#848e9c]">
              <Settings class="w-6 h-6" />
              <span class="text-xs font-medium">Settings</span>
            </button>
            <button class="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#2b3139]/30 border border-[#2b3139] text-[#848e9c]">
              <User class="w-6 h-6" />
              <span class="text-xs font-medium">Profile</span>
            </button>
          </div>
          
          <!-- Safe area padding for drawer -->
          <div class="h-safe pb-4" style="padding-bottom: env(safe-area-inset-bottom);"></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
