import { db } from '../lib/db.ts';
import { redis, getPositions } from '../lib/redis.ts';
import { eventBus } from '../lib/events/eventBus.ts';

const SNAPSHOT_INTERVAL = 15 * 60 * 1000; // 15 minutes

class PortfolioArchiver {
  private timer: any = null;

  constructor() {
    this.start();
  }

  private async start() {
    console.log('[PortfolioArchiver] Telemetry engine active.');
    this.timer = setInterval(() => this.takeSnapshots(), SNAPSHOT_INTERVAL);
    
    // Take an initial snapshot on boot
    setTimeout(() => this.takeSnapshots(), 5000);
  }

  private async takeSnapshots() {
    try {
      // For this demo/platform, we'll assume a single main account or loop through active accounts
      // In a real multi-user system, we'd query active account IDs from Redis
      const accountIds = ['default_account']; // placeholder

      for (const accountId of accountIds) {
        const positions = await getPositions();
        const accountPositions = positions.filter(p => p.accountId === accountId);
        
        const unrealizedPnl = accountPositions.reduce((sum, p) => sum + (p.liveDelta ?? 0), 0);
        const costBasis = accountPositions.reduce((sum, p) => sum + p.cost, 0);
        
        // Equity = Balance (simulated) + Unrealized
        const storedEquity = await redis.hget('tradex:account_equity', accountId);
        const baseBalance = storedEquity ? parseFloat(storedEquity) : 100000; // Default $100k
        const currentEquity = baseBalance + unrealizedPnl;

        // Calculate Drawdown (simplified for now)
        const highWaterMarkKey = `tradex:hwm:${accountId}`;
        const hwmRaw = await redis.get(highWaterMarkKey);
        const hwm = hwmRaw ? parseFloat(hwmRaw) : currentEquity;
        
        if (currentEquity > hwm) {
          await redis.set(highWaterMarkKey, currentEquity.toString());
        }
        
        const drawdownPct = hwm > 0 ? ((hwm - currentEquity) / hwm) * 100 : 0;

        // Persist Snapshot
        await (db as any).portfolioSnapshot.create({
          data: {
            accountId,
            equity: currentEquity,
            realizedPnl: 0, // Would be tracked via trade history
            unrealizedPnl,
            drawdownPct,
            marginUsed: costBasis
          }
        });

        // Log to Event Bus for real-time UI/AI
        eventBus.log('portfolio.snapshot', 'portfolio_archiver', 'INFO', {
          accountId,
          equity: currentEquity,
          drawdownPct,
          unrealizedPnl
        });
      }
    } catch (e) {
      console.error('[PortfolioArchiver] Snapshot failed:', e);
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}

export const portfolioArchiver = new PortfolioArchiver();
