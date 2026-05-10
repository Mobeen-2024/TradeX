<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps<{
    data: {
        status: 'idle' | 'checking' | 'blocked' | 'passed';
        reason?: string;
    }
}>();

const colorClass = computed(() => {
    switch (props.data.status) {
        case 'passed': return 'text-[#0ECB81] border-[#0ECB81]/30 bg-[#0ECB81]/5';
        case 'blocked': return 'text-[#F6465D] border-[#F6465D]/30 bg-[#F6465D]/5';
        case 'checking': return 'text-[#F0B90B] border-[#F0B90B]/30 bg-[#F0B90B]/5';
        default: return 'text-[#848E9C] border-white/5 bg-white/5';
    }
});
</script>

<template>
    <div :class="['px-5 py-4 rounded-2xl border-2 backdrop-blur-xl transition-all duration-500 min-w-[160px]', colorClass]">
        <Handle type="target" :position="Position.Left" class="!bg-current !w-2 !h-2" />
        <Handle type="source" :position="Position.Right" class="!bg-current !w-2 !h-2" />

        <div class="flex flex-col items-center gap-3">
            <div class="relative">
                <ShieldCheck v-if="data.status === 'passed'" class="w-10 h-10" />
                <ShieldAlert v-else-if="data.status === 'blocked'" class="w-10 h-10 animate-bounce" />
                <Shield v-else class="w-10 h-10" />
                
                <div v-if="data.status === 'checking'" class="absolute inset-0 border-2 border-current rounded-full animate-ping opacity-20"></div>
            </div>

            <div class="text-center">
                <span class="text-[10px] font-black uppercase tracking-widest block mb-1">Risk Sentinel</span>
                <div class="text-xs font-bold uppercase">{{ data.status }}</div>
                <p v-if="data.reason" class="text-[9px] mt-1 opacity-70 font-medium italic">{{ data.reason }}</p>
            </div>
        </div>
    </div>
</template>
