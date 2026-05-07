<script setup lang="ts">
import PortfolioVisualizer from '../components/PortfolioVisualizer.vue';
import BalancesPanel from '../components/BalancesPanel.vue';
import TransactionHistory from '../components/TransactionHistory.vue';
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6 no-scrollbar">
    <h2 class="text-xl font-bold text-white">Asset Management</h2>
    <PortfolioVisualizer />
    <BalancesPanel />
    
    <div class="flex-1 flex flex-col min-h-0">
        <h3 class="text-lg font-bold text-white mb-4">Account History</h3>
        <TransactionHistory />
    </div>
  </div>
</template>
