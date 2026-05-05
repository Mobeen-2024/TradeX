<script setup lang="ts">
import { workspacePanels, addPanel, removePanel } from '../store/workspaceStore';
import TradingChartWidget from './TradingChartWidget.vue';
import { LayoutGrid, Plus, Save } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const layoutPresets = [
    { count: 1, label: '1x1' },
    { count: 2, label: '1x2' },
    { count: 4, label: '2x2' },
];

const applyLayoutPreset = (count: number) => {
    const current = workspacePanels.value.length;
    if (count > current) {
        for (let i = 0; i < count - current; i++) addPanel();
    } else if (count < current) {
        workspacePanels.value = workspacePanels.value.slice(0, count);
    }
};

const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1 grid-rows-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3 grid-rows-3 md:grid-rows-1';
    if (count === 4) return 'grid-cols-1 md:grid-cols-2 grid-rows-4 md:grid-rows-2';
    return 'grid-cols-1 md:grid-cols-3 grid-rows-auto md:grid-rows-2';
};
</script>

<template>
  <div class="flex flex-col h-full bg-transparent overflow-hidden">
    <!-- Workspace Toolbar -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-[#2b3139] bg-[#161a1e]/50 backdrop-blur-xl">
        <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 px-3 py-1.5 bg-[#2b3139]/50 rounded-lg border border-[#F0B90B]/20">
                <LayoutGrid class="w-4 h-4 text-[#F0B90B]" />
                <span class="text-xs font-bold text-[#EAECEF] uppercase tracking-wider">Multi-Chart Workspace</span>
            </div>
            <div class="h-4 w-px bg-[#2b3139]"></div>
            <span class="text-[10px] text-[#848e9c] font-medium uppercase tracking-widest">{{ workspacePanels.length }} Active Viewports</span>
        </div>

        <div class="flex items-center gap-2">
            <!-- Layout Presets -->
            <div class="flex items-center gap-1 bg-[#2b3139]/30 p-1 rounded-lg border border-[#2b3139] mr-2">
                <button 
                    v-for="preset in layoutPresets" 
                    :key="preset.count"
                    @click="applyLayoutPreset(preset.count)"
                    :class="cn(
                        'px-2 py-1 rounded text-[10px] font-bold transition-all',
                        workspacePanels.length === preset.count 
                            ? 'bg-[#F0B90B] text-[#0b0e11]' 
                            : 'text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139]'
                    )"
                >
                    {{ preset.label }}
                </button>
            </div>

            <button 
                @click="addPanel"
                class="flex items-center gap-2 px-3 py-1.5 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#0b0e11] rounded-lg text-xs font-black transition-all shadow-lg shadow-[#F0B90B]/10 active:scale-95"
            >
                <Plus class="w-3.5 h-3.5" stroke-width="3" />
                ADD VIEWPORT
            </button>
            <button class="p-2 text-[#848e9c] hover:text-[#EAECEF] hover:bg-[#2b3139] rounded-lg transition-all">
                <Save class="w-4 h-4" />
            </button>
        </div>
    </div>

    <!-- Chart Grid -->
    <div 
        :class="cn(
            'flex-1 grid gap-1 p-1 bg-transparent transition-all duration-500 ease-in-out overflow-y-auto md:overflow-hidden',
            getGridClass(workspacePanels.length)
        )"
    >
        <div 
            v-for="panel in workspacePanels" 
            :key="panel.id"
            class="relative group"
        >
            <TradingChartWidget 
                :panel-id="panel.id"
                v-model:symbol="panel.symbol"
                v-model:interval="panel.timeframe"
                v-model:is-synced="panel.isSynced"
                @remove="removePanel(panel.id)"
            />
        </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
