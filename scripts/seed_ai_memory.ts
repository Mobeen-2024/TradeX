import { memoryEngine } from '../src/lib/ai/memoryEngine.ts';
import { initQdrant } from '../src/lib/qdrant.ts';

async function seed() {
  console.log('Initializing Vector Collection...');
  await initQdrant();

  const lessons = [
    {
      strategyId: 'strat_neural_momentum',
      pair: 'ETHUSDT',
      side: 'LONG',
      pnlUsdt: -450,
      durationSec: 1200,
      exitReason: 'SL',
      marketContext: { btc_dominance: 53.5, rsi: 72, volume_spike: 'false' },
      expectedLesson: "ETH reversal setups fail frequently during high BTC dominance (over 52%)."
    },
    {
      strategyId: 'strat_neural_momentum',
      pair: 'BTCUSDT',
      side: 'SHORT',
      pnlUsdt: 1200,
      durationSec: 3600,
      exitReason: 'TP',
      marketContext: { btc_dominance: 51.0, rsi: 75, liquidation_cascade: 'true' },
      expectedLesson: "Shorting over-extended RSI levels is high-probability during liquidation cascades."
    },
    {
      strategyId: 'strat_neural_momentum',
      pair: 'SOLUSDT',
      side: 'LONG',
      pnlUsdt: -150,
      durationSec: 300,
      exitReason: 'SL',
      marketContext: { funding_rate: 0.01, spread_widening: 'true' },
      expectedLesson: "Scalping long on high-funding altcoins is risky when spreads widen."
    }
  ];

  console.log('Seeding AI Cognitive Memory with Institutional Lessons...');

  for (const item of lessons) {
    const { expectedLesson, ...outcomeData } = item;
    const result = await memoryEngine.learnFromOutcome(outcomeData as any);
    console.log(`- Seeded Memory: ${result}`);
  }

  console.log('\n✅ AI Memory Seeded Successfully!');
  process.exit(0);
}

seed();
