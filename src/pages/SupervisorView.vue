<script setup lang="ts">
import { ref, onMounted } from 'vue';
import RuntimeGraph from '../components/RuntimeGraph.vue';
import { Cpu, Activity, Shield, Zap, AlertTriangle } from 'lucide-vue-next';
import { useLiquidStore } from '../store/liquidStore';

const liquidStore = useLiquidStore();

const systemStats = ref([
    { label: 'Uptime', value: '142h 12m', icon: Activity, color: 'text-[#0ECB81]' },
    { label: 'Active Pods', value: '12', icon: Cpu, color: 'text-[#F0B90B]' },
    { label: 'Risk Shield', value: 'Active', icon: Shield, color: 'text-[#627EEA]' },
    { label: 'Throughput', value: '8.4k/s', icon: Zap, color: 'text-orange-400' }
]);

onMounted(() => {
    liquidStore.addEvent('Supervisor Terminal Initialized - Distributed Graph Active');
});
</script>

<template>
    <div class="flex-1 flex flex-col min-h-0 bg-[#0b0e11] relative overflow-hidden">
        <!-- Dashboard Header -->
        <div class="h-[70px] shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0b0e11]/40 backdrop-blur-md z-20">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-[#F0B90B]/10 border border-[#F0B90B]/20 flex items-center justify-center">
                    <Shield class="w-6 h-6 text-[#F0B90B] animate-pulse" />
                </div>
                <div>
                    <h1 class="text-lg font-bold text-[#EAECEF] tracking-tight">System Supervisor</h1>
                    <p class="text-[10px] text-[#0ECB81] font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 bg-[#0ECB81] rounded-full"></span>
                        Reconciliation Loop Active
                    </p>
                </div>
            </div>

            <!-- Global Metrics -->
            <div class="hidden lg:flex items-center gap-8">
                <div v-for="stat in systemStats" :key="stat.label" class="flex items-center gap-3">
                    <component :is="stat.icon" :class="['w-4 h-4', stat.color]" />
                    <div class="flex flex-col">
                        <span class="text-[10px] text-[#848E9C] font-medium">{{ stat.label }}</span>
                        <span class="text-xs font-bold text-[#EAECEF]">{{ stat.value }}</span>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <button class="px-4 py-2 bg-[#f6465d]/10 hover:bg-[#f6465d]/20 border border-[#f6465d]/30 text-[#f6465d] rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                    <AlertTriangle class="w-4 h-4" />
                    EMERGENCY HALT
                </button>
            </div>
        </div>

        <!-- Main Visualization Canvas -->
        <div class="flex-1 relative min-h-0">
            <!-- Grid Background Overlay -->
            <div class="absolute inset-0 pointer-events-none opacity-20 z-0">
                <div class="w-full h-full bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            <!-- The Graph Component -->
            <RuntimeGraph />
        </div>

        <!-- Bottom Status Bar -->
        <div class="h-10 shrink-0 border-t border-white/5 bg-[#0b0e11]/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
            <div class="flex items-center gap-6">
                <div class="flex items-center gap-2 text-[10px] font-medium text-[#848E9C]">
                    <div class="w-2 h-2 rounded-full bg-[#0ECB81]"></div>
                    Redis Cluster: ONLINE
                </div>
                <div class="flex items-center gap-2 text-[10px] font-medium text-[#848E9C]">
                    <div class="w-2 h-2 rounded-full bg-[#0ECB81]"></div>
                    BullMQ: 0 BACKLOG
                </div>
                <div class="flex items-center gap-2 text-[10px] font-medium text-[#848E9C]">
                    <div class="w-2 h-2 rounded-full bg-[#627EEA]"></div>
                    Qdrant Memory: 1.2GB
                </div>
            </div>
            <div class="text-[10px] font-mono text-[#848E9C]">
                MASTER_NODE_TX_04 // v1.2.0-STABLE
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Glassmorphism utility */
.gpu-glass {
  background: rgba(11, 14, 17, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.03);
}
</style>
