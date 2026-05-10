<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Cpu, Database, Activity } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps<{
    data: {
        label: string;
        type: string;
        status: string;
        cpu: number;
        memory: number;
        lastHeartbeat: number;
    }
}>();

const statusColor = computed(() => {
    if (props.data.status === 'running') return 'bg-[#0ECB81]';
    if (props.data.status === 'error') return 'bg-[#F6465D]';
    return 'bg-gray-500';
});

const healthPercent = computed(() => Math.min(props.data.cpu || 0, 100));
</script>

<template>
    <div class="px-4 py-3 rounded-xl bg-[#1e2329]/80 backdrop-blur-xl border border-white/5 shadow-2xl min-w-[200px] group transition-all hover:border-[#F0B90B]/30">
        <!-- Handles -->
        <Handle type="target" :position="Position.Left" class="!bg-[#F0B90B] !w-2 !h-2" />
        <Handle type="source" :position="Position.Right" class="!bg-[#F0B90B] !w-2 !h-2" />

        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
                <div :class="['w-2 h-2 rounded-full animate-pulse', statusColor]"></div>
                <span class="text-xs font-bold text-[#EAECEF] uppercase tracking-wider">{{ data.type }}</span>
            </div>
            <span class="text-[10px] text-[#848E9C] font-mono">{{ data.label }}</span>
        </div>

        <div class="space-y-2">
            <!-- CPU Metric -->
            <div class="space-y-1">
                <div class="flex items-center justify-between text-[10px]">
                    <div class="flex items-center gap-1.5 text-[#848E9C]">
                        <Cpu class="w-3 h-3" />
                        CPU LOAD
                    </div>
                    <span class="font-bold text-[#EAECEF]">{{ data.cpu }}%</span>
                </div>
                <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                        class="h-full bg-gradient-to-r from-[#F0B90B] to-orange-500 transition-all duration-500"
                        :style="{ width: `${healthPercent}%` }"
                    ></div>
                </div>
            </div>

            <!-- Memory Metric -->
            <div class="flex items-center justify-between text-[10px]">
                <div class="flex items-center gap-1.5 text-[#848E9C]">
                    <Database class="w-3 h-3" />
                    MEMORY
                </div>
                <span class="font-bold text-[#EAECEF]">{{ data.memory }}MB</span>
            </div>
        </div>

        <!-- Pulse Effect on Activity -->
        <div class="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#F0B90B]/0 via-[#F0B90B]/20 to-[#F0B90B]/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
</template>

<style scoped>
.vue-flow__node-worker {
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
}
</style>
