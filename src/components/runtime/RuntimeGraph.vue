<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { useRuntimeStore } from '../../stores/runtimeStore.ts';
import { Activity, ShieldAlert, Cpu, Zap, Database } from 'lucide-vue-next';

const store = useRuntimeStore();
const { onConnect, addEdges, setNodes, setEdges } = useVueFlow();

const elements = ref<any[]>([]);

// ── Computed Graph Elements ───────────────────────────────────────
const graphElements = computed(() => {
  const newElements: any[] = [];

  // 1. Static Core: Orchestrator
  newElements.push({
    id: 'orchestrator',
    type: 'special',
    label: 'ORCHESTRATOR',
    position: { x: 400, y: 50 },
    data: { role: 'supervisor', icon: Activity },
    style: { background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6' }
  });

  // 2. Static Core: Blackboard
  newElements.push({
    id: 'blackboard',
    type: 'special',
    label: 'BLACKBOARD',
    position: { x: 400, y: 350 },
    data: { role: 'memory', icon: Database },
    style: { background: 'rgba(168, 85, 247, 0.1)', border: '1px solid #a855f7' }
  });

  // 3. Dynamic Nodes: Workers & Agents
  let workerX = 50;
  Object.entries(store.nodes).forEach(([id, node]) => {
    const isAgent = node.type.includes('agent');
    const color = node.status === 'quarantined' ? '#ef4444' : (isAgent ? '#10b981' : '#3b82f6');
    
    newElements.push({
      id,
      type: 'special',
      label: id.split('_').slice(0, 2).join(' '),
      position: { x: workerX, y: 200 },
      data: { ...node, icon: isAgent ? Zap : Cpu },
      style: { 
        background: `${color}11`, 
        border: `1px solid ${color}`,
        boxShadow: node.status === 'quarantined' ? '0 0 15px rgba(239, 68, 68, 0.5)' : 'none'
      }
    });

    // 4. Dynamic Edges: Connectivity
    // Control Plane (Orchestrator -> Worker)
    newElements.push({
      id: `e-ctrl-${id}`,
      source: 'orchestrator',
      target: id,
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 1, opacity: 0.5 }
    });

    // Data Plane (Worker -> Blackboard)
    newElements.push({
      id: `e-data-${id}`,
      source: id,
      target: 'blackboard',
      animated: true,
      style: { stroke: color, strokeWidth: 2 }
    });

    workerX += 180;
  });

  return newElements;
});

// Sync store with elements
watch(graphElements, (newEl) => {
  elements.value = newEl;
}, { immediate: true });

</script>

<template>
  <div class="runtime-graph-container h-full w-full bg-[#050505] relative overflow-hidden">
    <!-- Overlay Metrics -->
    <div class="absolute top-4 left-4 z-10 flex gap-4">
      <div class="glass-stat p-3 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
        <div class="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Queue Signals</div>
        <div class="text-xl font-mono text-emerald-400">{{ store.metrics.signals.waiting }}</div>
      </div>
      <div class="glass-stat p-3 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
        <div class="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Active Nodes</div>
        <div class="text-xl font-mono text-blue-400">{{ Object.keys(store.nodes).length }}</div>
      </div>
    </div>

    <!-- The Flow Canvas -->
    <VueFlow
      v-model="elements"
      :default-zoom="1.0"
      :min-zoom="0.2"
      :max-zoom="4"
      class="runtime-flow"
    >
      <Background pattern-color="#222" :gap="20" />
      
      <!-- Custom Node Template -->
      <template #node-special="props">
        <div 
          class="custom-runtime-node p-4 rounded-xl backdrop-blur-xl transition-all duration-500 flex flex-col items-center gap-2 min-w-[140px]"
          :class="{ 'quarantine-shake': props.data.status === 'quarantined' }"
        >
          <div class="node-icon-wrapper p-2 rounded-lg bg-white/5 border border-white/10">
            <component :is="props.data.icon" :size="20" :color="props.style?.border" />
          </div>
          
          <div class="flex flex-col items-center">
            <span class="text-[10px] font-bold tracking-tighter text-white uppercase">{{ props.label }}</span>
            <span v-if="props.data.status" class="text-[8px] opacity-60 uppercase tracking-widest">{{ props.data.status }}</span>
          </div>

          <!-- Mini Telemetry -->
          <div v-if="props.data.cpu !== undefined" class="w-full mt-2 space-y-1">
            <div class="flex justify-between text-[7px] text-zinc-400 uppercase">
              <span>CPU</span>
              <span>{{ props.data.cpu.toFixed(1) }}%</span>
            </div>
            <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                class="h-full bg-blue-500 transition-all duration-1000" 
                :style="{ width: `${Math.min(props.data.cpu * 2, 100)}%` }"
              ></div>
            </div>
          </div>

          <!-- Quarantine Warning -->
          <div v-if="props.data.status === 'quarantined'" class="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full animate-pulse shadow-lg">
            <ShieldAlert :size="12" />
          </div>
        </div>
      </template>

      <Controls />
    </VueFlow>

    <!-- Global Pulse Animation -->
    <div class="absolute bottom-4 right-4 pointer-events-none opacity-20">
       <Zap class="text-yellow-400 animate-pulse" :size="64" />
    </div>
  </div>
</template>

<style scoped>
.custom-runtime-node {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.quarantine-shake {
  animation: shake 0.5s infinite;
}

@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  20% { transform: translate(-3px, 0px) rotate(1deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  40% { transform: translate(1px, -1px) rotate(1deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  60% { transform: translate(-3px, 1px) rotate(0deg); }
  70% { transform: translate(3px, 1px) rotate(-1deg); }
  80% { transform: translate(-1px, -1px) rotate(1deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -2px) rotate(-1deg); }
}

.glass-stat {
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}

:deep(.vue-flow__edge-path) {
  stroke-dasharray: 5;
  animation: dash 10s linear infinite;
}

@keyframes dash {
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
}
</style>
