import { BaseAgent } from '../../lib/agents/BaseAgent.ts';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({});

/**
 * Sentiment Agent
 * 
 * Analyzes 'Market Feeling' by processing news feeds and social signals.
 * Uses Gemini API for real NLP inference if GEMINI_API_KEY is available,
 * otherwise falls back to a simulated heuristic.
 */
export class SentimentAgent extends BaseAgent {
  private symbol: string;
  private lastScore: number = 0;

  constructor(symbol: string = 'BTCUSDT') {
    super('Sentiment');
    this.symbol = symbol;
    this.intervalMs = 15000; // Sentiment moves slower than price
  }

  protected async task(): Promise<void> {
    // 1. Fetch 'External' Data (Simulated for this implementation)
    const newsData = await this.fetchNewsSimulated(this.symbol);
    
    // 2. Perform Sentiment Analysis (Gemini API or fallback)
    const analysis = await this.analyzeSentiment(newsData);
    
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
    this.log(`Sentiment for ${this.symbol}: ${analysis.label} (Score: ${analysis.score.toFixed(2)}, Conf: ${analysis.confidence.toFixed(2)})`);
  }

  /**
   * Mock News Fetcher
   */
  private async fetchNewsSimulated(symbol: string): Promise<string[]> {
    const mockFeed = [
      `Institutional interest in ${symbol} rising after ETF approval.`,
      `Regulatory concerns surfacing in EU regarding ${symbol} liquidity.`,
      `Whale wallet moved 5,000 ${symbol} to exchange.`,
      `New partnership announced between Major Bank and ${symbol} ecosystem.`,
      `Retail FOMO hitting all-time highs for ${symbol}.`,
      `Security vulnerability found in major ${symbol} bridge protocol.`
    ];
    // Return a random subset
    return mockFeed.sort(() => 0.5 - Math.random()).slice(0, 3);
  }

  /**
   * Gemini API Inference
   */
  private async analyzeSentiment(news: string[]) {
    if (!process.env.GEMINI_API_KEY) {
      return this.analyzeSentimentSimulated(news);
    }
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following news headlines for ${this.symbol} and return a sentiment score between -1.0 (extremely bearish) and 1.0 (extremely bullish), a label (BULLISH, BEARISH, or NEUTRAL), and your confidence (0.0 to 1.0).\n\nNews:\n${news.join('\n')}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              label: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "NEUTRAL"] },
              confidence: { type: Type.NUMBER }
            },
            required: ["score", "label", "confidence"]
          }
        }
      });
      
      const result = JSON.parse(response.text!);
      return {
        score: result.score,
        label: result.label,
        confidence: result.confidence
      };
    } catch (e) {
      this.log(`Gemini inference failed, falling back to heuristic: ${(e as Error).message}`, 'WARN');
      return this.analyzeSentimentSimulated(news);
    }
  }

  /**
   * Fallback Heuristic
   */
  private analyzeSentimentSimulated(news: string[]) {
    const positiveWords = ['interest', 'approval', 'partnership', 'bullish', 'growth', 'fomo', 'highs'];
    const negativeWords = ['concern', 'regulatory', 'liquidity', 'dump', 'bearish', 'vulnerability'];
    
    let score = 0;
    news.forEach(text => {
      const lower = text.toLowerCase();
      positiveWords.forEach(w => { if (lower.includes(w)) score += 0.4; });
      negativeWords.forEach(w => { if (lower.includes(w)) score -= 0.4; });
    });

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
