import { workflowManager } from '../src/lib/workflow/workflowManager.ts';
import { redis } from '../src/lib/redis.ts';

async function createDemo() {
  const strategyId = 'strat_neural_momentum';
  
  const config = {
    name: 'Neural Momentum Scalper',
    description: 'Institutional-grade high frequency scalp agent using EMA crosses and Neural inference.',
    alloc: 10000,
    pairs: ['BTC/USDT', 'ETH/USDT'],
    nodes: [
      { id: '1', type: 'entry', data: { label: 'EMA Cross (14/28)' }, position: { x: 100, y: 100 } },
      { id: '2', type: 'execution', data: { label: 'Market Order' }, position: { x: 400, y: 100 } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' }
    ],
    settings: {
      timeframe: '5m',
      risk: 'medium'
    },
    commitMessage: 'Initial Deployment v1.0'
  };

  console.log('Deploying Demo Strategy via Versioning Engine...');
  await workflowManager.commit(strategyId, config);

  console.log('✅ Strategy Versioned and Deployed!');
  console.log('Strategy ID:', strategyId);
  console.log('Check your dashboard at http://localhost:3000/signals');
  
  process.exit(0);
}

createDemo();
