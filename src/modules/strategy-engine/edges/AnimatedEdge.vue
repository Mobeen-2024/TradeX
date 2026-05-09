<script setup lang="ts">
import { computed } from 'vue';
import { BaseEdge, getBezierPath } from '@vue-flow/core';
import type { EdgeProps } from '@vue-flow/core';

interface AnimatedEdgeProps extends EdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  markerEnd?: string;
  style?: Record<string, any>;
}

const props = defineProps<AnimatedEdgeProps>();

const edgePath = computed(() => {
  const [path, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  });
  return { path, labelX, labelY };
});
</script>

<template>
  <BaseEdge 
    :id="id" 
    :path="edgePath.path" 
    :style="style" 
    :marker-end="markerEnd" 
    class="animated-plasma-edge"
  />
  
  <!-- Particles flowing along the path -->
  <circle r="4" fill="#EAECEF" filter="url(#neonGlow)">
    <animateMotion :path="edgePath.path" dur="2s" repeatCount="indefinite" />
  </circle>
  <circle r="2" fill="#F0B90B" filter="url(#neonGlow)">
    <animateMotion :path="edgePath.path" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
  </circle>
</template>

<style>
.animated-plasma-edge {
  stroke-dasharray: 5;
  animation: dashdraw 1s linear infinite;
  stroke-width: 2;
}

@keyframes dashdraw {
  from {
    stroke-dashoffset: 10;
  }
  to {
    stroke-dashoffset: 0;
  }
}
</style>
