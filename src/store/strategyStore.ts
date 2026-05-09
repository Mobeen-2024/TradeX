import { ref, computed, watch } from 'vue';
import { addNotification } from './alertStore';
import { placeOrder, activePositions, closePosition, availableUsdt, openOrders, cancelOrder } from './tradeStore';
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

// Portfolio Intelligence Layer
export const portfolioMetrics = ref({
  totalEquity: 10000,
  initialEquity: 10000,
  drawdown: 0,
  isLocked: false,
  lockExpiry: 0
});

export const riskSettings = ref({
  minConfidence: 75,
  maxRiskScore: 'medium',
  defaultPositionPercent: 5,
  maxLeverage: 10,
  globalDrawdownLimit: 8, // 8% Panic Trigger
  lockDurationMs: 5 * 60 * 1000 // 5 minutes
});

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
 * PHASE 3: MACRO AUTOMATION ENGINE
 * Converts simple buttons into executable automation pipelines
 */

export const triggerMacro = async (macroId: string) => {
  logRuntimeEvent('system', 'WARN', `Automation Pipeline [${macroId}] initiated.`);
  
  try {
    switch (macroId) {
      case '3': // Panic Close Pipeline
        logRuntimeEvent('system', 'EXEC', 'Step 1: Fetching all active orders/positions...');
        
        // 1. Cancel Pending Orders
        if (openOrders.value.length > 0) {
          logRuntimeEvent('system', 'EXEC', `Step 2: Cancelling ${openOrders.value.length} pending orders.`);
          for (const order of openOrders.value) {
            await cancelOrder(order.id);
          }
        }

        // 2. Market Close All Positions
        if (activePositions.value.length > 0) {
          logRuntimeEvent('system', 'EXEC', `Step 3: Closing ${activePositions.value.length} active positions.`);
          for (const pos of activePositions.value) {
            await closePosition(pos.id);
          }
        }

        // 3. Lock Trading
        logRuntimeEvent('system', 'WARN', 'Step 4: Executing trading lock (Cool-off period).');
        portfolioMetrics.value.isLocked = true;
        portfolioMetrics.value.lockExpiry = Date.now() + riskSettings.value.lockDurationMs;
        
        addNotification({
          type: 'error',
          title: 'GLOBAL PANIC EXECUTED',
          message: 'All positions closed. Trading locked for 5m.'
        });
        break;

      case '2': // Smart Scale Out
        logRuntimeEvent('system', 'EXEC', 'Analyzing profitable positions for harvesting...');
        const profitable = activePositions.value.filter(p => (p.pnl || 0) > 0);
        
        if (profitable.length === 0) {
          logRuntimeEvent('system', 'INFO', 'No profitable positions detected. Aborting scale out.');
          return false;
        }

        for (const pos of profitable) {
          logRuntimeEvent('system', 'EXEC', `Harvesting 25% profit on ${pos.pair}`);
          // Simulated partial close
          await closePosition(pos.id); 
        }
        break;
    }
    return true;
  } catch (err) {
    logRuntimeEvent('system', 'ERROR', `Automation Pipeline failed: ${(err as Error).message}`);
    return false;
  }
};

/**
 * Intelligence Layer: Global Safety Monitor
 * Triggers autonomous protection if thresholds are breached
 */
const runGlobalSafetyMonitor = () => {
  // Calculate Drawdown
  const currentPnl = activePositions.value.reduce((acc, p) => acc + (p.pnl || 0), 0);
  const totalEquity = availableUsdt.value + currentPnl;
  
  const drawdown = ((portfolioMetrics.value.initialEquity - totalEquity) / portfolioMetrics.value.initialEquity) * 100;
  portfolioMetrics.value.drawdown = parseFloat(drawdown.toFixed(2));
  portfolioMetrics.value.totalEquity = totalEquity;

  // Check Panic Condition
  if (drawdown >= riskSettings.value.globalDrawdownLimit && !portfolioMetrics.value.isLocked) {
    logRuntimeEvent('system', 'ERROR', `CRITICAL: Portfolio drawdown (${drawdown}%) exceeded limit!`);
    triggerMacro('3'); // Auto-trigger Panic Close
  }

  // Handle Lock Expiry
  if (portfolioMetrics.value.isLocked && Date.now() > portfolioMetrics.value.lockExpiry) {
    portfolioMetrics.value.isLocked = false;
    logRuntimeEvent('system', 'INFO', 'Trading lock expired. System back to operational.');
  }
};

/**
 * Pipeline Execution with Lock Check
 */
export const dispatchSignal = async (rawSignal: any) => {
  if (portfolioMetrics.value.isLocked) {
    logRuntimeEvent('system', 'WARN', 'Signal rejected: Trading is currently locked.');
    return false;
  }

  // (Existing Pipeline Logic from Phase 2...)
  // 1. Parse
  const signal = {
    id: rawSignal.id || `sig_${Math.random().toString(36).substring(7)}`,
    asset: rawSignal.asset || rawSignal.symbol || 'BTCUSDT',
    direction: (rawSignal.direction || rawSignal.type || 'long').toLowerCase() as 'long' | 'short',
    confidence: rawSignal.confidence || 0,
    riskScore: rawSignal.riskScore || 'medium',
    entry: typeof rawSignal.entry === 'string' ? parseFloat(rawSignal.entry.replace(/[^0-9.]/g, '')) : rawSignal.entry,
    stopLoss: typeof rawSignal.stopLoss === 'string' ? parseFloat(rawSignal.stopLoss.replace(/[^0-9.]/g, '')) : rawSignal.stopLoss,
    takeProfit: typeof rawSignal.takeProfit === 'string' ? parseFloat(rawSignal.takeProfit.replace(/[^0-9.]/g, '')) : rawSignal.takeProfit,
    aiReasoning: rawSignal.aiReasoning || rawSignal.reasoning || [],
    timestamp: Date.now()
  };

  // 2. Risk Validation
  if (signal.confidence < riskSettings.value.minConfidence) {
    logRuntimeEvent('system', 'WARN', `Blocked: Low confidence (${signal.confidence}%)`);
    return false;
  }

  // 3. Execution
  try {
    const quantity = (availableUsdt.value * 0.05) / signal.entry; // 5% risk
    const result = await placeOrder({
      pair: signal.asset.replace('/', ''),
      side: signal.direction === 'long' ? 'Buy' : 'Sell' as const,
      type: 'MARKET',
      quantity,
      leverage: '10x',
      cost: quantity * signal.entry,
      takeProfitPrice: signal.takeProfit,
      stopLossPrice: signal.stopLoss,
    });
    return !!result;
  } catch (err) {
    return false;
  }
};

// --- Lifecycle & Heartbeat ---
if (typeof window !== 'undefined') {
  setInterval(() => {
    // 1. Performance Sim
    strategies.value.forEach(s => {
      if (s.status === 'running') {
        s.roi = parseFloat((s.roi + (Math.random() - 0.5) * 0.05).toFixed(2));
        s.pnlUsdt = parseFloat((s.pnlUsdt + (Math.random() - 0.5) * 0.1).toFixed(2));
      }
    });

    // 2. Intelligence Layer Monitor
    runGlobalSafetyMonitor();
  }, 2000);
}

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
  if (strategy.status === 'running') strategy.status = 'paused';
  else strategy.status = 'running';
};
export const executeSignal = dispatchSignal;
