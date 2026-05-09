import { ref, computed, watch } from 'vue';
import { addNotification } from './alertStore';
import { placeOrder, activePositions, closePosition, availableUsdt, openOrders, cancelOrder } from './tradeStore';
import { wsManager } from '../lib/wsManager';
import { eventBus } from '../lib/eventBus';

// --- Core Types ---
export type StrategyStatus = 'running' | 'paused' | 'waiting' | 'error' | 'idle';
export type NodeStatus = 'running' | 'success' | 'failed' | 'idle';
export type HealthStatus = 'optimal' | 'degraded' | 'critical';

export interface LatencyMetrics {
  exchange: number;
  ai: number;
  network: number;
}

export interface AiAdvisory {
  id: string;
  strategyId: string;
  type: 'OPTIMIZATION' | 'RISK_ALERT' | 'ANOMALY';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
  impact: string;
  timestamp: number;
  isApplied: boolean;
}

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
  health: HealthStatus;
  roi: number;
  trades: number;
  winRate: number;
  pnlUsdt: number;
  alloc: number;
  pairs: string[];
  lastPing: string;
  lastHeartbeat: number;
  latency: LatencyMetrics;
  errorCount: number;
  signalsProcessed: number;
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
  entry: number;
  stopLoss: number;
  takeProfit: number;
  aiReasoning: string[];
  timestamp: number;
}

// --- Reactive State (The Runtime Core) ---

export const strategies = ref<Strategy[]>([
  { 
    id: '1', name: 'Momentum Scalper', type: 'Scalp Engine', status: 'running', health: 'optimal',
    roi: 12.4, trades: 14, winRate: 68, pnlUsdt: 12.50, alloc: 100,
    pairs: ['BTC/USDT', 'ETH/USDT'], lastPing: '12ms', lastHeartbeat: Date.now(),
    latency: { exchange: 12, ai: 450, network: 15 },
    errorCount: 0, signalsProcessed: 142
  },
  { 
    id: '4', name: 'Delta Neutral Hedge', type: 'Risk Manager', status: 'running', health: 'optimal',
    roi: 1.8, trades: 42, winRate: 98, pnlUsdt: 2.70, alloc: 150,
    pairs: ['SOL/USDT', 'BNB/USDT'], lastPing: '8ms', lastHeartbeat: Date.now(),
    latency: { exchange: 8, ai: 380, network: 12 },
    errorCount: 0, signalsProcessed: 850
  },
  { 
    id: '2', name: 'Bin/Byb Arb', type: 'Arb Network', status: 'paused', health: 'critical',
    roi: 2.1, trades: 104, winRate: 94, pnlUsdt: 1.05, alloc: 50,
    pairs: ['XRP/USDT', 'ADA/USDT'], lastPing: 'Offline', lastHeartbeat: 0,
    latency: { exchange: 0, ai: 0, network: 0 },
    errorCount: 12, signalsProcessed: 1204
  },
]);

export const activeExecutions = ref<Record<string, { startTime: number; lastTick: number }>>({});
export const executionLogs = ref<ExecutionLog[]>([]);
export const signalQueue = ref<AiSignal[]>([]);
export const nodeExecutionMap = ref<Record<string, Record<string, NodeExecutionState>>>({});
export const aiAdvisories = ref<AiAdvisory[]>([]);

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
  globalDrawdownLimit: 8,
  lockDurationMs: 5 * 60 * 1000
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

/**
 * PHASE 7: AI ORCHESTRATION LAYER
 * Autonomous analysis and advisory generation
 */
const runAiOrchestrator = (strategy: Strategy) => {
  // 1. Performance Degradation Check
  if (strategy.status === 'running' && strategy.errorCount > 5) {
    const existing = aiAdvisories.value.find(a => a.strategyId === strategy.id && a.type === 'RISK_ALERT');
    if (!existing) {
      const advisory: AiAdvisory = {
        id: `adv_${Math.random().toString(36).substring(7)}`,
        strategyId: strategy.id,
        type: 'RISK_ALERT',
        severity: 'high',
        message: `${strategy.name} error rate is critical (>5 failures).`,
        suggestion: 'Reduce leverage by 50% or pause for diagnostics.',
        impact: 'High risk of liquidation on partial fills.',
        timestamp: Date.now(),
        isApplied: false
      };
      aiAdvisories.value.unshift(advisory);
      eventBus.publish('ai:analysis-complete', { type: 'advisory', advisory }, strategy.id);
      
      // Autonomous Intervention
      if (strategy.errorCount > 15) {
         strategy.status = 'paused';
         logRuntimeEvent(strategy.id, 'ERROR', 'AI ORCHESTRATOR: Strategy auto-paused due to critical failure rate.');
         addNotification({ type: 'error', title: 'Autonomous Intervention', message: `${strategy.name} auto-paused for safety.` });
      }
    }
  }

  // 2. Latency Anomaly Detection
  if (strategy.latency.ai > 800) {
     logRuntimeEvent(strategy.id, 'WARN', `AI ORCHESTRATOR: Neural inference latency spike detected (${strategy.latency.ai}ms).`);
  }
};

export const updateStrategyHealth = (id: string) => {
  const strategy = strategies.value.find(s => s.id === id);
  if (!strategy) return;

  strategy.lastHeartbeat = Date.now();
  strategy.latency.exchange = Math.floor(Math.random() * 20 + 5);
  strategy.latency.ai = Math.floor(Math.random() * 200 + 300);
  strategy.latency.network = Math.floor(Math.random() * 10 + 5);
  strategy.lastPing = `${strategy.latency.exchange}ms`;

  if (strategy.errorCount > 10 || strategy.latency.ai > 1000) {
    strategy.health = 'critical';
  } else if (strategy.errorCount > 2 || strategy.latency.exchange > 50) {
    strategy.health = 'degraded';
  } else {
    strategy.health = 'optimal';
  }

  // Run Orchestrator
  runAiOrchestrator(strategy);
};

export const toggleStrategyState = async (id: string) => {
  const strategy = strategies.value.find(s => s.id === id);
  if (!strategy) return;
  const isStarting = strategy.status !== 'running';
  strategy.status = isStarting ? 'running' : 'paused';
  if (isStarting) {
    strategy.lastHeartbeat = Date.now();
    eventBus.publish('strategy:started', strategy, id);
  } else {
    eventBus.publish('strategy:paused', strategy, id);
  }
};

export const dispatchSignal = async (rawSignal: any) => {
  if (portfolioMetrics.value.isLocked) return false;

  const strategyId = rawSignal.strategyId || 'system';
  const strategy = strategies.value.find(s => s.id === strategyId);

  eventBus.publish('ai:analysis-complete', { asset: rawSignal.asset, confidence: rawSignal.confidence }, strategyId);

  const signal = {
    id: rawSignal.id || `sig_${Math.random().toString(36).substring(7)}`,
    asset: rawSignal.asset || 'BTCUSDT',
    direction: (rawSignal.direction || 'long').toLowerCase() as 'long' | 'short',
    confidence: rawSignal.confidence || 0,
    entry: rawSignal.entry,
    stopLoss: rawSignal.stopLoss,
    takeProfit: rawSignal.takeProfit,
    timestamp: Date.now()
  };

  if (signal.confidence < riskSettings.value.minConfidence) {
    logRuntimeEvent(strategyId, 'WARN', `Signal Rejected: Low Confidence (${signal.confidence}%)`);
    eventBus.publish('risk:triggered', { reason: 'Low Confidence', confidence: signal.confidence }, strategyId);
    return false;
  }

  eventBus.publish('signal:created', signal, strategyId);

  try {
    const quantity = (availableUsdt.value * 0.05) / signal.entry;
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

    if (result) {
      if (strategy) {
        strategy.signalsProcessed++;
        logRuntimeEvent(strategyId, 'EXEC', `Autonomous trade successful on ${signal.asset}`);
      }
      eventBus.publish('position:opened', { asset: signal.asset, direction: signal.direction, quantity }, strategyId);
      return true;
    }
    
    if (strategy) strategy.errorCount++;
    return false;
  } catch (err) {
    if (strategy) strategy.errorCount++;
    logRuntimeEvent(strategyId, 'ERROR', `Execution Error: ${(err as Error).message}`);
    return false;
  }
};

export const triggerMacro = async (macroId: string) => {
  logRuntimeEvent('system', 'WARN', `Macro ${macroId} invoked.`);
  try {
    switch (macroId) {
      case '3':
        for (const pos of activePositions.value) await closePosition(pos.id);
        portfolioMetrics.value.isLocked = true;
        portfolioMetrics.value.lockExpiry = Date.now() + riskSettings.value.lockDurationMs;
        eventBus.publish('macro:executed', { macroId, result: 'Panic Close Success' }, 'system');
        break;
      case '2':
        const profitable = activePositions.value.filter(p => (p.pnl || 0) > 0);
        for (const pos of profitable) await closePosition(pos.id);
        eventBus.publish('macro:executed', { macroId, result: 'Scale Out Success' }, 'system');
        break;
    }
    return true;
  } catch (err) {
    return false;
  }
};

// --- Runtime Heartbeat & Safety ---
if (typeof window !== 'undefined') {
  setInterval(() => {
    strategies.value.forEach(s => {
      if (s.status === 'running') {
        s.roi = parseFloat((s.roi + (Math.random() - 0.5) * 0.05).toFixed(2));
        s.pnlUsdt = parseFloat((s.pnlUsdt + (Math.random() - 0.5) * 0.1).toFixed(2));
        updateStrategyHealth(s.id);

        const droppedFrames = Math.random() > 0.99 ? 1 : 0;
        if (droppedFrames) logRuntimeEvent(s.id, 'WARN', 'Websocket frame dropped. Resyncing...');
      }
    });

    const currentPnl = activePositions.value.reduce((acc, p) => acc + (p.pnl || 0), 0);
    const totalEquity = availableUsdt.value + currentPnl;
    const drawdown = ((portfolioMetrics.value.initialEquity - totalEquity) / portfolioMetrics.value.initialEquity) * 100;
    portfolioMetrics.value.drawdown = parseFloat(drawdown.toFixed(2));
    
    if (drawdown >= riskSettings.value.globalDrawdownLimit && !portfolioMetrics.value.isLocked) {
      eventBus.publish('risk:triggered', { reason: 'Portfolio Drawdown Limit Exceeded', drawdown }, 'system');
      triggerMacro('3');
    }
  }, 3000);
}

// Compatibility
export const activeStrategies = strategies;
export const addStrategy = (strategy: Strategy) => strategies.value.unshift(strategy);
export const updateStrategy = (id: string, updates: Partial<Strategy>) => {
  const i = strategies.value.findIndex(s => s.id === id);
  if (i !== -1) strategies.value[i] = { ...strategies.value[i], ...updates };
};
export const executeSignal = dispatchSignal;
