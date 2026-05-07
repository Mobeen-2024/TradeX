<script setup lang="ts">
import { ref } from 'vue';
import { cn } from '../lib/utils';
import MultiChartWorkspace from '../components/MultiChartWorkspace.vue';
import OrderPanel from '../components/OrderPanel.vue';
import TransactionHistory from '../components/TransactionHistory.vue';

const mobileTab = ref('Chart');
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Mobile Tab Switcher -->
    <div class="md:hidden flex bg-[#161a1e] border-b border-dash-border p-1 gap-1 shrink-0">
      <button 
        v-for="tab in ['Chart', 'Trade', 'Positions']" 
        :key="tab"
        @click="mobileTab = tab"
        :class="cn(
          'flex-1 py-2 text-xs font-bold rounded-md transition-all',
          mobileTab === tab ? 'bg-[#2b3139] text-[#F0B90B] shadow-sm' : 'text-[#848e9c]'
        )"
      >
        {{ tab }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-2 no-scrollbar items-center">
      <!-- Main Workspace Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[1fr_250px] gap-2 flex-1 w-full max-w-[1300px] min-h-[0]">
        
        <!-- Chart -->
        <div 
          :class="cn(
            'lg:col-span-7 xl:col-span-7 lg:row-start-1 lg:col-start-1 flex flex-col min-h-[450px] lg:min-h-[0]',
            mobileTab !== 'Chart' ? 'hidden md:flex' : 'flex'
          )"
        >
          <MultiChartWorkspace class="w-full h-full" />
        </div>

        <!-- OrderPanel -->
        <div 
          :class="cn(
            'lg:col-span-5 xl:col-span-5 lg:row-start-1 lg:col-start-8 xl:col-start-8 flex flex-col h-[520px] lg:h-full',
            mobileTab !== 'Trade' ? 'hidden md:flex' : 'flex'
          )"
        >
          <OrderPanel class="w-full h-full" />
        </div>
        
        <!-- Transactions -->
        <div 
          :class="cn(
            'lg:col-span-12 lg:row-start-2 lg:col-start-1 flex flex-col h-[400px] lg:h-full',
            mobileTab !== 'Positions' ? 'hidden md:flex' : 'flex'
          )"
        >
          <TransactionHistory class="h-full" />
        </div>
      </div>
    </div>
  </div>
</template>
