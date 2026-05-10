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
    const state = await redis.hgetall(KEYS.globalState);
    const price = parseFloat(state.price || '0');

    if (price <= 0) return;

    this.prices.push(price);
    if (this.prices.length > this.windowSize) {
      this.prices.shift();
    }

    if (this.prices.length < 5) return;

    // 1. Calculate Realized Volatility
    const volatility = this.calculateVolatility(this.prices);
    
    // 2. Calculate Trend Strength (Normalized slope)
    const first = this.prices[0];
    const last = this.prices[this.prices.length - 1];
    const trendRaw = (last - first) / first;
    const trendStrength = Math.min(Math.abs(trendRaw * 100), 1); // Normalize to 0-1

    // 3. Probabilistic Confidence (based on sample size and stability)
    const confidence = Math.min(this.prices.length / this.windowSize, 0.95);

    // 4. Market Stress & Liquidity Risk (Derived)
    const marketStress = Math.min((volatility * 2) * (1 + trendStrength), 1);
    const liquidityRisk = Math.min(volatility * 0.5, 1);

    // 5. Regime Classification
    let regime = 'stable_range';
    if (volatility > 0.5) {
      regime = trendStrength > 0.5 ? 'trending_breakout' : 'mean_reversion_spike';
    } else if (trendStrength > 0.7) {
      regime = 'low_vol_creep';
    }

    // 6. Update Blackboard with Shared Cognitive Context
    await this.updateBlackboard(this.symbol, {
      regime,
      confidence: parseFloat(confidence.toFixed(2)),
      trendStrength: parseFloat(trendStrength.toFixed(2)),
      liquidityRisk: parseFloat(liquidityRisk.toFixed(2)),
      marketStress: parseFloat(marketStress.toFixed(2)),
      volatilityValue: volatility.toFixed(4)
    });

    // 7. Emit Intelligence Event on Regime Shift
    if (volatility > 1.0) {
      this.emit('ai.warning', 'WARN', {
        msg: `High Stress Regime Detected: ${regime}`,
        stress: marketStress.toFixed(2),
        vol: volatility.toFixed(4)
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
