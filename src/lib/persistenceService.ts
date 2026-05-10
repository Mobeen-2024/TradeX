import { redis } from './redis.ts';
import { db } from './db.ts';
import { RuntimeLog } from './stateSyncManager.ts';

/**
 * Production-Grade Persistence Service
 * 
 * Implements the "Write-Behind" pattern by asynchronously draining
 * Redis lists and snapshots into PostgreSQL. This prevents I/O blocking
 * in the hot trading path.
 */
class PersistenceService {
  private logDrainInterval: NodeJS.Timeout | null = null;
  private strategySyncInterval: NodeJS.Timeout | null = null;
  private isProcessingLogs = false;

  start() {
    console.log('[Persistence] Starting Write-Behind Sync Engine...');
    
    // Drain logs every 5 seconds
    this.logDrainInterval = setInterval(() => this.drainLogs(), 5000);
    
    // Sync strategy metadata every 30 seconds
    this.strategySyncInterval = setInterval(() => this.syncStrategies(), 30000);
    
    // Sync active positions every 10 seconds
    setInterval(() => this.syncPositions(), 10000);
  }

  stop() {
    if (this.logDrainInterval) clearInterval(this.logDrainInterval);
    if (this.strategySyncInterval) clearInterval(this.strategySyncInterval);
  }

  /**
   * Batches logs from Redis and bulk-inserts into PostgreSQL
   */
  private async drainLogs() {
    if (this.isProcessingLogs) return;
    this.isProcessingLogs = true;

    try {
      // Pull up to 100 logs at once
      const rawLogs = await redis.lrange('tradex:runtime:logs', 0, 99);
      if (rawLogs.length === 0) {
        this.isProcessingLogs = false;
        return;
      }

      const logs: RuntimeLog[] = rawLogs.map(l => JSON.parse(l));
      
      // Filter out any strategies that might not exist yet in DB (safety)
      // In a real system, we'd ensures strategies exist before logs.
      
      await db.executionLog.createMany({
        data: logs.map(l => ({
          id: l.id,
          strategyId: l.strategyId,
          level: l.level,
          message: l.message,
          nodeId: l.nodeId,
          data: l.data ? JSON.parse(JSON.stringify(l.data)) : undefined,
          timestamp: new Date(l.timestamp)
        }))
      });

      // Atomic trim: only remove the number of items we successfully processed
      await redis.ltrim('tradex:runtime:logs', rawLogs.length, -1);
      
      console.log(`[Persistence] Drained ${rawLogs.length} logs to PostgreSQL.`);
    } catch (e: any) {
      // Suppress connection errors when running in offline/mock mode
      if (e.message && e.message.includes('Connection is closed')) {
        return;
      }
      console.error('[Persistence] Log drain failed:', e);
    } finally {
      this.isProcessingLogs = false;
    }
  }

  /**
   * Syncs the current hot-state of all running strategies to durable storage
   */
  private async syncStrategies() {
    try {
      const rawStrategies = await redis.hgetall('tradex:runtime:strategies');
      const strategies = Object.values(rawStrategies).map(s => JSON.parse(s as string));

      for (const strategy of strategies) {
        // 1. Ensure the core Strategy container exists (using any to bypass stale types if needed)
        await (db.strategy as any).upsert({
          where: { id: strategy.id },
          update: { updatedAt: new Date() },
          create: {
            id: strategy.id,
            name: strategy.name,
            description: strategy.description || 'Auto-created from runtime'
          }
        });

        // 2. Sync the StrategyRuntime (hot metrics)
        await (db as any).strategyRuntime.upsert({
          where: { strategyId: strategy.id },
          update: {
            status: strategy.status,
            roi: strategy.roi,
            trades: strategy.trades,
            winRate: strategy.winRate,
            pnlUsdt: strategy.pnlUsdt,
            errorCount: strategy.errorCount,
            signalsProcessed: strategy.signalsProcessed,
            lastPing: new Date()
          },
          create: {
            strategyId: strategy.id,
            status: strategy.status,
            roi: strategy.roi,
            trades: strategy.trades,
            winRate: strategy.winRate,
            pnlUsdt: strategy.pnlUsdt,
            errorCount: strategy.errorCount,
            signalsProcessed: strategy.signalsProcessed
          }
        });
      }
      
      if (strategies.length > 0) {
        console.log(`[Persistence] Synced ${strategies.length} active strategies to PostgreSQL.`);
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Connection is closed')) return;
      console.error('[Persistence] Strategy sync failed:', e);
    }
  }

  /**
   * Mirrors all active Redis positions to PostgreSQL
   */
  private async syncPositions() {
    try {
      const rawPositions = await redis.hgetall('tradex:positions');
      const positions = Object.values(rawPositions).map(p => JSON.parse(p as string));

      for (const pos of positions) {
        await db.position.upsert({
          where: { id: pos.id },
          update: {
            pair: pos.pair || pos.symbol,
            type: pos.type,
            leverage: pos.leverage,
            size: pos.size,
            cost: pos.cost,
            entry: pos.entry,
            mark: pos.mark,
            status: 'OPEN',
            strategyId: pos.strategyId
          },
          create: {
            id: pos.id,
            pair: pos.pair || pos.symbol,
            type: pos.type,
            leverage: pos.leverage,
            size: pos.size,
            cost: pos.cost,
            entry: pos.entry,
            mark: pos.mark,
            status: 'OPEN',
            strategyId: pos.strategyId
          }
        });
      }
      
      // Cleanup: Mark positions in DB as CLOSED if they are no longer in Redis
      const redisIds = positions.map(p => p.id);
      await db.position.updateMany({
        where: {
          id: { notIn: redisIds },
          status: 'OPEN'
        },
        data: {
          status: 'CLOSED',
          closedAt: new Date()
        }
      });

    } catch (e: any) {
      if (e.message && e.message.includes('Connection is closed')) return;
      console.error('[Persistence] Position sync failed:', e);
    }
  }
}

export const persistenceService = new PersistenceService();
