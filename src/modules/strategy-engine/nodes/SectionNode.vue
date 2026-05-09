<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { computed } from 'vue';

const props = defineProps<{
  id: string;
  data: {
    label: string;
    description?: string;
    color?: string;
    width?: number;
    height?: number;
  };
}>();

const colorClass = computed(() => {
    const c = props.data.color || 'blue';
    return `from-${c}-500/10 to-${c}-500/5 border-${c}-500/30`;
});
</script>

<template>
  <div 
    class="relative rounded-3xl border bg-gradient-to-br backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all flex flex-col"
    :class="colorClass"
    :style="{ width: (data.width || 600) + 'px', height: (data.height || 400) + 'px' }"
  >
    <div class="absolute inset-0 bg-white/[0.02] rounded-3xl z-[-1] border border-white/5 pointer-events-none"></div>
    <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
       <div>
         <h3 class="text-xl font-black text-white/90 tracking-wider uppercase">{{ data.label }}</h3>
         <p v-if="data.description" class="text-xs text-white/50 mt-1">{{ data.description }}</p>
       </div>
    </div>
  </div>
</template>

<style scoped>
</style>
