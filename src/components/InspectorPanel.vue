<script setup lang="ts">
import { ref, computed } from 'vue';
import { X, Settings, Activity, Terminal, Brain, SlidersHorizontal, Info } from 'lucide-vue-next';
import { NodeRegistry } from '../modules/strategy-engine/registry/NodeRegistry';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits(['close', 'updateNode']);

const activeTab = ref('settings');

const nodeLabel = computed(() => {
  if (!props.node) return '';
  return props.node.data?.label || props.node.type?.replace(/([A-Z])/g, ' $1').trim().toUpperCase() || 'NODE';
});

// Smart Node Support
const nodePlugin = computed(() => NodeRegistry.get(props.node.type));
const schema = computed(() => nodePlugin.value?.schema || null);

const updateData = (key: string, value: string | number) => {
    emit('updateNode', props.node.id, { ...props.node.data, [key]: value });
};
</script>

<template>
  <div v-if="node" class="fixed top-20 right-6 w-80 bg-[#0c0f12]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] z-50 overflow-hidden flex flex-col h-[calc(100vh-160px)] transform transition-transform duration-300">
    
    <!-- Header -->
    <div class="px-5 py-4 border-b border-white/[0.05] flex justify-between items-center bg-gradient-to-r from-white/[0.02] to-transparent">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
            <SlidersHorizontal class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] font-bold tracking-widest text-[#eab308] uppercase">Inspector</div>
          <div class="text-sm font-semibold text-white truncate max-w-[150px]">{{ nodeLabel }}</div>
        </div>
      </div>
      <button @click="$emit('close')" class="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-white/[0.05]">
      <button v-for="tab in ['settings', 'metrics', 'ai', 'logs']" :key="tab"
              @click="activeTab = tab"
              class="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-colors relative"
              :class="activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'">
        {{ tab }}
        <div v-if="activeTab === tab" class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#eab308] shadow-[0_0_10px_#eab308]"></div>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-5 font-mono text-xs no-scrollbar">
      
      <!-- Settings Tab -->
      <div v-if="activeTab === 'settings'" class="flex flex-col gap-4">
        <template v-if="schema">
          <!-- Dynamic Form derived from NodeSchema -->
          <div v-for="(propDef, key) in schema" :key="key" class="flex flex-col gap-1.5">
            <label class="text-[9px] text-white/40 tracking-wider uppercase">{{ propDef.label }}</label>
            
            <select v-if="propDef.type === 'enum'" :value="node.data[key] ?? propDef.default" @change="(e) => updateData(key, (e.target as HTMLSelectElement).value)" class="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white/90 outline-none focus:border-[#eab308]/50 focus:shadow-[0_0_10px_rgba(234,179,8,0.2)] transition-all app-select appearance-none">
              <option v-for="opt in propDef.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            
            <input v-else-if="propDef.type === 'number'" type="number" :value="node.data[key] ?? propDef.default" @input="(e) => updateData(key, Number((e.target as HTMLInputElement).value))" class="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white/90 outline-none focus:border-[#eab308]/50 focus:shadow-[0_0_10px_rgba(234,179,8,0.2)] transition-all" />
            
            <input v-else type="text" :value="node.data[key] ?? propDef.default" @input="(e) => updateData(key, (e.target as HTMLInputElement).value)" class="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white/90 outline-none focus:border-[#eab308]/50 focus:shadow-[0_0_10px_rgba(234,179,8,0.2)] transition-all" />
          </div>
        </template>
        
        <template v-else>
          <!-- Fallback hardcoded parser -->
          <div v-for="(value, key) in node.data" :key="key" class="flex flex-col gap-1.5">
            <label class="text-[9px] text-white/40 tracking-wider uppercase">{{ key }}</label>
            <input v-if="typeof value !== 'object'" type="text" :value="value" @input="(e) => updateData(key, (e.target as HTMLInputElement).value)" class="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white/90 outline-none focus:border-[#eab308]/50 focus:shadow-[0_0_10px_rgba(234,179,8,0.2)] transition-all" />
            <div v-else class="bg-black/40 border border-white/5 rounded-lg p-3 text-white/60 whitespace-pre-wrap text-[10px]">
              {{ JSON.stringify(value, null, 2) }}
            </div>
          </div>
        </template>
      </div>

      <!-- Metrics Tab -->
      <div v-else-if="activeTab === 'metrics'" class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-3">
            <div class="bg-black/50 border border-white/5 rounded-xl p-3 flex flex-col gap-1">
                <span class="text-[9px] text-white/40 tracking-wider uppercase">Latency</span>
                <span class="text-[#3b82f6] font-bold text-lg">{{ node.data?.latency || '4.2ms' }}</span>
            </div>
            <div class="bg-black/50 border border-white/5 rounded-xl p-3 flex flex-col gap-1">
                <span class="text-[9px] text-white/40 tracking-wider uppercase">Success Rate</span>
                <span class="text-[#0ecb81] font-bold text-lg">{{ node.data?.successRate || '99.8%' }}</span>
            </div>
        </div>

        <div class="bg-black/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
             <span class="text-[9px] text-white/40 tracking-wider uppercase">Signal Confidence</span>
             <div class="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                 <div class="h-full bg-gradient-to-r from-[#eab308]/50 to-[#eab308]" :style="{ width: node.data?.confidence || '85%' }"></div>
             </div>
             <div class="flex justify-between items-center text-[10px]">
                 <span class="text-white/30">Low</span>
                 <span class="text-[#eab308] font-bold">{{ node.data?.confidence || '85%' }}</span>
                 <span class="text-white/30">High</span>
             </div>
        </div>
      </div>

      <!-- AI Tab -->
      <div v-else-if="activeTab === 'ai'" class="flex flex-col gap-4">
          <div class="flex items-start gap-3 bg-[#a855f7]/10 border border-[#a855f7]/20 rounded-xl p-4">
              <Brain class="w-5 h-5 text-[#a855f7] shrink-0 mt-0.5" />
              <div class="flex flex-col gap-2">
                  <span class="text-[10px] text-[#a855f7] font-bold tracking-widest uppercase">Gemini Reasoning</span>
                  <p class="text-white/70 leading-relaxed text-[11px]">
                      Based on current market conditions and node parameters, this node is executing optimally. The signal aligns with macro trends observed across multiple timeframes.
                  </p>
                  <div class="flex items-center gap-1.5 mt-1 text-[#0ecb81] bg-[#0ecb81]/10 px-2 py-1 rounded w-fit border border-[#0ecb81]/20">
                      <Info class="w-3 h-3" />
                      <span class="text-[9px] font-bold uppercase tracking-widest">Optimized</span>
                  </div>
              </div>
          </div>
      </div>

      <!-- Logs Tab -->
      <div v-else-if="activeTab === 'logs'" class="bg-black/50 border border-white/5 rounded-xl p-3 h-full flex flex-col">
          <div class="text-[9px] text-white/40 tracking-wider uppercase mb-3 flex items-center justify-between">
              Runtime Logs
              <div class="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse"></div>
          </div>
          <div class="flex flex-col gap-2 flex-1 overflow-y-auto font-mono text-[9px] text-white/60">
              <div class="flex gap-2"><span class="text-white/30">14:02:11</span> <span class="text-[#3b82f6]">INFO</span> Node initialized</div>
              <div class="flex gap-2"><span class="text-white/30">14:02:12</span> <span class="text-[#3b82f6]">INFO</span> Parameters validated</div>
              <div class="flex gap-2"><span class="text-white/30">14:02:15</span> <span class="text-[#0ecb81]">SUCCESS</span> Execution complete (4.2ms)</div>
              <div class="flex gap-2"><span class="text-white/30">14:02:15</span> <span class="text-white/50">Data payload dispatched to downstream</span></div>
          </div>
      </div>
    </div>
  </div>
</template>
