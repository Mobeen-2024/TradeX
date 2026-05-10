<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Zap, Signal } from 'lucide-vue-next';
import { ref, watch } from 'vue';

const props = defineProps<{
    data: {
        label: string;
        count: number;
        lastSignal?: string;
    }
}>();

const isPulsing = ref(false);

watch(() => props.data.count, () => {
    isPulsing.value = true;
    setTimeout(() => { isPulsing.value = false; }, 1000);
});
</script>

<template>
    <div :class="[
        'px-5 py-4 rounded-2xl bg-[#1e2329]/80 backdrop-blur-xl border-2 transition-all duration-300',
        isPulsing ? 'border-[#F0B90B] shadow-[0_0_30px_rgba(240,185,11,0.3)] scale-105' : 'border-white/5 shadow-2xl'
    ]">
        <Handle type="source" :position="Position.Right" class="!bg-[#F0B90B] !w-2 !h-2" />

        <div class="flex flex-col items-center gap-3">
            <div :class="[
                'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                isPulsing ? 'bg-[#F0B90B] text-[#0b0e11]' : 'bg-[#F0B90B]/10 text-[#F0B90B]'
            ]">
                <Signal class="w-6 h-6" />
            </div>
            
            <div class="text-center">
                <h3 class="text-xs font-black text-[#EAECEF] uppercase tracking-[0.2em]">{{ data.label }}</h3>
                <div class="mt-2 flex items-center gap-2 justify-center">
                    <Zap class="w-3 h-3 text-[#F0B90B]" />
                    <span class="text-xl font-mono font-bold text-[#F0B90B]">{{ data.count }}</span>
                </div>
                <p v-if="data.lastSignal" class="mt-2 text-[8px] text-[#848E9C] font-mono truncate max-w-[120px]">
                    LAST: {{ data.lastSignal }}
                </p>
            </div>
        </div>
    </div>
</template>
