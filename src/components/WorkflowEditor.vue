<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import { Panel } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import { useVueFlow } from '@vue-flow/core';
import { getNodeTypes } from '../modules/strategy-engine/nodes';
import AnimatedEdge from '../modules/strategy-engine/edges/AnimatedEdge.vue';
import { Play, Square, Settings2, X, Plus, Locate, ZoomIn, ZoomOut, MousePointer2, Move } from 'lucide-vue-next';
import InspectorPanel from './InspectorPanel.vue';
import CommandPalette from './CommandPalette.vue';

const { project, onNodeClick, onPaneClick, fitView, zoomIn, zoomOut } = useVueFlow();

const selectedNode = ref<any>(null);

onNodeClick((event) => {
  selectedNode.value = event.node;
});

onPaneClick(() => {
  selectedNode.value = null;
});

const nodes = ref<any[]>([
  {
    id: 'layer-execution',
    type: 'section',
    position: { x: 750, y: 50 },
    data: { label: 'Intelligence & Execution', description: 'AI inference and order routing layer', color: 'purple', width: 850, height: 350 },
  },
  {
    id: 'layer-data',
    type: 'section',
    position: { x: 50, y: 50 },
    data: { label: 'Data Ingestion', description: 'Market intelligence layer', color: 'blue', width: 650, height: 350 },
  },
  {
    id: 'comment-1',
    type: 'comment',
    position: { x: 900, y: -20 },
    data: { text: 'AI dynamically adjusts execution sizing based on regime.', author: 'Risk Engine' },
    parentNode: 'layer-execution'
  },
  {
    id: 'trigger',
    type: 'smartScheduler',
    position: { x: 100, y: 150 },
    data: { interval: '15m', mode: 'Candle Close' },
    parentNode: 'layer-data'
  },
  {
    id: 'universe',
    type: 'marketUniverse',
    position: { x: 400, y: 150 },
    data: { mode: 'Top Volume', limit: 50, examples: ['BTC', 'ETH', 'SOL'] },
    parentNode: 'layer-data'
  },
  {
    id: 'aiDecision',
    type: 'aiDecision',
    position: { x: 800, y: 150 },
    data: { analysis: ['Trend', 'Sentiment', 'Volatility', 'Correlations'], confidence: '78%', riskLevel: 'Medium' },
    parentNode: 'layer-execution'
  },
  {
    id: 'execution',
    type: 'marketOrder',
    position: { x: 1250, y: 150 },
    data: { action: 'BUY', type: 'MARKET', size: '100%' },
    parentNode: 'layer-execution'
  },
]);

const edges = ref([
  { id: 'e-t-u', source: 'trigger', target: 'universe', type: 'animated', style: { stroke: 'url(#flowGradient)', strokeWidth: 2, filter: 'url(#neonGlow)' }, class: 'flowing-gradient-stroke' },
  { id: 'e-u-a', source: 'universe', target: 'aiDecision', type: 'animated', style: { stroke: 'url(#flowGradient)', strokeWidth: 2, filter: 'url(#neonGlow)' }, class: 'flowing-gradient-stroke' },
  { id: 'e-a-e', source: 'aiDecision', target: 'execution', type: 'animated', style: { stroke: 'url(#flowGradient)', strokeWidth: 2, filter: 'url(#neonGlow)' }, class: 'flowing-gradient-stroke' },
]);

let isExecuting = ref(false);
let ws: WebSocket | null = null;
const currentWorkflowId = 'test_wf_1';
const dragMode = ref<'select'|'pan'>('select');

const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    executeWorkflow();
  }
};

onMounted(() => {
  connectWs();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (ws) ws.close();
  window.removeEventListener('keydown', handleKeyDown);
});

function connectWs() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/ws/trading`);
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'workflow_node_state' && data.workflowId === currentWorkflowId) {
        updateNodeState(data.nodeId, data.status, data.outputs, data.logs, data.latency);
      }
    } catch {}
  };
}

function updateNodeState(nodeId: string, status: string, outputs: any, logs: string[], latency: number) {
  const node = nodes.value.find(n => n.id === nodeId);
  if (node) {
    node.data = { ...node.data, status, outputs, logs, latency };
    nodes.value = [...nodes.value];
    
    const allDone = nodes.value.every(n => n.data?.status === 'success' || n.data?.status === 'failed' || n.data?.status === 'idle');
    if (status === 'success' || status === 'failed') {
       if (allDone) isExecuting.value = false;
    }
  }
}

function executeWorkflow() {
  if (isExecuting.value) return;
  isExecuting.value = true;
  
  nodes.value.forEach(node => {
     node.data = { ...node.data, status: 'idle', outputs: null, logs: [], latency: 0 };
  });
  nodes.value = [...nodes.value];

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'execute_workflow',
      workflowId: currentWorkflowId,
      nodes: nodes.value,
      edges: edges.value,
      settings: {}
    }));
  }
}

function onConnect(params: any) {
  edges.value.push({
    id: `e${params.source}-${params.target}`,
    source: params.source,
    target: params.target,
    type: 'animated',
    style: { stroke: 'url(#flowGradient)', strokeWidth: 2, filter: 'url(#neonGlow)' },
    class: 'flowing-gradient-stroke'
  });
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

let idCounter = 4;
function onDrop(event: DragEvent) {
  event.preventDefault();
  if (!event.dataTransfer) return;
  const dataString = event.dataTransfer.getData('application/vueflow');
  if (!dataString) return;
  
  const { nodeType, data } = JSON.parse(dataString);

  const position = project({ x: event.clientX, y: event.clientY - 40 });

  const newNode = {
    id: `${idCounter++}`,
    type: nodeType,
    position,
    data: data || {},
  };

  nodes.value.push(newNode);
}

function updateNodeData(id: string, data: any) {
  const node = nodes.value.find(n => n.id === id);
  if (node) {
    node.data = data;
    nodes.value = [...nodes.value];
    if (selectedNode.value?.id === id) {
      selectedNode.value = { ...node };
    }
  }
}

function loadTemplate(templateId: string) {
  console.log('Loading template:', templateId);
}

const edgeTypes = {
  animated: AnimatedEdge
};

const nodeTypes = getNodeTypes();

defineExpose({
  nodes,
  edges,
  loadStrategy(newNodes: any[], newEdges: any[]) {
    nodes.value = newNodes;
    edges.value = newEdges;
  }
});
</script>

<template>
  <div class="h-full w-full flex-1 bg-transparent rounded-2xl overflow-hidden relative flex drop-shadow-2xl font-sans" @dragover="onDragOver" @drop="onDrop">
    <!-- SVGs for Gradient Effects -->
    <svg style="width:0;height:0;position:absolute;pointer-events:none;">
      <defs>
        <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#F0B90B" />
          <stop offset="50%" stop-color="#a855f7" />
          <stop offset="100%" stop-color="#0ecb81" />
          <animate attributeName="x1" values="-100%;100%" dur="3s" repeatCount="indefinite" />
          <animate attributeName="x2" values="0%;200%" dur="3s" repeatCount="indefinite" />
        </linearGradient>
        <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur1" />
          <feGaussianBlur stdDeviation="6" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>

    <!-- Canvas Wrapper -->
    <div class="flex-1 h-full w-full relative min-h-[500px]">
      
      <!-- VueFlow Canvas -->
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        @connect="onConnect"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        :default-zoom="1"
        :min-zoom="0.1"
        :max-zoom="4"
        :fit-view-on-init="true"
        :snap-to-grid="true"
        :snap-grid="[20, 20]"
        :elevate-nodes-on-select="true"
        :pan-on-scroll="true"
        :pan-on-drag="dragMode === 'pan'"
        :selection-on-drag="dragMode === 'select'"
        class="vue-flow-theme-master h-full w-full"
      >
        <!-- Liquid Dots Background -->
        <Background pattern-color="rgba(255,255,255,0.04)" :gap="24" :size="1.5" />
        
        <!-- Minimap Redesigned -->
        <MiniMap 
          nodeStrokeColor="transparent" 
          nodeColor="rgba(255,255,255,0.1)" 
          maskColor="rgba(0,0,0, 0.6)" 
          class="!bg-black/40 !backdrop-blur-xl !border !border-white/10 !rounded-xl overflow-hidden !shadow-2xl !bottom-4 !right-4 !w-40 !h-28" />

        <!-- Floating UI Panels -->
        <Panel position="top-left" class="!m-4 flex items-center gap-2 z-50">
           <!-- Execute Strategy CTA Button -->
           <button class="relative group px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F0B90B] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#F0B90B] text-black font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-[0_0_20px_rgba(240,185,11,0.2)] hover:shadow-[0_0_30px_rgba(240,185,11,0.4)] transition-all overflow-hidden"
              @click="executeWorkflow">
              <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              
              <div v-if="isExecuting" class="w-1.5 h-1.5 rounded-full bg-white animate-pulse relative z-10"></div>
              <Play v-else class="w-3.5 h-3.5 relative z-10" />
              
              <span class="relative z-10">{{ isExecuting ? 'Running Strategy...' : 'Execute Strategy' }}</span>
           </button>
           
           <!-- Drag / Pan Mode Toggle -->
           <div class="flex items-center bg-[#0a0c10]/80 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-lg">
              <button @click="dragMode = 'select'" :class="dragMode === 'select' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'" class="p-1.5 rounded-lg transition-all" title="Select Tool">
                 <MousePointer2 class="w-4 h-4" />
              </button>
              <button @click="dragMode = 'pan'" :class="dragMode === 'pan' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'" class="p-1.5 rounded-lg transition-all" title="Pan Tool">
                 <Move class="w-4 h-4" />
              </button>
           </div>
        </Panel>

        <!-- Custom Zoom Controls -->
        <Panel position="bottom-left" class="!m-4 flex flex-col gap-2 z-50">
           <div class="flex flex-col bg-[#0a0c10]/80 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl">
              <button @click="zoomIn" class="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all border-b border-white/5">
                 <ZoomIn class="w-4 h-4" />
              </button>
               <button @click="fitView" class="p-2 rounded-lg text-white/60 hover:text-[#F0B90B] hover:bg-white/10 transition-all border-b border-white/5">
                 <Locate class="w-4 h-4" />
              </button>
              <button @click="zoomOut" class="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all">
                 <ZoomOut class="w-4 h-4" />
              </button>
           </div>
        </Panel>

      </VueFlow>
      
      <!-- Live Execution Log Panel Overlay -->
      <transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-4">
          <div v-if="isExecuting || nodes.some(n => n.data?.status === 'success' || n.data?.status === 'failed')" 
               class="absolute bottom-4 left-20 z-10 bg-[#0a0c10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] w-80 max-h-72 flex flex-col pointer-events-auto overflow-hidden ring-1 ring-white/5">
            <div class="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-white/[0.02] to-transparent">
              <span class="text-[9px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                 <Activity class="w-3.5 h-3.5 text-[#F0B90B]" /> Live Logs
              </span>
              <div class="flex items-center gap-2">
                <span class="text-[8px] uppercase tracking-widest font-bold" :class="isExecuting ? 'text-[#F0B90B] animate-pulse' : 'text-white/30'">
                  {{ isExecuting ? 'Running' : 'Terminated' }}
                </span>
              </div>
            </div>
            <div class="p-4 overflow-y-auto flex-1 flex flex-col gap-3 font-mono text-[10px] leading-relaxed no-scrollbar cursor-text">
              <template v-for="node in nodes" :key="node.id">
                <div v-if="node.data?.status && node.data?.status !== 'idle'" class="flex flex-col gap-1.5 focus-within:bg-white/5 p-1 rounded-sm transition-colors">
                  <div class="flex justify-between items-center">
                    <span class="text-white/80 font-bold uppercase tracking-wider text-[9px]">{{ node.type }}</span>
                    <span :class="{'text-[#0ecb81] border-[#0ecb81]/30 bg-[#0ecb81]/10': node.data.status === 'success', 'text-[#f6465d] border-[#f6465d]/30 bg-[#f6465d]/10': node.data.status === 'failed', 'text-[#F0B90B] border-[#F0B90B]/30 bg-[#F0B90B]/10 animate-pulse': node.data.status === 'running'}" class="text-[9px] uppercase tracking-widest border rounded px-1.5 py-0.5">
                      {{ node.data.status }}
                    </span>
                  </div>
                  <div v-for="(log, i) in node.data.logs" :key="i" class="text-white/40 pl-3 border-l border-white/10 ml-1 hover:text-white/70 transition-colors">
                    <span class="opacity-30">></span> {{ log }}
                  </div>
                </div>
              </template>
            </div>
          </div>
      </transition>
      
      <!-- Node Inspector Panel -->
      <InspectorPanel v-if="selectedNode" :node="selectedNode" @close="selectedNode = null" @updateNode="updateNodeData" />
      <CommandPalette @loadTemplate="loadTemplate" />
    </div>
  </div>
</template>

<style>
/* N8N / Modern Glassmorphism Master Theme */
.vue-flow-theme-master {
  background: transparent;
}
.vue-flow-theme-master .vue-flow__node {
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}
.vue-flow-theme-master .vue-flow__node.selected {
  box-shadow: 0 0 0 2px rgba(240,185,11,0.5), 0 20px 40px rgba(0,0,0,0.6);
  transform: translateY(-2px);
}
.vue-flow-theme-master .vue-flow__edge-path {
  stroke: rgba(255,255,255,0.1);
  stroke-width: 2;
  transition: stroke 0.3s ease;
}
.vue-flow-theme-master .vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #F0B90B;
  stroke-width: 3;
}
.vue-flow-theme-master .vue-flow__connection-path {
  stroke: #a855f7;
  stroke-width: 2;
}
.vue-flow-theme-master .vue-flow__handle {
  width: 12px;
  height: 12px;
  background-color: #0c0f12;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  transition: all 0.2s ease;
}
.vue-flow-theme-master .vue-flow__handle:hover {
  transform: scale(1.3);
  background-color: #F0B90B;
  border-color: #0c0f12;
}
.vue-flow-theme-master .vue-flow__minimap {
  border-radius: 12px;
}
.vue-flow-theme-master .vue-flow__minimap-mask {
  fill: rgba(0,0,0,0.6);
}
.vue-flow-theme-master .vue-flow__minimap-node {
  fill: rgba(255,255,255,0.15);
  rx: 4;
  ry: 4;
}
</style>

