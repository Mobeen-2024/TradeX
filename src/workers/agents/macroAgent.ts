import { BaseAgent } from '../../lib/agents/BaseAgent.ts';
import { redis, KEYS } from '../../lib/redis.ts';

/**
 * Macro Agent
 * 
 * Monitors global market variables like Funding Rates and aggregate liquidity.
 * Helps strategies determine long/short bias and slippage expectations.
 */
export class MacroAgent extends BaseAgent {
  private symbol: string;

  constructor(symbol: string = 'BTCUSDT') {
    super('Macro');
    this.symbol = symbol;
    this.intervalMs = 30000; // Macro data changes slowly
  }

  protected async task(): Promise<void> {
    // 1. Simulate fetching Funding Rates and Liquidity
    // In production, these would be pulled from exchange APIs or QuestDB
    const fundingRate = (Math.random() * 0.02) - 0.01; // -0.01% to +0.01%
    const liquidityUsd = 5000000 + (Math.random() * 2000000); // $5M - $7M depth
    
    // 2. Derive Bias
    let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (fundingRate > 0.005) bias = 'BEARISH'; // Shorts being paid, crowded longs
    else if (fundingRate < -0.005) bias = 'BULLISH'; // Longs being paid, crowded shorts

    // 3. Slippage Expectation
    const slippageRisk = liquidityUsd < 5500000 ? 'HIGH' : 'LOW';

    // 4. Update Blackboard
    await this.updateBlackboard(this.symbol, {
      fundingRate: parseFloat(fundingRate.toFixed(6)),
      liquidityUsd: Math.round(liquidityUsd),
      bias,
      slippageRisk,
      timestamp: Date.now()
    });

    this.log(`Macro Context Updated: Bias=${bias}, Funding=${(fundingRate * 100).toFixed(4)}%, Liquidity=$${(liquidityUsd/1000000).toFixed(1)}M`);
  }
}

if (import.meta.url.includes(process.argv[1])) {
  const agent = new MacroAgent('BTCUSDT');
  agent.start().catch(console.error);
}
