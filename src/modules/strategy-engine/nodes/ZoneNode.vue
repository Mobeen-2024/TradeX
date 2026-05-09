<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({ label: 'Strategy Zone', color: '#627EEA' })
  },
});

const themeColor = computed(() => props.data.color || '#627EEA');
</script>

<template>
  <div 
    class="relative group rounded-3xl overflow-hidden min-w-[300px] min-h-[250px] w-full h-full flex flex-col z-[-1] pointer-events-none"
    :style="{ borderColor: themeColor, boxShadow: `0 0 40px ${themeColor}20 inset` }"
    style="pointer-events: auto; background-color: rgba(12, 15, 18, 0.4); backdrop-filter: blur(20px); border-width: 2px; border-style: dashed;"
  >
    <!-- Background glowing effect -->
    <div class="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none" :style="{ backgroundColor: themeColor }"></div>
    <div class="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none" :style="{ backgroundColor: themeColor }"></div>
    
    <div class="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>

    <div class="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between pointer-events-auto bg-black/20" :style="{ borderBottomColor: `${themeColor}40` }">
      <div class="flex items-center gap-3">
        <div class="w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_currentColor]" :style="{ backgroundColor: themeColor, color: themeColor }"></div>
        <span class="text-white/90 font-bold uppercase tracking-widest text-xs drop-shadow-md">{{ data.label }}</span>
      </div>
      <div class="text-[9px] text-white/30 uppercase tracking-widest font-mono">zone</div>
    </div>
    
    <div class="flex-1 p-5 pointer-events-none">
       <!-- Nodes are placed here visually, but structurally they are siblings acting as if they are inside due to positioning -->
    </div>
  </div>
</template>
