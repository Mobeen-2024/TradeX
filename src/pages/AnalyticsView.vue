<script setup lang="ts">
import MarketIntelPanel from '../components/MarketIntelPanel.vue';
import PerformanceDashboard from '../components/PerformanceDashboard.vue';
</script>

<template>
  <div class="flex-1 overflow-y-auto no-scrollbar flex flex-col pt-4 sm:pt-6 gap-6">
    <div class="h-[300px] shrink-0 mx-4 sm:mx-6 rounded-[24px] overflow-hidden border border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative">
      <!-- Ambient Glow for Intelligence Panel -->
      <div class="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full z-0 pointer-events-none"></div>
      <MarketIntelPanel class="w-full h-full relative z-10" />
    </div>
    <PerformanceDashboard class="!p-4 sm:!p-6 !h-auto !overflow-visible" />
  </div>
</template>
