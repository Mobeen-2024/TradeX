<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status?: string; // 'idle' | 'running' | 'success' | 'failed'
  outputs?: any;
  latency?: number;
  logs?: string[];
  successRate?: string;
  confidence?: string;
}>();

const borderColor = computed(() => {
  if (props.status === 'running') return 'border-[#F0B90B]';
  if (props.status === 'success') return 'border-[#0ecb81]';
  if (props.status === 'failed') return 'border-[#f6465d]';
  return 'border-[#2b3139]';
});

const pulseClass = computed(() => {
  if (props.status === 'running') return 'animate-pulse shadow-[0_0_15px_rgba(240,185,11,0.5)]';
  if (props.status === 'success') return 'animate-pulse-signal shadow-[0_0_15px_rgba(14,203,129,0.2)]';
  if (props.status === 'failed') return 'animate-shake shadow-[0_0_15px_rgba(246,70,93,0.3)]';
  return '';
});
</script>

<template>
  <div class="absolute inset-[-2px] rounded-3xl border-2 pointer-events-none z-10 transition-all duration-300" :class="[borderColor, pulseClass]"></div>
  
  <div v-if="status && status !== 'idle'" class="absolute -top-10 right-0 flex gap-2">
    <div class="bg-black/60 backdrop-blur-md text-[#EAECEF] px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg border border-white/10 shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
      <div class="w-1.5 h-1.5 rounded-full" 
        :class="{
          'bg-[#F0B90B] animate-pulse shadow-[#F0B90B] shadow-[0_0_8px]': status === 'running',
          'bg-[#0ecb81] shadow-[#0ecb81] shadow-[0_0_8px]': status === 'success',
          'bg-[#f6465d] shadow-[#f6465d] shadow-[0_0_8px]': status === 'failed'
        }"></div>
      <span class="text-white uppercase tracking-widest font-bold font-mono text-[9px]">{{ status }}</span>
    </div>
    <div v-if="latency" class="bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 text-white/50 font-mono text-[9px] tracking-widest shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
      {{ latency }}ms
    </div>
  </div>
  
  <!-- Live metrics overlay added via requested feature -->
  <div class="absolute -top-3 left-6 flex items-center gap-1.5 z-20 pointer-events-none" v-if="props.latency || props.successRate || props.confidence">
     <div v-if="props.latency" class="bg-black/80 px-2 py-0.5 rounded text-[8px] font-mono text-[#3b82f6] border border-[#3b82f6]/20 backdrop-blur">{{ props.latency || '4.2ms' }}</div>
     <div v-if="props.successRate" class="bg-black/80 px-2 py-0.5 rounded text-[8px] font-mono text-[#0ecb81] border border-[#0ecb81]/20 backdrop-blur">{{ props.successRate || '99.8%' }}</div>
     <div v-if="props.confidence" class="bg-black/80 px-2 py-0.5 rounded text-[8px] font-mono text-[#eab308] border border-[#eab308]/20 backdrop-blur">{{ props.confidence || '85%' }}</div>
  </div>

  <div v-if="status === 'success' && outputs && Object.keys(outputs).length > 0" class="absolute top-1/2 -right-40 -translate-y-1/2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-[0_20px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] whitespace-pre text-[9px] text-[#0ecb81] font-mono pointer-events-none z-20">
    {{ JSON.stringify(outputs, null, 2) }}
  </div>
</template>
