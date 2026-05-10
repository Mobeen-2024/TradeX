import { BaseAgent } from '../../lib/agents/BaseAgent.ts';

/**
 * Sentiment Agent
 * 
 * Analyzes 'Market Feeling' by processing news feeds and social signals.
 * In a production environment, this would connect to Twitter/X API, 
 * Bloomberg, or LunarCrush.
 */
export class SentimentAgent extends BaseAgent {
  private symbol: string;
  private lastScore: number = 0;

  constructor(symbol: string = 'BTCUSDT') {
    super('Sentiment');
    this.symbol = symbol;
    this.intervalMs = 15000; // Sentiment moves slower than price (every 15s)
  }

  protected async task(): Promise<void> {
    // 1. Fetch 'External' Data (Simulated for this implementation)
    const newsData = await this.fetchNewsSimulated(this.symbol);
    
    // 2. Perform Sentiment Analysis (Simulating an LLM/NLP Inference)
    const analysis = this.analyzeSentimentSimulated(newsData);
    
    // 3. Detect Drastic Shifts
    const shift = Math.abs(analysis.score - this.lastScore);
    
    // 4. Update Blackboard
    await this.updateBlackboard(this.symbol, {
      score: analysis.score,
      label: analysis.label,
      confidence: analysis.confidence,
      sourceCount: newsData.length,
      lastShift: shift.toFixed(2)
    });

    // 5. Emit Intelligence Events
    if (shift > 0.5) {
      this.emit('ai.intent', 'INFO', {
        msg: `Major Sentiment Shift detected for ${this.symbol}!`,
        newLabel: analysis.label,
        shift: shift.toFixed(2)
      });
    }

    this.lastScore = analysis.score;
    this.log(`Sentiment for ${this.symbol}: ${analysis.label} (Score: ${analysis.score})`);
  }

  /**
   * Mock News Fetcher
   */
  private async fetchNewsSimulated(symbol: string): Promise<string[]> {
    const mockFeed = [
      `Institutional interest in ${symbol} rising after ETF approval.`,
      `Regulatory concerns surfacing in EU regarding ${symbol} liquidity.`,
      `Whale wallet moved 5,000 ${symbol} to exchange.`,
      `New partnership announced between Major Bank and ${symbol} ecosystem.`
    ];
    // Return a random subset
    return mockFeed.sort(() => 0.5 - Math.random()).slice(0, 2);
  }

  /**
   * Mock AI Inference
   * In production: npx tsx src/scripts/runLlmInference.ts
   */
  private analyzeSentimentSimulated(news: string[]) {
    // Simplified heuristic for demo
    const positiveWords = ['interest', 'approval', 'partnership', 'bullish', 'growth'];
    const negativeWords = ['concern', 'regulatory', 'liquidity', 'dump', 'bearish'];
    
    let score = 0;
    news.forEach(text => {
      const lower = text.toLowerCase();
      positiveWords.forEach(w => { if (lower.includes(w)) score += 0.4; });
      negativeWords.forEach(w => { if (lower.includes(w)) score -= 0.4; });
    });

    // Clamp between -1 and 1
    score = Math.max(-1, Math.min(1, score));

    let label = 'NEUTRAL';
    if (score > 0.3) label = 'BULLISH';
    else if (score < -0.3) label = 'BEARISH';

    return {
      score,
      label,
      confidence: 0.7 + (Math.random() * 0.2)
    };
  }
}

// Start if run directly as a worker
if (import.meta.url.includes(process.argv[1])) {
  const agent = new SentimentAgent('BTCUSDT');
  agent.start().catch(console.error);
}
