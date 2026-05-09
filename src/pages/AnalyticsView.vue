<script setup lang="ts">
import { ref } from 'vue';
import PerformanceDashboard from '../components/PerformanceDashboard.vue';
import AnalyticsRightSidebar from '../components/AnalyticsRightSidebar.vue';
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
      <PerformanceDashboard class="!p-4 sm:!p-6 !h-auto !overflow-visible" />
    </div>

    <!-- Right Contextual Sidebar -->
    <AnalyticsRightSidebar ref="sidebarRef" />
  </div>
</template>
