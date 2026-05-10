<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Terminal, Shield, Activity, AlertTriangle, XCircle, Search, Trash2, Filter } from 'lucide-vue-next';

interface AuditEvent {
  id: string;
  eventType: string;
  source: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  payload: any;
  timestamp: string | number;
}

const events = ref<AuditEvent[]>([]);
const filterType = ref('');
const filterSeverity = ref('');
const ws = ref<WebSocket | null>(null);
const maxEvents = 100;

const fetchHistory = async () => {
  try {
    const res = await fetch('/api/events?limit=50');
    const history = await res.json();
    events.value = history;
  } catch (e) {
    console.error('Failed to fetch audit history');
  }
};

const connectWs = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

  socket.onmessage = (msg) => {
    try {
      const payload = JSON.parse(msg.data);
      if (payload.type === 'audit_event') {
        const event = payload.data;
        // Pre-parse payload if it's a string
        if (typeof event.payload === 'string') {
          try { event.payload = JSON.parse(event.payload); } catch {}
        }
        events.value.unshift(event);
        if (events.value.length > maxEvents) events.value.pop();
      }
    } catch (e) {}
  };

  socket.onclose = () => {
    setTimeout(connectWs, 3000);
  };

  ws.value = socket;
};

onMounted(() => {
  fetchHistory();
  connectWs();
});

onUnmounted(() => {
  ws.value?.close();
});

const filteredEvents = computed(() => {
  return events.value.filter(e => {
    const matchesType = !filterType.value || e.eventType.includes(filterType.value);
    const matchesSeverity = !filterSeverity.value || e.severity === filterSeverity.value;
    return matchesType && matchesSeverity;
  });
});

const getSeverityClass = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'ERROR':    return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'WARN':     return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default:         return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
};

const formatDate = (ts: string | number) => {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
};

const clearLocal = () => {
  events.value = [];
};
</script>

<template>
  <div class="runtime-trace bg-[#0B0F17] rounded-xl border border-white/5 flex flex-col h-full overflow-hidden shadow-2xl font-mono">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-white/5 bg-[#121826] flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-1.5 bg-blue-500/10 rounded-lg">
          <Terminal class="w-4 h-4 text-blue-400" />
        </div>
        <h3 class="text-xs font-bold text-white uppercase tracking-wider">System Audit Trail</h3>
      </div>
      
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <select v-model="filterSeverity" class="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-400 focus:outline-none focus:border-blue-500/50">
            <option value="">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <button @click="clearLocal" class="p-1.5 hover:bg-white/5 rounded text-gray-500 hover:text-red-400 transition-colors" title="Clear View">
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          <span class="text-[10px] text-green-500 font-bold uppercase tracking-widest">Live</span>
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="px-4 py-2 border-b border-white/5 bg-black/20 flex items-center gap-3">
      <Search class="w-3.5 h-3.5 text-gray-600" />
      <input 
        v-model="filterType"
        type="text" 
        placeholder="Filter by event type (e.g. 'risk.approved')..."
        class="flex-1 bg-transparent border-none text-[10px] text-gray-300 placeholder:text-gray-700 focus:ring-0 p-0"
      />
    </div>

    <!-- Event List -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
      <div v-if="filteredEvents.length === 0" class="flex flex-col items-center justify-center py-20 opacity-20">
        <Activity class="w-10 h-10 mb-4" />
        <p class="text-[10px] uppercase tracking-widest">Listening for events...</p>
      </div>

      <div v-for="event in filteredEvents" :key="event.id" class="group flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
        <div class="text-[10px] text-gray-600 shrink-0 mt-0.5 tabular-nums">
          {{ formatDate(event.timestamp) }}
        </div>
        
        <div class="flex flex-col gap-1 flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span :class="['text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase leading-none', getSeverityClass(event.severity)]">
              {{ event.severity }}
            </span>
            <span class="text-[11px] font-bold text-gray-300 break-all">{{ event.eventType }}</span>
            <span class="text-[10px] text-gray-600 font-medium">@{{ event.source }}</span>
          </div>
          
          <div class="text-[10px] text-gray-500 leading-relaxed font-sans line-clamp-1 group-hover:line-clamp-none transition-all">
            {{ typeof event.payload === 'object' ? JSON.stringify(event.payload) : event.payload }}
          </div>
        </div>

        <div class="opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="text-[10px] text-blue-500 hover:text-blue-400">Trace</button>
        </div>
      </div>
    </div>

    <!-- Footer Stats -->
    <div class="px-4 py-2 bg-[#080B12] border-t border-white/5 flex items-center justify-between">
      <div class="flex gap-4">
        <div class="flex items-center gap-1.5">
          <div class="w-1 h-1 rounded-full bg-blue-500"></div>
          <span class="text-[9px] text-gray-500 uppercase">Buffer: {{ events.length }}/{{ maxEvents }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <Shield class="w-3 h-3 text-gray-600" />
          <span class="text-[9px] text-gray-500 uppercase">Secure Audit Enabled</span>
        </div>
      </div>
      <div class="text-[9px] text-gray-600">
        v2.4.0-audit
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.2);
}

.runtime-trace {
  scrollbar-gutter: stable;
}
</style>
