<script setup lang="ts">
import { Star } from 'lucide-vue-next';

defineProps<{ isExpanded: boolean }>();
</script>

<template>
  <div 
    class="flex items-center gap-3 px-2 py-3 border-t border-[#2b3139] mt-2 transition-all duration-300"
    :class="isExpanded ? 'px-3' : 'px-2 justify-center'"
  >
    <!-- Avatar -->
    <div class="relative shrink-0">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#F0B90B] to-[#FCD535] flex items-center justify-center text-[#161a1e] font-bold text-xs shadow-lg">
        M
      </div>
      <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#0ECB81] border-2 border-[#161a1e] rounded-full"></div>
    </div>

    <!-- Info -->
    <div 
      class="flex flex-col overflow-hidden transition-all duration-300"
      :class="isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0'"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-[#EAECEF] whitespace-nowrap">Mobeen</span>
        <div class="flex items-center gap-0.5 bg-[#F0B90B]/10 px-1 rounded">
          <Star class="w-2.5 h-2.5 text-[#F0B90B]" />
          <span class="text-[8px] text-[#F0B90B] font-black uppercase">Gold</span>
        </div>
      </div>
      <span class="text-[10px] text-[#848e9c] whitespace-nowrap">Portfolio: $24,500.80</span>
    </div>
  </div>
</template>
