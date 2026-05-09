import { stateSyncManager } from './src/lib/stateSyncManager.ts';
import { redis, KEYS } from './src/lib/redis.ts';
import { db } from './src/lib/db.ts';
import { bootManager } from './src/lib/bootManager.ts';
import { persistenceService } from './src/lib/persistenceService.ts';

async function runTest() {
  console.log('🧪 Starting Recovery Stress Test...');

  const TEST_STRAT_ID = 'test_agent_crash_demo';
  const TEST_POS_ID = 'test_pos_recovery_demo';

  // 1. SETUP: Create active state
  console.log('1. Seeding runtime state...');
  const strategy = {
    id: TEST_STRAT_ID,
    name: 'Crash Test Bot',
    type: 'Neural Scalper',
    status: 'RUNNING',
    alloc: 5000,
    pairs: 'BTC/USDT',
    nodes: [],
    edges: []
  };

  const position = {
    id: TEST_POS_ID,
    strategyId: TEST_STRAT_ID,
    pair: 'BTCUSDT',
    type: 'LONG',
    size: 0.1,
    entry: 65000,
    cost: 6500,
    leverage: 10,
    mark: 65000
  };

  await stateSyncManager.snapshotStrategy(strategy);
  await redis.hset(KEYS.positions, TEST_POS_ID, JSON.stringify(position));
  await redis.sadd(KEYS.symbolPositions('btcusdt'), TEST_POS_ID);

  console.log('✅ State seeded in Redis.');

  // 2. PERSISTENCE: Force sync to PostgreSQL (Simulating the 30s background wait)
  console.log('2. Forcing persistence sync to PostgreSQL...');
  // We access the private methods via any for testing
  await (persistenceService as any).syncStrategies();
  await (persistenceService as any).syncPositions();
  console.log('✅ State persisted to PostgreSQL.');

  // 3. CRASH: Wipe Redis hot state (Simulating a total memory/cache loss)
  console.log('3. CRASHING: Wiping Redis hot state...');
  await redis.del('tradex:runtime:strategies');
  await redis.del(KEYS.positions);
  await redis.del(KEYS.symbolPositions('btcusdt'));
  console.log('💀 Redis is now empty. Hot state lost.');

  // 4. RECOVERY: Hydrate from PostgreSQL (Cold Boot)
  console.log('4. RECOVERING: Running BootManager Hydration...');
  await bootManager.hydrateRuntime();

  // 5. VERIFY: Check if Redis has the data again
  console.log('5. VERIFYING: Checking restored state...');
  const recoveredStrat = await redis.hget('tradex:runtime:strategies', TEST_STRAT_ID);
  const recoveredPos = await redis.hget(KEYS.positions, TEST_POS_ID);

  if (recoveredStrat && recoveredPos) {
    console.log('\n✨ RECOVERY SUCCESSFUL! ✨');
    console.log('Strategy Recovered:', JSON.parse(recoveredStrat).name);
    console.log('Position Recovered:', JSON.parse(recoveredPos).id);
  } else {
    console.log('\n❌ RECOVERY FAILED ❌');
    if (!recoveredStrat) console.log('- Strategy missing');
    if (!recoveredPos) console.log('- Position missing');
  }

  // Cleanup test data
  console.log('\nCleaning up test data...');
  await redis.del('tradex:runtime:strategies');
  await redis.del(KEYS.positions);
  await db.strategy.delete({ where: { id: TEST_STRAT_ID } }).catch(() => {});
  await db.position.delete({ where: { id: TEST_POS_ID } }).catch(() => {});
  
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
