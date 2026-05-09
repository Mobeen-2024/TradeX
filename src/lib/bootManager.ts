import { redis, KEYS } from './redis.ts';
import { db } from './db.ts';
import { stateSyncManager } from './stateSyncManager.ts';

/**
 * Production-Grade Boot Manager
 * 
 * Orchestrates the hydration of runtime state from Redis (Hot)
 * or PostgreSQL (Cold) upon service startup.
 */
export const bootManager = {
  async hydrateRuntime() {
    console.log('\n[Boot] 🌊 Starting State Hydration Sequence...');
    
    try {
      // 1. Recover Active Strategies
      const hotStrategies = await redis.hgetall('tradex:runtime:strategies');
      
      if (Object.keys(hotStrategies).length > 0) {
        console.log(`[Boot] 🔥 Warm Boot: Recovered ${Object.keys(hotStrategies).length} strategies from Redis.`);
      } else {
        console.log('[Boot] ❄️ Cold Boot: Redis empty. Hydrating from PostgreSQL...');
        const dbStrategies = await db.strategy.findMany({
          where: {
            status: { in: ['RUNNING', 'PAUSED', 'ERROR'] }
          }
        });
        
        for (const strategy of dbStrategies) {
          await stateSyncManager.snapshotStrategy(strategy);
        }
        console.log(`[Boot] ✅ Hydrated ${dbStrategies.length} strategies to hot state.`);
      }

      // 2. Recover Active Positions
      const hotPositions = await redis.hgetall(KEYS.positions);
      if (Object.keys(hotPositions).length > 0) {
        console.log(`[Boot] 🔥 Warm Boot: Recovered ${Object.keys(hotPositions).length} positions from Redis.`);
      } else {
        console.log('[Boot] ❄️ Cold Boot: Restoring positions from PostgreSQL...');
        const dbPositions = await db.position.findMany({
          where: { status: 'OPEN' }
        });
        
        for (const pos of dbPositions) {
          await redis.hset(KEYS.positions, pos.id, JSON.stringify(pos));
          if (pos.pair) await redis.sadd(KEYS.symbolPositions(pos.pair.toLowerCase()), pos.id);
        }
        console.log(`[Boot] ✅ Hydrated ${dbPositions.length} open positions.`);
      }

      console.log('[Boot] 🚀 Hydration Complete. Runtime is ready.\n');
    } catch (e) {
      console.error('[Boot] ❌ Critical Hydration Failure:', e);
      // System will start with empty state if hydration fails
    }
  }
};
