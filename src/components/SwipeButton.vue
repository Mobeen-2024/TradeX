<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ChevronsRight, Check } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const props = defineProps<{
  text: string;
  activeColor: string;
  disabled?: boolean;
}>();

const emit = defineEmits(['confirmed']);

const isDragging = ref(false);
const startX = ref(0);
const currentX = ref(0);
const containerWidth = ref(0);
const handleWidth = ref(0);
const containerRef = ref<HTMLElement | null>(null);
const handleRef = ref<HTMLElement | null>(null);
const isConfirmed = ref(false);

const progress = ref(0); // 0 to 1

const onStart = (e: MouseEvent | TouchEvent) => {
  if (props.disabled || isConfirmed.value) return;
  isDragging.value = true;
  startX.value = 'touches' in e ? e.touches[0].clientX : e.clientX;
  currentX.value = startX.value;
  
  if (containerRef.value) containerWidth.value = containerRef.value.offsetWidth;
  if (handleRef.value) handleWidth.value = handleRef.value.offsetWidth;
};

const onMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return;
  
  const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const delta = x - startX.value;
  
  const maxDelta = containerWidth.value - handleWidth.value - 8; // 8px for padding
  const clampedDelta = Math.max(0, Math.min(delta, maxDelta));
  
  progress.value = clampedDelta / maxDelta;
  
  if (progress.value > 0.95 && !isConfirmed.value) {
    confirm();
  }
};

const onEnd = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  
  if (progress.value < 0.95) {
    progress.value = 0; // reset
  }
};

const confirm = () => {
  isConfirmed.value = true;
  progress.value = 1;
  emit('confirmed');
  
  if ('navigator' in window && 'vibrate' in navigator) {
    navigator.vibrate([20, 40, 20]);
  }
  
  // Reset after success
  setTimeout(() => {
    isConfirmed.value = false;
    progress.value = 0;
  }, 2000);
};

onMounted(() => {
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onMove);
  window.removeEventListener('mouseup', onEnd);
  window.removeEventListener('touchmove', onMove);
  window.removeEventListener('touchend', onEnd);
});

</script>

<template>
  <div 
    ref="containerRef"
    class="relative h-14 w-full bg-[#1e2329] rounded-2xl p-1 overflow-hidden select-none"
    :class="cn(disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer')"
  >
    <!-- Success Background -->
    <div 
      class="absolute inset-0 transition-opacity duration-300"
      :style="{ opacity: isConfirmed ? 1 : 0, backgroundColor: activeColor }"
    ></div>

    <!-- Text -->
    <div 
      class="absolute inset-0 flex items-center justify-center text-sm font-bold transition-opacity"
      :class="isConfirmed ? 'text-white' : 'text-[#848e9c]'"
      :style="{ opacity: isConfirmed ? 1 : 0.4 }"
    >
      {{ isConfirmed ? 'Confirmed' : text }}
    </div>

    <!-- Handle Track Fill -->
    <div 
      class="absolute left-1 top-1 bottom-1 rounded-xl transition-all duration-75"
      :style="{ width: `calc(${progress * 100}% + ${handleWidth}px)`, backgroundColor: activeColor, opacity: isConfirmed ? 0 : 0.2 }"
    ></div>

    <!-- Handle -->
    <div 
      ref="handleRef"
      @mousedown="onStart"
      @touchstart="onStart"
      class="absolute left-1 top-1 bottom-1 w-14 bg-white rounded-xl shadow-lg flex items-center justify-center transition-transform duration-75"
      :style="{ transform: `translateX(${progress * (containerWidth - handleWidth - 8)}px)` }"
    >
      <Check v-if="isConfirmed" class="w-6 h-6 text-[#0b0e11]" />
      <ChevronsRight v-else class="w-6 h-6 text-[#0b0e11]" />
    </div>
  </div>
</template>
