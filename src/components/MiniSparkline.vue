<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}>();

const svgWidth = computed(() => props.width || 60);
const svgHeight = computed(() => props.height || 20);

const points = computed(() => {
  if (!props.data || props.data.length < 2) return '';
  
  const min = Math.min(...props.data);
  const max = Math.max(...props.data);
  const range = max - min || 1;
  
  const padding = 2;
  const h = svgHeight.value - padding * 2;
  const w = svgWidth.value;
  
  return props.data.map((val, i) => {
    const x = (i / (props.data.length - 1)) * w;
    const y = svgHeight.value - padding - ((val - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
});

const strokeColor = computed(() => props.color || '#0ECB81');
</script>

<template>
  <svg :width="svgWidth" :height="svgHeight" class="overflow-visible">
    <polyline
      fill="none"
      :stroke="strokeColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      :points="points"
      class="transition-all duration-500 ease-in-out"
    />
  </svg>
</template>
