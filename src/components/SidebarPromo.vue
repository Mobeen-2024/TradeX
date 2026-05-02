<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Crown, Gift, Rocket, X } from 'lucide-vue-next';

defineProps<{ isExpanded: boolean }>();

const promos = [
  { 
    id: 1, 
    icon: Crown, 
    title: 'King of Asia', 
    subtitle: 'Prize pool: 100k $', 
    buttonText: 'Join Now',
    color: '#F0B90B'
  },
  { 
    id: 2, 
    icon: Gift, 
    title: 'Referral Bonus', 
    subtitle: 'Earn up to 40%', 
    buttonText: 'Invite Friends',
    color: '#0ECB81'
  },
  { 
    id: 3, 
    icon: Rocket, 
    title: 'Launchpad', 
    subtitle: 'New token: XDX', 
    buttonText: 'View Project',
    color: '#3b82f6'
  }
];

const currentIndex = ref(0);
const isDismissed = ref(false);
let timer: any;

onMounted(() => {
  timer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % promos.length;
  }, 5000);
});

onUnmounted(() => {
  clearInterval(timer);
});
</script>

<template>
  <div v-if="!isDismissed" 
    class="bg-[#2b3139]/30 border border-[#2b3139] rounded-xl p-[10px] relative overflow-hidden cursor-pointer hover:bg-[#2b3139]/50 transition-all duration-300"
    :class="isExpanded ? 'h-[130px]' : 'h-[44px]'"
  >
    <!-- Dismiss Button -->
    <button 
      v-if="isExpanded"
      @click.stop="isDismissed = true"
      class="absolute top-2 right-2 p-1 text-[#848e9c] hover:text-white z-10"
    >
      <X class="w-3 h-3" />
    </button>

    <div class="flex items-center gap-3 transition-all duration-300 h-full"
      :class="isExpanded ? 'flex-col items-center' : 'flex-row'"
    >
      <!-- Carousel Icon -->
      <div class="shrink-0 rounded-full flex items-center justify-center transition-all duration-300"
        :style="{ backgroundColor: promos[currentIndex].color }"
        :class="isExpanded ? 'w-10 h-10 mt-1' : 'w-6 h-6'"
      >
        <component :is="promos[currentIndex].icon" class="text-[#181a20] transition-all duration-300" 
          :class="isExpanded ? 'w-5 h-5' : 'w-3.5 h-3.5'"
        />
      </div>

      <!-- Carousel Content -->
      <div class="flex-1 transition-all duration-300 overflow-hidden"
        :class="isExpanded ? 'text-center opacity-100 w-full h-auto' : 'text-left opacity-0 w-0 h-0'"
      >
        <h4 class="text-[#EAECEF] font-semibold text-xs mb-0.5 whitespace-nowrap">
          {{ promos[currentIndex].title }}
        </h4>
        <div class="text-[11px] text-[#848e9c] leading-tight whitespace-nowrap mb-2">
          {{ promos[currentIndex].subtitle }}
        </div>
        <button 
          class="w-full py-1.5 rounded font-bold text-[11px] transition-colors whitespace-nowrap"
          :style="{ backgroundColor: promos[currentIndex].color, color: '#181a20' }"
        >
          {{ promos[currentIndex].buttonText }}
        </button>
        
        <!-- Indicators -->
        <div class="flex justify-center gap-1 mt-2">
          <div 
            v-for="(_, idx) in promos" 
            :key="idx"
            class="w-1 h-1 rounded-full transition-all duration-300"
            :class="currentIndex === idx ? 'w-3 bg-white' : 'bg-white/20'"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
