<script setup lang="ts">
import { ref, onMounted, onUnmounted, markRaw } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';

// Custom Nodes
import SignalNode from './nodes/SignalNode.vue';
import WorkerNode from './nodes/WorkerNode.vue';
import RiskNode from './nodes/RiskNode.vue';
import ExecutionNode from './nodes/ExecutionNode.vue';

import { socket } from '../services/socketService';

const { onPaneReady, findNode, addEdges, addNodes } = useVueFlow();

// Node Types Registry
const nodeTypes = {
    signal: markRaw(SignalNode),
    worker: markRaw(WorkerNode),
    risk: markRaw(RiskNode),
    execution: markRaw(ExecutionNode),
};

// Initial Nodes
const nodes = ref([
    {
        id: 'signal-main',
        type: 'signal',
        position: { x: 50, y: 200 },
        data: { label: 'Signal Stream', count: 0, lastSignal: 'IDLE' },
    },
    {
        id: 'risk-sentinel',
        type: 'risk',
        position: { x: 300, y: 200 },
        data: { status: 'idle' },
    },
    {
        id: 'worker-ai',
        type: 'worker',
        position: { x: 550, y: 100 },
        data: { label: 'AI_AGENT_01', type: 'ai_analytics', status: 'running', cpu: 0, memory: 0 },
    },
    {
        id: 'worker-delta',
        type: 'worker',
        position: { x: 550, y: 300 },
        data: { label: 'DELTA_CORE_01', type: 'delta_neutral', status: 'running', cpu: 0, memory: 0 },
    },
    {
        id: 'execution-sor',
        type: 'execution',
        position: { x: 850, y: 200 },
        data: { exchange: 'BINANCE_FUTURES', side: 'BUY', quantity: 0, status: 'idle' },
    },
]);

// Initial Edges
const edges = ref([
    { id: 'e-sig-risk', source: 'signal-main', target: 'risk-sentinel', animated: true, style: { stroke: '#F0B90B', strokeWidth: 2 } },
    { id: 'e-risk-ai', source: 'risk-sentinel', target: 'worker-ai', animated: false, style: { stroke: '#F0B90B', strokeWidth: 1 } },
    { id: 'e-risk-delta', source: 'risk-sentinel', target: 'worker-delta', animated: false, style: { stroke: '#F0B90B', strokeWidth: 1 } },
    { id: 'e-ai-exec', source: 'worker-ai', target: 'execution-sor', animated: false, style: { stroke: '#627EEA', strokeWidth: 1 } },
    { id: 'e-delta-exec', source: 'worker-delta', target: 'execution-sor', animated: false, style: { stroke: '#627EEA', strokeWidth: 1 } },
]);

// Animation state for pulses
const triggerPulse = (edgeId: string) => {
    const edge = edges.value.find(e => e.id === edgeId);
    if (edge) {
        edge.animated = true;
        edge.style.strokeWidth = 3;
        edge.style.stroke = '#FFFFFF';
        setTimeout(() => {
            edge.animated = false;
            edge.style.strokeWidth = 2;
            edge.style.stroke = edgeId.includes('exec') ? '#627EEA' : '#F0B90B';
        }, 1000);
    }
};

const handleRuntimeUpdate = (data: any) => {
    if (data.type === 'runtime_health_update') {
        const { health, metrics } = data;
        
        // Update Signal Node
        const sigNode = nodes.value.find(n => n.id === 'signal-main');
        if (sigNode) {
            sigNode.data.count = metrics.signals.waiting;
        }

        // Update Worker Nodes
        Object.entries(health).forEach(([id, stats]: [string, any]) => {
            let node = nodes.value.find(n => n.id === id);
            if (!node) {
                // Spawn new node if it doesn't exist
                const newNode = {
                    id,
                    type: 'worker',
                    position: { x: 550, y: 100 + nodes.value.filter(n => n.type === 'worker').length * 150 },
                    data: { 
                        label: id.split('_').slice(-1)[0], 
                        type: stats.type, 
                        status: stats.status, 
                        cpu: stats.cpu, 
                        memory: stats.memory 
                    },
                };
                nodes.value.push(newNode);
                edges.value.push({
                    id: `e-risk-${id}`,
                    source: 'risk-sentinel',
                    target: id,
                    animated: false,
                    style: { stroke: '#F0B90B', strokeWidth: 1 }
                });
                edges.value.push({
                    id: `e-${id}-exec`,
                    source: id,
                    target: 'execution-sor',
                    animated: false,
                    style: { stroke: '#627EEA', strokeWidth: 1 }
                });
            } else {
                node.data.cpu = stats.cpu;
                node.data.memory = stats.memory;
                node.data.status = stats.status;
            }
        });

        // Cleanup dead workers
        const activeIds = Object.keys(health);
        nodes.value = nodes.value.filter(n => n.type !== 'worker' || activeIds.includes(n.id) || n.id.startsWith('worker-'));
    }

    if (data.type === 'worker_order_routed') {
        triggerPulse('e-sig-risk');
        setTimeout(() => triggerPulse('e-risk-ai'), 300);
        setTimeout(() => triggerPulse('e-ai-exec'), 600);
        
        const execNode = nodes.value.find(n => n.id === 'execution-sor');
        if (execNode && data.sorResult) {
            execNode.data.exchange = data.sorResult.destinations?.[0] || 'LIQUID_SMART';
            execNode.data.status = 'filled';
            setTimeout(() => { execNode.data.status = 'idle'; }, 2000);
        }
    }
};

onMounted(() => {
    socket.on('message', (msg: string) => {
        try {
            const data = JSON.parse(msg);
            handleRuntimeUpdate(data);
        } catch (e) {
            // Not JSON
        }
    });
});

onPaneReady(({ fitView }) => {
    fitView();
});
</script>

<template>
    <div class="w-full h-full bg-[#0b0e11]/80 relative">
        <VueFlow
            v-model:nodes="nodes"
            v-model:edges="edges"
            :node-types="nodeTypes"
            :fit-view-on-init="true"
            class="runtime-flow"
        >
            <Background pattern-color="#F0B90B" :gap="20" :size="1" opacity="0.05" />
            
            <Controls position="bottom-right" class="custom-controls" />

            <template #node-signal="props">
                <SignalNode v-bind="props" />
            </template>
            
            <template #node-worker="props">
                <WorkerNode v-bind="props" />
            </template>

            <template #node-risk="props">
                <RiskNode v-bind="props" />
            </template>

            <template #node-execution="props">
                <ExecutionNode v-bind="props" />
            </template>
        </VueFlow>

        <!-- Overlay HUD -->
        <div class="absolute top-6 left-6 pointer-events-none space-y-4">
            <div class="gpu-glass px-4 py-2 rounded-lg flex items-center gap-3">
                <div class="w-2 h-2 rounded-full bg-[#0ECB81] animate-ping"></div>
                <span class="text-[10px] font-black text-[#848E9C] uppercase tracking-widest">Live Engine Feed</span>
            </div>
        </div>
    </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.runtime-flow {
    background-color: transparent;
}

.custom-controls {
    background: rgba(30, 35, 41, 0.8) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    border-radius: 8px !important;
    overflow: hidden;
}

.custom-controls button {
    background: transparent !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    color: #848E9C !important;
}

.custom-controls button:hover {
    background: rgba(255, 255, 255, 0.05) !important;
    color: #EAECEF !important;
}

/* Vue Flow Edge Overrides */
.vue-flow__edge-path {
    stroke-dasharray: 5;
    stroke-dashoffset: 0;
}

.vue-flow__edge.animated .vue-flow__edge-path {
    animation: dashdraw 0.5s linear infinite;
    stroke-width: 3px;
}

@keyframes dashdraw {
    from {
        stroke-dashoffset: 20;
    }
    to {
        stroke-dashoffset: 0;
    }
}
</style>
