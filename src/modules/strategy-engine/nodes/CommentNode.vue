<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { MessageSquare } from 'lucide-vue-next';

const props = defineProps<{
  id: string;
  data: {
    text: string;
    author?: string;
  };
}>();
</script>

<template>
  <div class="relative max-w-xs group">
    <!-- Curved connection line (visual only) -->
    <div class="absolute -left-6 top-6 w-6 h-6 border-b-2 border-l-2 border-white/20 rounded-bl-xl pointer-events-none"></div>
    
    <div class="bg-gradient-to-br from-[#1a1d24]/90 to-[#12141a]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl transition-all group-hover:border-white/20 group-hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
       <div class="flex items-start gap-3">
         <div class="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <MessageSquare class="w-4 h-4 text-white/60" />
         </div>
         <div>
            <div v-if="data.author" class="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">{{ data.author }}</div>
            <p class="text-xs text-white/80 leading-relaxed font-medium">{{ data.text }}</p>
         </div>
       </div>
    </div>
  </div>
</template>
