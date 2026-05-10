import { stateSyncManager } from '../src/lib/stateSyncManager.ts';
import { redis } from '../src/lib/redis.ts';

async function createDemo() {
  const strategy = {
    id: 'strat_' + Math.random().toString(36).substr(2, 9),
    name: 'Neural Momentum Scalper',
    type: 'Neural Network',
    status: 'RUNNING',
    roi: 12.5,
    trades: 42,
    winRate: 68.5,
    pnlUsdt: 1250.40,
    alloc: 10000,
    pairs: ['BTC/USDT', 'ETH/USDT'],
    nodes: [
      { id: '1', type: 'entry', data: { label: 'EMA Cross' }, position: { x: 100, y: 100 } },
      { id: '2', type: 'execute', data: { label: 'Market Buy' }, position: { x: 400, y: 100 } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' }
    ],
    settings: {
      timeframe: '5m',
      risk: 'medium'
    },
    createdAt: Date.now()
  };

  console.log('Deploying Demo Strategy to Runtime...');
  await stateSyncManager.snapshotStrategy(strategy);
  
  // Also queue a log to show it working
  await stateSyncManager.queueLog(strategy.id, 'INFO', 'Strategy initialized and connected to neural gateway.');
  await stateSyncManager.queueLog(strategy.id, 'EXEC', 'Awaiting next EMA signal on BTC/USDT 5m.');

  console.log('✅ Strategy Deployed!');
  console.log('Strategy ID:', strategy.id);
  console.log('Check your browser at http://127.0.0.1:3000/signals');
  
  process.exit(0);
}

createDemo();
