import { ref, computed } from 'vue';
import { addNotification } from './alertStore';
import { placeOrder, activePositions, closePosition, availableUsdt } from './tradeStore';
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

// Institutional Signal Type
export interface AiSignal {
  id: string;
  asset: string;
  direction: 'long' | 'short';
  confidence: number;
  riskScore: 'low' | 'medium' | 'high';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  aiReasoning: string[];
  marketRegime?: string;
  volatilityScore?: number;
  timestamp: number;
}

// --- Reactive State ---

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

export const activeExecutions = ref<Record<string, { startTime: number; lastTick: number }>>({});
export const executionLogs = ref<ExecutionLog[]>([]);
export const signalQueue = ref<AiSignal[]>([]);
export const nodeExecutionMap = ref<Record<string, Record<string, NodeExecutionState>>>({});

// Pipeline Thresholds
export const riskSettings = ref({
  minConfidence: 75,
  maxRiskScore: 'medium',
  defaultPositionPercent: 5, // 5% of available
  maxLeverage: 10
});

// --- Pipeline Logic Layers ---

/**
 * Layer 1: Signal Parser
 * Normalizes incoming data from various AI models
 */
const parseSignal = (rawSignal: any): AiSignal => {
  return {
    id: rawSignal.id || `sig_${Math.random().toString(36).substring(7)}`,
    asset: rawSignal.asset || rawSignal.symbol || 'BTCUSDT',
    direction: (rawSignal.direction || rawSignal.type || 'long').toLowerCase() as 'long' | 'short',
    confidence: rawSignal.confidence || 0,
    riskScore: rawSignal.riskScore || 'medium',
    entry: typeof rawSignal.entry === 'string' ? parseFloat(rawSignal.entry.replace(/[^0-9.]/g, '')) : rawSignal.entry,
    stopLoss: typeof rawSignal.stopLoss === 'string' ? parseFloat(rawSignal.stopLoss.replace(/[^0-9.]/g, '')) : rawSignal.stopLoss,
    takeProfit: typeof rawSignal.takeProfit === 'string' ? parseFloat(rawSignal.takeProfit.replace(/[^0-9.]/g, '')) : rawSignal.takeProfit,
    aiReasoning: rawSignal.aiReasoning || rawSignal.reasoning || [],
    marketRegime: rawSignal.marketRegime || 'Trend',
    volatilityScore: rawSignal.volatilityScore || 50,
    timestamp: Date.now()
  };
};

/**
 * Layer 2: Risk Engine
 * Evaluates execution safety
 */
const runRiskEngine = (signal: AiSignal): { safe: boolean; reason?: string } => {
  if (signal.confidence < riskSettings.value.minConfidence) {
    return { safe: false, reason: `Low confidence (${signal.confidence}%)` };
  }
  
  if (signal.riskScore === 'high' && riskSettings.value.maxRiskScore !== 'high') {
    return { safe: false, reason: 'Risk score too high for current profile' };
  }

  return { safe: true };
};

/**
 * Layer 3: Position Sizing
 * Dynamically scales position based on confidence
 */
const calculatePositionSize = (signal: AiSignal): number => {
  const basePercent = riskSettings.value.defaultPositionPercent;
  const confidenceMultiplier = signal.confidence / 100;
  const usdtAmount = availableUsdt.value * (basePercent / 100) * confidenceMultiplier;
  
  // Return quantity (simplified BTC assumption for demo)
  return parseFloat((usdtAmount / signal.entry).toFixed(4));
};

// --- Engine Actions ---

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

export const updateNodeExecution = (strategyId: string, nodeId: string, updates: Partial<NodeExecutionState>) => {
  if (!nodeExecutionMap.value[strategyId]) nodeExecutionMap.value[strategyId] = {};
  nodeExecutionMap.value[strategyId][nodeId] = {
    ...(nodeExecutionMap.value[strategyId][nodeId] || { status: 'idle', latency: 0, output: {}, lastExecution: 0 }),
    ...updates,
    lastExecution: updates.status === 'success' || updates.status === 'failed' ? Date.now() : (nodeExecutionMap.value[strategyId][nodeId]?.lastExecution || 0)
  };
};

/**
 * PHASE 2: Institutional Signal Pipeline
 */
export const dispatchSignal = async (rawSignal: any) => {
  // 1. Parse
  const signal = parseSignal(rawSignal);
  signalQueue.value.push(signal);
  logRuntimeEvent('system', 'INFO', `Signal parsed: ${signal.direction.toUpperCase()} ${signal.asset} @ ${signal.entry}`);

  // 2. Risk Validation (Confidence Layer)
  const riskCheck = runRiskEngine(signal);
  if (!riskCheck.safe) {
    logRuntimeEvent('system', 'WARN', `Execution blocked: ${riskCheck.reason}`, undefined, signal);
    addNotification({
      type: 'warning',
      title: 'Signal Blocked',
      message: `Risk Engine rejected ${signal.asset}: ${riskCheck.reason}`
    });
    return false;
  }

  // 3. Sizing
  const quantity = calculatePositionSize(signal);
  logRuntimeEvent('system', 'INFO', `Sizing calculated: ${quantity} unit(s) based on ${signal.confidence}% confidence`);

  // 4. Execution
  try {
    const orderData = {
      pair: signal.asset.replace('/', ''),
      side: signal.direction === 'long' ? 'Buy' : 'Sell' as const,
      type: 'MARKET',
      quantity,
      leverage: `${riskSettings.value.maxLeverage}x`,
      cost: quantity * signal.entry,
      takeProfitPrice: signal.takeProfit,
      stopLossPrice: signal.stopLoss,
    };

    const result = await placeOrder(orderData);
    if (result) {
      logRuntimeEvent('system', 'EXEC', `Institutional Pipeline: Position Created for ${signal.asset}`, undefined, { signalId: signal.id, quantity });
      addNotification({
        type: 'success',
        title: 'Signal Executed',
        message: `Pipeline confirmed: ${signal.direction.toUpperCase()} ${signal.asset} position live.`
      });
      return true;
    }
  } catch (err) {
    logRuntimeEvent('system', 'ERROR', `Pipeline Execution failed: ${(err as Error).message}`);
  }
  return false;
};

export const startStrategy = async (id: string) => {
  const strategy = strategies.value.find(s => s.id === id);
  if (!strategy) return;
  strategy.status = 'running';
  activeExecutions.value[id] = { startTime: Date.now(), lastTick: Date.now() };
  logRuntimeEvent(id, 'INFO', `Strategy engine ${strategy.name} initiated.`);
};

export const pauseStrategy = (id: string) => {
  const strategy = strategies.value.find(s => s.id === id);
  if (strategy) {
    strategy.status = 'paused';
    delete activeExecutions.value[id];
  }
};

export const triggerMacro = async (macroId: string) => {
  logRuntimeEvent('system', 'WARN', `Macro Protocol ${macroId} triggered.`);
  try {
    switch (macroId) {
      case '3':
        for (const pos of activePositions.value) await closePosition(pos.id);
        break;
      case '2':
        const profitable = activePositions.value.filter(p => (p.pnl || 0) > 0);
        for (const pos of profitable) await closePosition(pos.id);
        break;
    }
    return true;
  } catch (err) {
    return false;
  }
};

// Compatibility
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

// Heartbeat
if (typeof window !== 'undefined') {
  setInterval(() => {
    strategies.value.forEach(s => {
      if (s.status === 'running') {
        s.roi = parseFloat((s.roi + (Math.random() - 0.5) * 0.05).toFixed(2));
        s.pnlUsdt = parseFloat((s.pnlUsdt + (Math.random() - 0.5) * 0.1).toFixed(2));
        s.lastPing = `${Math.floor(Math.random() * 15 + 2)}ms`;
      }
    });
  }, 2000);
}
