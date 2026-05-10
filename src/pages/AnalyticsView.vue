<script setup lang="ts">
import { ref } from 'vue';
import PerformanceDashboard from '../components/PerformanceDashboard.vue';
import AnalyticsRightSidebar from '../components/AnalyticsRightSidebar.vue';
import CognitiveBrain from '../components/ai/CognitiveBrain.vue';
import RuntimeTrace from '../components/RuntimeTrace.vue';
import { Cpu } from 'lucide-vue-next';

const sidebarRef = ref<InstanceType<typeof AnalyticsRightSidebar> | null>(null);
</script>

<template>
  <div class="flex-1 flex overflow-hidden w-full relative">
    <!-- Main Content Area -->
    <div class="flex-1 overflow-y-auto no-scrollbar flex flex-col pt-4 sm:pt-6 gap-6 relative">
      <div class="lg:hidden absolute top-4 right-4 z-20">
         <button @click="sidebarRef?.openMobile()" class="w-10 h-10 rounded-full bg-[#F0B90B] text-[#0b0e11] flex items-center justify-center shadow-lg active:scale-95 transition-transform">
            <Cpu class="w-5 h-5" />
         </button>
      </div>
      <div class="px-4 sm:px-6 grid grid-cols-1 xl:grid-cols-12 gap-6 pb-12 items-start">
        <div class="xl:col-span-8 flex flex-col gap-6">
          <PerformanceDashboard class="!p-0 !h-auto !overflow-visible" />
          <div class="h-[400px]">
            <RuntimeTrace />
          </div>
        </div>
        <div class="xl:col-span-4 h-[600px] xl:h-[700px] sticky top-0">
          <CognitiveBrain />
        </div>
      </div>
    </div>

    <!-- Right Contextual Sidebar -->
    <AnalyticsRightSidebar ref="sidebarRef" />
  </div>
</template>
