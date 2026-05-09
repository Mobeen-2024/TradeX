<script setup lang="ts">
import PerformanceDashboard from '../components/PerformanceDashboard.vue';
import AnalyticsRightSidebar from '../components/AnalyticsRightSidebar.vue';
</script>

<template>
  <div class="flex-1 flex overflow-hidden w-full">
    <!-- Main Content Area -->
    <div class="flex-1 overflow-y-auto no-scrollbar flex flex-col pt-4 sm:pt-6 gap-6 relative">
      <PerformanceDashboard class="!p-4 sm:!p-6 !h-auto !overflow-visible" />
    </div>

    <!-- Right Contextual Sidebar -->
    <AnalyticsRightSidebar />
  </div>
</template>
