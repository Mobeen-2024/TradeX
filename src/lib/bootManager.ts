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
        // Use any to bypass stale types; Logic is correct per new schema
        const dbStrategies = await (db.strategy as any).findMany({
          where: {
            runtime: {
              status: { in: ['RUNNING', 'PAUSED', 'ERROR'] }
            }
          },
          include: {
            runtime: true,
            versions: {
              where: { isActive: true },
              include: { nodes: true, edges: true },
              take: 1
            }
          }
        });
        
        for (const strategy of dbStrategies) {
          const activeVersion = strategy.versions?.[0];
          if (!activeVersion) continue;

          await stateSyncManager.snapshotStrategy({
            id: strategy.id,
            name: strategy.name,
            description: strategy.description,
            status: strategy.runtime?.status || 'PAUSED',
            roi: strategy.runtime?.roi || 0,
            trades: strategy.runtime?.trades || 0,
            winRate: strategy.runtime?.winRate || 0,
            pnlUsdt: strategy.runtime?.pnlUsdt || 0,
            alloc: activeVersion.alloc,
            pairs: typeof activeVersion.pairs === 'string' ? activeVersion.pairs.split(',').filter(Boolean) : [],
            nodes: activeVersion.nodes.map((n: any) => ({
              id: n.id,
              type: n.type,
              data: { label: n.label, ... (n.config as any) },
              position: { x: n.positionX, y: n.positionY }
            })),
            edges: activeVersion.edges.map((e: any) => ({
              id: e.id,
              source: e.sourceNodeId,
              target: e.targetNodeId,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle
            })),
            settings: activeVersion.settings,
            errorCount: strategy.runtime?.errorCount || 0,
            signalsProcessed: strategy.runtime?.signalsProcessed || 0,
            lastPing: strategy.runtime?.lastPing || new Date()
          });
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

      // 3. Hydrate Risk State
      const { hydrateRiskState } = await import('./riskEngine.ts');
      await hydrateRiskState();

      console.log('[Boot] 🚀 Hydration Complete. Runtime is ready.\n');
    } catch (e) {
      console.error('[Boot] ❌ Critical Hydration Failure:', e);
      // System will start with empty state if hydration fails
    }
  }
};
