import { ref } from 'vue';

export type StrategyStatus = 'running' | 'paused' | 'waiting' | 'error';

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

export const activeStrategies = ref<Strategy[]>([
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
  { 
    id: '3', name: 'Quantum Trend Follower', type: 'Swing AI', status: 'waiting', 
    roi: 45.8, trades: 6, winRate: 83, pnlUsdt: 0.00, alloc: 0,
    pairs: ['BTC/USDT'], lastPing: '110ms',
    nodes: [], edges: []
  },
]);

export const addStrategy = (strategy: Strategy) => {
  activeStrategies.value.push(strategy);
};

export const updateStrategy = (id: string, updates: Partial<Strategy>) => {
  const i = activeStrategies.value.findIndex(s => s.id === id);
  if (i !== -1) {
    activeStrategies.value[i] = { ...activeStrategies.value[i], ...updates };
  }
};

export const deleteStrategy = (id: string) => {
  activeStrategies.value = activeStrategies.value.filter(s => s.id !== id);
};
