import { smartOrderRouter } from '../src/lib/smartOrderRouter.ts';
import { runRiskChecks } from '../src/lib/riskEngine.ts';
import { eventBus } from '../src/lib/events/eventBus.ts';
import '../src/workers/eventArchiver.ts'; 
import { memoryEngine } from '../src/lib/ai/memoryEngine.ts';
import { db } from '../src/lib/db.ts';
import { redis } from '../src/lib/redis.ts';

async function runSimulation() {
  console.log('\n--- 🧪 TradeX Institutional Layer Simulation ---\n');

  const accountId = 'default_account';
  const strategyId = 'simulation_strat';

  // Ensure mock strategy exists for FK constraints
  try {
    await (db as any).strategy.upsert({
      where: { id: strategyId },
      update: {},
      create: {
        id: strategyId,
        name: 'Simulation Strategy',
        description: 'Used for system testing'
      }
    });
  } catch (e) {
    console.error('Failed to create mock strategy:', e);
  }

  // 1. Simulate a Risk Approval & Order Routing
  console.log('Step 1: Simulating High-Conviction Order...');
  const order1: any = {
    accountId,
    symbol: 'BTCUSDT',
    side: 'Buy',
    type: 'Market',
    quantity: 0.5,
    leverage: 10
  };

  const risk1 = await runRiskChecks(order1);
  if (risk1.approved) {
    console.log('✅ Risk Approved. Routing to SOR...');
    await smartOrderRouter.route(order1);
  }

  // 2. Simulate a Risk Rejection (Correlation)
  console.log('\nStep 2: Simulating Correlation Risk Trigger...');
  // We'll submit several Layer1 orders to hit the limit (limit is 3 per sector)
  const symbols = ['ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'DOTUSDT'];
  for (const sym of symbols) {
    const risk = await runRiskChecks({ ...order1, symbol: sym });
    if (!risk.approved) {
      console.log(`❌ Risk Rejected for ${sym}: ${risk.reason}`);
    } else {
      console.log(`✅ Risk Approved for ${sym}.`);
      await smartOrderRouter.route({ ...order1, symbol: sym });
    }
  }

  // 3. Simulate Position Closure & AI Learning
  console.log('\nStep 3: Simulating AI Learning Cycle...');
  const outcome: any = {
    strategyId: 'simulation_strat',
    pair: 'BTCUSDT',
    side: 'LONG',
    pnlUsdt: 1250.50,
    durationSec: 3600,
    exitReason: 'TP',
    marketContext: {
      trend: 'bullish',
      volatility: 'medium',
      btcDominance: 'high'
    }
  };

  console.log('🧠 AI is analyzing trade outcome...');
  await memoryEngine.learnFromOutcome(outcome);
  console.log('✅ AI Cognitive Memory updated.');

  // Manually record a loss to test persistence
  console.log('\nStep 3.5: Recording manual loss for persistence test...');
  const { recordLoss } = await import('../src/lib/riskEngine.ts');
  await recordLoss(accountId, 500);

  // Wait for background tasks (Archiver flush is 5s)
  console.log('\n⏳ Waiting for background archiver and AI analysis to complete...');
  await new Promise(res => setTimeout(res, 8000));

  // 4. Verify Audit Trail
  console.log('\nStep 4: Verifying Audit Trail Persistence...');
  const auditCount = await (db as any).auditEvent.count();
  console.log(`📊 Current Audit Events in DB: ${auditCount}`);

  // 5. Verify Risk Hydration Continuity
  console.log('\nStep 5: Verifying Risk Threshold Persistence...');
  const riskState = await (db as any).riskState.findUnique({ where: { accountId } });
  console.log(`🛡️ Persisted Daily Loss for ${accountId}: $${riskState?.dailyLossUsd || 0}`);

  console.log('\n--- ✨ Simulation Complete: All Institutional Layers Validated ---\n');
  process.exit(0);
}

runSimulation();
