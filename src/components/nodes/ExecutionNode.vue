<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { Send, CheckCircle, Clock } from 'lucide-vue-next';

defineProps<{
    data: {
        exchange: string;
        side: string;
        quantity: number;
        status: string;
    }
}>();
</script>

<template>
    <div class="px-5 py-4 rounded-2xl bg-[#0b0e11] border-2 border-[#627EEA]/20 shadow-[0_0_20px_rgba(98,126,234,0.1)] min-w-[180px]">
        <Handle type="target" :position="Position.Left" class="!bg-[#627EEA] !w-2 !h-2" />

        <div class="flex items-center gap-3 mb-3 pb-3 border-b border-white/5">
            <div class="w-8 h-8 rounded-lg bg-[#627EEA]/10 flex items-center justify-center text-[#627EEA]">
                <Send class="w-5 h-5" />
            </div>
            <div>
                <div class="text-[10px] text-[#848E9C] font-bold uppercase tracking-widest leading-none mb-1">Execution</div>
                <div class="text-sm font-black text-[#EAECEF] leading-none">{{ data.exchange }}</div>
            </div>
        </div>

        <div class="flex items-center justify-between">
            <div class="flex flex-col">
                <span :class="[
                    'text-[10px] font-bold uppercase',
                    data.side === 'Buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                ]">{{ data.side }} {{ data.quantity }}</span>
            </div>
            
            <div class="flex items-center gap-1.5 text-[10px] font-bold text-[#0ECB81]" v-if="data.status === 'filled'">
                <CheckCircle class="w-3 h-3" />
                FILLER
            </div>
            <div class="flex items-center gap-1.5 text-[10px] font-bold text-[#F0B90B]" v-else>
                <Clock class="w-3 h-3 animate-spin" />
                PENDING
            </div>
        </div>
    </div>
</template>
