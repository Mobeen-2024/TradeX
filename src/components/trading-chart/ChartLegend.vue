<script setup lang="ts">
defineProps<{
    data: {
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        isUp: boolean;
    }
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1 text-[9px] font-mono border-b border-[#2b3139]/30 bg-[#0b0e11]/50 backdrop-blur-md">
    <div class="flex gap-1.5">
      <span class="text-[#848e9c]">O</span>
      <span :class="data.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ data.open.toFixed(2) }}</span>
    </div>
    <div class="flex gap-1.5">
      <span class="text-[#848e9c]">H</span>
      <span :class="data.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ data.high.toFixed(2) }}</span>
    </div>
    <div class="flex gap-1.5">
      <span class="text-[#848e9c]">L</span>
      <span :class="data.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ data.low.toFixed(2) }}</span>
    </div>
    <div class="flex gap-1.5">
      <span class="text-[#848e9c]">C</span>
      <span :class="data.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'">{{ data.close.toFixed(2) }}</span>
    </div>
    <div class="flex items-center gap-1.5 px-1.5 rounded bg-white/5">
      <span :class="['font-bold', data.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]']">
        {{ data.isUp ? '+' : '' }}{{ (((data.close - data.open) / data.open) * 100).toFixed(2) }}%
      </span>
    </div>
    <div class="flex gap-1.5 ml-2 border-l border-white/10 pl-2">
      <span class="text-[#848e9c]">V</span>
      <span class="text-[#EAECEF]">{{ data.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</span>
    </div>
  </div>
</template>
