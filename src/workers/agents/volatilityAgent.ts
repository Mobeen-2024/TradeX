import { BaseAgent } from '../../lib/agents/BaseAgent.ts';
import { redis, KEYS } from '../../lib/redis.ts';

/**
 * Volatility Agent
 * 
 * Specifically monitors 'Realized Volatility' over a rolling window.
 * High volatility informs the Straddle agent to tighten stops or widen targets.
 */
export class VolatilityAgent extends BaseAgent {
  private windowSize: number = 20;
  private prices: number[] = [];
  private lastVolatility: number = 0;
  private symbol: string;

  constructor(symbol: string = 'BTCUSDT') {
    super('Volatility');
    this.symbol = symbol;
    this.intervalMs = 2000; // Sample every 2 seconds
  }

  protected async task(): Promise<void> {
    // 1. Fetch current market price from shared state (supports Mock mode)
    const state = await redis.hgetall(KEYS.globalState);
    const price = parseFloat(state.price || '0');

    if (price <= 0) return;

    // 2. Maintain rolling window
    this.prices.push(price);
    if (this.prices.length > this.windowSize) {
      this.prices.shift();
    }

    if (this.prices.length < 5) return; // Need minimum data

    // 3. Calculate Realized Volatility (StdDev of returns)
    const volatility = this.calculateVolatility(this.prices);
    
    // 4. Detect Regime Changes
    let status: 'STABLE' | 'EXPANDING' | 'SPIKE' = 'STABLE';
    const change = this.lastVolatility > 0 ? (volatility / this.lastVolatility) - 1 : 0;

    if (change > 0.5) status = 'SPIKE';
    else if (change > 0.2) status = 'EXPANDING';

    // 5. Update Blackboard
    await this.updateBlackboard(this.symbol, {
      status,
      value: volatility.toFixed(4),
      change: (change * 100).toFixed(2) + '%',
      priceSampleCount: this.prices.length
    });

    // 6. Emit High-Impact Events
    if (status === 'SPIKE') {
      this.emit('ai.warning', 'WARN', {
        msg: `Volatility Spike detected on ${this.symbol}!`,
        vol: volatility.toFixed(4),
        prev: this.lastVolatility.toFixed(4)
      });
    }

    this.lastVolatility = volatility;
  }

  private calculateVolatility(prices: number[]): number {
    // Calculate returns
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    // Mean return
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;

    // Variance
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;

    // Standard Deviation
    return Math.sqrt(variance) * 100; // Scaling for readability
  }
}

// Start if run directly as a worker
if (import.meta.url.includes(process.argv[1])) {
  const agent = new VolatilityAgent('BTCUSDT');
  agent.start().catch(console.error);
}
