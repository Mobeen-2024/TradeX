import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface RuntimeNode {
  id: string;
  type: string;
  status: 'running' | 'stopped' | 'quarantined';
  cpu: number;
  memory: number;
  lastHeartbeat: number;
  config: any;
}

export interface RuntimeMetrics {
  signals: { waiting: number; active: number; failed: number };
  executions: { waiting: number; active: number; failed: number };
}

export const useRuntimeStore = defineStore('runtime', () => {
  const nodes = ref<Record<string, RuntimeNode>>({});
  const metrics = ref<RuntimeMetrics>({
    signals: { waiting: 0, active: 0, failed: 0 },
    executions: { waiting: 0, active: 0, failed: 0 }
  });
  const blackboard = ref<Record<string, any>>({});
  const lastUpdate = ref(Date.now());

  function handleHealthUpdate(data: any) {
    const { health, metrics: m, timestamp } = data;
    
    // Update Nodes
    nodes.value = health;
    
    // Update Queue Metrics
    metrics.value = m;
    
    lastUpdate.value = timestamp;
  }

  function handleBlackboardUpdate(data: any) {
    const { symbol, beliefs } = data;
    blackboard.value[symbol] = beliefs;
  }

  return {
    nodes,
    metrics,
    blackboard,
    lastUpdate,
    handleHealthUpdate,
    handleBlackboardUpdate
  };
});
