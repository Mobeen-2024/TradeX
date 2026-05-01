<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const tvContainerId = 'tv_chart_widget_' + Math.random().toString(36).substring(7);
const containerRef = ref<HTMLDivElement | null>(null);

let scriptElement: HTMLScriptElement | null = null;

onMounted(() => {
  scriptElement = document.createElement('script');
  scriptElement.src = 'https://s3.tradingview.com/tv.js';
  scriptElement.async = true;
  scriptElement.onload = () => {
    if (window.TradingView && containerRef.value) {
      new window.TradingView.widget({
        autosize: true,
        symbol: "BINANCE:BTCUSDT",
        interval: "60",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        backgroundColor: "rgba(11, 14, 17, 1)",
        gridColor: "rgba(255, 255, 255, 0.03)",
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: tvContainerId,
        toolbar_bg: "#0b0e11",
        withdateranges: true,
      });
    }
  };
  document.head.appendChild(scriptElement);
});

onUnmounted(() => {
  if (scriptElement && document.head.contains(scriptElement)) {
    document.head.removeChild(scriptElement);
  }
});
</script>

<template>
  <!-- Maintain the size constrained requested in earlier iterations -->
  <div class="group relative flex flex-col w-full h-[450px] rounded-2xl border border-white/5 bg-[#0b0e11] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 hover:border-white/10 hover:shadow-[0_8px_32px_-8px_rgba(240,185,11,0.15)]">
    <!-- Ambient glowing effect -->
    <div class="absolute -top-1/2 -left-1/2 w-full h-full bg-[#F0B90B] opacity-[0.03] blur-[120px] rounded-full mix-blend-screen pointer-events-none transition-opacity duration-700 group-hover:opacity-[0.08]"></div>
    
    <div :id="tvContainerId" ref="containerRef" class="w-full h-full relative z-10"></div>
    
    <!-- Subtle inset shadow overlay to blend iframe edges -->
    <div class="absolute inset-0 pointer-events-none border border-white/[0.02] rounded-2xl z-20 shadow-[inset_0_0_30px_rgba(0,0,0,0.4)]"></div>
  </div>
</template>

