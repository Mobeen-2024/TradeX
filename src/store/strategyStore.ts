import { ref, computed } from 'vue';
import { addNotification } from './alertStore';
import { placeOrder, activePositions, closePosition } from './tradeStore';
import { wsManager } from '../lib/wsManager';

// --- Core Types ---
export type StrategyStatus = 'running' | 'paused' | 'waiting' | 'error' | 'idle';
export type NodeStatus = 'running' | 'success' | 'failed' | 'idle';

export interface NodeExecutionState {
  status: NodeStatus;
  latency: number;
  output: any;
  lastExecution: number;
}

export interface Strategy {
  id: string;
  name: string;
  type: string;
  status: StrategyStatus;
  roi: number;
  trades: number;
  winRate: number;
  pnlUsdt: number;
  alloc: number;
  pairs: string[];
  lastPing: string;
  nodes?: any[];
  edges?: any[];
}

export interface ExecutionLog {
  id: string;
  strategyId: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'EXEC';
  nodeId?: string;
  message: string;
  data?: any;
}

// --- Reactive State (The Runtime Data Layer) ---

// 1. Strategy Definitions
export const strategies = ref<Strategy[]>([
  { 
    id: '1', name: 'Momentum Scalper', type: 'Scalp Engine', status: 'running', 
    roi: 12.4, trades: 14, winRate: 68, pnlUsdt: 12.50, alloc: 100,
    pairs: ['BTC/USDT', 'ETH/USDT'], lastPing: '12ms',
    nodes: [], edges: []
  },
  { 
    id: '4', name: 'Delta Neutral Hedge', type: 'Risk Manager', status: 'running', 
    roi: 1.8, trades: 42, winRate: 98, pnlUsdt: 2.70, alloc: 150,
    pairs: ['SOL/USDT', 'BNB/USDT'], lastPing: '8ms',
    nodes: [], edges: []
  },
  { 
    id: '2', name: 'Bin/Byb Arb', type: 'Arb Network', status: 'paused', 
    roi: 2.1, trades: 104, winRate: 94, pnlUsdt: 1.05, alloc: 50,
    pairs: ['XRP/USDT', 'ADA/USDT'], lastPing: 'Offline',
    nodes: [], edges: []
  },
]);

// 2. Active Executions (Instances currently live in the engine)
export const activeExecutions = ref<Record<string, { startTime: number; lastTick: number }>>({});

// 3. Execution Logs (Institutional Audit Trail)
export const executionLogs = ref<ExecutionLog[]>([]);

// 4. Signal Queue (Buffer for incoming AI/Market signals)
export const signalQueue = ref<any[]>([]);

// 5. Node Execution Map (For Vue Flow Visualization)
export const nodeExecutionMap = ref<Record<string, Record<string, NodeExecutionState>>>({});

// 6. Runtime Metrics (Institutional Performance tracking)
export const runtimeMetrics = ref<Record<string, { latency: number[]; errors: number; uptime: number }>>({});

// --- Engine Actions (The Runtime Logic Layer) ---

/**
 * Logs a runtime event to the audit trail
 */
export const logRuntimeEvent = (strategyId: string, level: ExecutionLog['level'], message: string, nodeId?: string, data?: any) => {
  const log: ExecutionLog = {
    id: Math.random().toString(36).substring(7),
    strategyId,
    timestamp: Date.now(),
    level,
    nodeId,
    message,
    data
  };
  executionLogs.value.unshift(log);
  if (executionLogs.value.length > 500) executionLogs.value.pop();
};

/**
 * Updates the state of a specific node in a strategy graph
 */
export const updateNodeExecution = (strategyId: string, nodeId: string, updates: Partial<NodeExecutionState>) => {
  if (!nodeExecutionMap.value[strategyId]) {
    nodeExecutionMap.value[strategyId] = {};
  }
  
  nodeExecutionMap.value[strategyId][nodeId] = {
    ...(nodeExecutionMap.value[strategyId][nodeId] || { status: 'idle', latency: 0, output: {}, lastExecution: 0 }),
    ...updates,
    lastExecution: updates.status === 'success' || updates.status === 'failed' ? Date.now() : (nodeExecutionMap.value[strategyId][nodeId]?.lastExecution || 0)
  };
};

/**
 * Start Strategy Runtime
 */
export const startStrategy = async (id: string) => {
  const strategy = strategies.value.find(s => s.id === id);
  if (!strategy) return;

  strategy.status = 'running';
  activeExecutions.value[id] = { startTime: Date.now(), lastTick: Date.now() };
  
  logRuntimeEvent(id, 'INFO', `Strategy engine ${strategy.name} initiated.`);
  
  addNotification({
    type: 'success',
    title: 'Engine Started',
    message: `${strategy.name} is now live.`
  });
};

/**
 * Pause Strategy Runtime
 */
export const pauseStrategy = (id: string) => {
  const strategy = strategies.value.find(s => s.id === id);
  if (strategy) {
    strategy.status = 'paused';
    delete activeExecutions.value[id];
    logRuntimeEvent(id, 'WARN', `Strategy engine ${strategy.name} suspended.`);
  }
};

/**
 * Signal Dispatch Engine
 */
export const dispatchSignal = async (signal: any) => {
  signalQueue.value.push(signal);
  logRuntimeEvent('system', 'INFO', `Incoming signal queued for ${signal.asset}`);

  try {
    const orderData = {
      pair: signal.asset.replace('/', ''),
      side: signal.type === 'BUY' || signal.type === 'ACCUMULATE' ? 'Buy' : 'Sell' as const,
      type: 'MARKET',
      quantity: 0.1,
      leverage: '10x',
      cost: 100,
      takeProfitPrice: parseFloat(signal.priceTarget?.replace('$', '').replace(',', '')) || undefined,
      stopLossPrice: parseFloat(signal.stopLoss?.replace('$', '').replace(',', '')) || undefined,
    };

    const result = await placeOrder(orderData);
    if (result) {
      logRuntimeEvent('system', 'EXEC', `Signal executed on ${signal.asset}`, undefined, result);
      return true;
    }
  } catch (err) {
    logRuntimeEvent('system', 'ERROR', `Signal execution failed: ${(err as Error).message}`);
  }
  return false;
};

/**
 * Macro Orchestration Engine
 */
export const triggerMacro = async (macroId: string) => {
  logRuntimeEvent('system', 'WARN', `Macro Protocol ${macroId} triggered.`);
  
  try {
    switch (macroId) {
      case '3': // Panic Close
        for (const pos of activePositions.value) {
          await closePosition(pos.id);
          logRuntimeEvent('system', 'EXEC', `Emergency close: ${pos.pair} (${pos.id})`);
        }
        break;
      case '2': // Scale Out
        const profitable = activePositions.value.filter(p => (p.pnl || 0) > 0);
        for (const pos of profitable) {
          await closePosition(pos.id);
          logRuntimeEvent('system', 'EXEC', `Profit secured: ${pos.pair}`);
        }
        break;
    }
    return true;
  } catch (err) {
    logRuntimeEvent('system', 'ERROR', `Macro execution failed: ${(err as Error).message}`);
    return false;
  }
};

// --- Legacy Compatibility Exports ---
export const activeStrategies = strategies;
export const addStrategy = (strategy: Strategy) => strategies.value.unshift(strategy);
export const updateStrategy = (id: string, updates: Partial<Strategy>) => {
  const i = strategies.value.findIndex(s => s.id === id);
  if (i !== -1) strategies.value[i] = { ...strategies.value[i], ...updates };
};
export const toggleStrategyState = async (id: string) => {
  const strategy = strategies.value.find(s => s.id === id);
  if (!strategy) return;
  if (strategy.status === 'running') pauseStrategy(id);
  else await startStrategy(id);
};
export const executeSignal = dispatchSignal;

// --- Runtime Heartbeat ---
if (typeof window !== 'undefined') {
  setInterval(() => {
    strategies.value.forEach(s => {
      if (s.status === 'running') {
        // Dynamic Performance Simulation
        s.roi = parseFloat((s.roi + (Math.random() - 0.5) * 0.05).toFixed(2));
        s.pnlUsdt = parseFloat((s.pnlUsdt + (Math.random() - 0.5) * 0.1).toFixed(2));
        s.lastPing = `${Math.floor(Math.random() * 15 + 2)}ms`;
        
        // Node state simulation (for demo/visualization)
        if (s.nodes && s.nodes.length > 0) {
          const randomNode = s.nodes[Math.floor(Math.random() * s.nodes.length)];
          updateNodeExecution(s.id, randomNode.id, {
            status: Math.random() > 0.1 ? 'success' : 'failed',
            latency: Math.floor(Math.random() * 50 + 10),
            output: { timestamp: Date.now() }
          });
        }
      }
    });
  }, 2000);
  
  // Real-time WS Sync
  wsManager.subscribe('strategy@update', (data: any) => {
    if (data.id && data.metrics) {
      updateStrategy(data.id, data.metrics);
    }
  });

  wsManager.subscribe('strategy@node_state', (data: any) => {
    if (data.strategyId && data.nodeId) {
      updateNodeExecution(data.strategyId, data.nodeId, {
        status: data.status,
        latency: data.latency,
        output: data.output
      });
    }
  });
}
