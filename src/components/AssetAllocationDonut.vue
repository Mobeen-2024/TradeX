<script setup lang="ts">
import { computed } from 'vue';
import { activePositions, availableUsdt } from '../store/tradeStore';

const allocationData = computed(() => {
    const positions = activePositions.value;
    const totalUsdt = availableUsdt.value;
    
    const marginUsed = positions.reduce((acc, pos) => acc + pos.cost, 0);
    const totalValue = totalUsdt + marginUsed;

    if (totalValue === 0) return [];

    return [
        { label: 'Available', value: totalUsdt, color: '#F0B90B', percent: (totalUsdt / totalValue) * 100 },
        { label: 'Margin', value: marginUsed, color: '#2962FF', percent: (marginUsed / totalValue) * 100 }
    ];
});

const dashArray = computed(() => {
    let currentOffset = 0;
    return allocationData.value.map(item => {
        const offset = currentOffset;
        currentOffset += item.percent;
        return {
            ...item,
            strokeDasharray: `${item.percent} ${100 - item.percent}`,
            strokeDashoffset: -offset
        };
    });
});
</script>

<template>
    <div class="flex flex-col items-center justify-center h-full">
        <div class="relative w-40 h-40">
            <svg viewBox="0 0 42 42" class="w-full h-full transform -rotate-90">
                <circle
                    v-for="(item, idx) in dashArray"
                    :key="idx"
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    :stroke="item.color"
                    stroke-width="4"
                    :stroke-dasharray="item.strokeDasharray"
                    :stroke-dashoffset="item.strokeDashoffset"
                    class="transition-all duration-1000 ease-out"
                ></circle>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-[10px] text-[#848e9c] font-black uppercase tracking-widest">Exposure</span>
                <span class="text-xl font-black text-white tracking-tighter">
                    {{ allocationData.find(d => d.label === 'Margin')?.percent.toFixed(1) || 0 }}%
                </span>
            </div>
        </div>
        
        <div class="flex gap-4 mt-6">
            <div v-for="item in allocationData" :key="item.label" class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: item.color }"></div>
                <div class="flex flex-col">
                    <span class="text-[9px] text-[#848e9c] font-black uppercase tracking-widest">{{ item.label }}</span>
                    <span class="text-xs font-bold text-white">{{ item.percent.toFixed(1) }}%</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
circle {
    transition: stroke-dasharray 1s ease-in-out, stroke-dashoffset 1s ease-in-out;
}
</style>
