import { db } from '../db.ts';
import { qdrant, MEMORY_COLLECTION } from '../qdrant.ts';
import { getEmbedding } from '../embeddings.ts';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = (apiKey && apiKey !== 'undefined' && apiKey !== '') ? new GoogleGenerativeAI(apiKey) : null;

/**
 * AI Memory Engine
 * 
 * Synthesizes experiences from outcomes and retrieves relevant context for decisions.
 */
export const memoryEngine = {
  /**
   * Log a decision made by an AI node
   */
  async logDecision(data: {
    strategyId: string;
    nodeId?: string;
    action: string;
    reasoning: string;
    confidence: number;
    marketSnapshot: any;
  }) {
    try {
      return await (db as any).aiDecision.create({
        data: {
          ...data,
          marketSnapshot: data.marketSnapshot
        }
      });
    } catch (e) {
      console.error('[Memory] Failed to log decision:', e);
    }
  },

  /**
   * Process a trade outcome and synthesize a "lesson"
   */
  async learnFromOutcome(outcome: {
    strategyId: string;
    pair: string;
    side: string;
    pnlUsdt: number;
    durationSec: number;
    exitReason: string;
    marketContext: any;
  }) {
    console.log(`[Memory] Learning from outcome: ${outcome.pair} PnL: ${outcome.pnlUsdt}`);

    try {
      // 1. Store structured outcome in Postgres
      const dbOutcome = await (db as any).tradeOutcome.create({
        data: outcome
      });

      // 2. Synthesize a textual lesson using LLM
      let lessonText = '';
      if (genAI) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
          Analyze this trading outcome and provide a one-sentence "cognitive memory" or "lesson" for future reference.
          Trade: ${outcome.side} ${outcome.pair}
          PnL: $${outcome.pnlUsdt}
          Exit Reason: ${outcome.exitReason}
          Duration: ${outcome.durationSec}s
          Market Context: ${JSON.stringify(outcome.marketContext)}

          Focus on correlations (e.g., "Bounces on ETH tend to fail when BTC dominance is over 52%").
          Return ONLY the one-sentence lesson.
        `;
        const result = await model.generateContent(prompt);
        lessonText = result.response.text().trim();
      } else {
        lessonText = `${outcome.side} trade on ${outcome.pair} resulted in ${outcome.pnlUsdt > 0 ? 'profit' : 'loss'} ($${outcome.pnlUsdt.toFixed(2)}) due to ${outcome.exitReason}.`;
      }

      // 3. Generate embedding
      const vector = await getEmbedding(lessonText);

      // 4. Store in Qdrant (Vector Memory)
      const experienceId = dbOutcome.id;
      await qdrant.upsert(MEMORY_COLLECTION, {
        wait: true,
        points: [{
          id: experienceId,
          vector: vector,
          payload: {
            content: lessonText,
            strategyId: outcome.strategyId,
            pair: outcome.pair,
            pnl: outcome.pnlUsdt,
            source: 'TRADE_OUTCOME'
          }
        }]
      });

      // 5. Store in Postgres (Relational Memory)
      await (db as any).aiExperience.create({
        data: {
          id: experienceId,
          content: lessonText,
          vectorId: experienceId,
          source: 'TRADE_OUTCOME',
          importance: Math.abs(outcome.pnlUsdt) > 100 ? 0.9 : 0.5,
          pair: outcome.pair,
          marketContext: outcome.marketContext
        }
      });

      return lessonText;
    } catch (e) {
      console.error('[Memory] Failed to learn from outcome:', e);
    }
  },

  /**
   * Retrieve relevant past experiences based on current market context
   */
  async recallRelevantMemories(contextDescription: string, limit = 3) {
    try {
      const vector = await getEmbedding(contextDescription);
      
      const searchResults = await qdrant.search(MEMORY_COLLECTION, {
        vector: vector,
        limit: limit,
        with_payload: true
      });

      return searchResults.map(res => res.payload?.content as string);
    } catch (e) {
      console.error('[Memory] Recall failed:', e);
      return [];
    }
  },

  /**
   * Specifically tracks and learns from market regimes (volatility, trend, etc.)
   */
  async trackMarketRegime(regime: {
    type: 'TRENDING' | 'RANGING' | 'VOLATILE';
    volatility: number;
    description: string;
    metrics: any;
  }) {
    console.log(`[Memory] Tracking regime: ${regime.type}`);
    const lesson = `Market is currently ${regime.type} with ${regime.volatility.toFixed(2)}% volatility. ${regime.description}`;
    const vector = await getEmbedding(lesson);

    await qdrant.upsert(MEMORY_COLLECTION, {
      points: [{
        id: Math.random().toString(36).substr(2, 9),
        vector: vector,
        payload: {
          content: lesson,
          source: 'MARKET_REGIME',
          metrics: regime.metrics,
          type: regime.type
        }
      }]
    });
  },

  /**
   * Specialized learning for failed trade setups
   */
  async learnFromFailure(failure: {
    strategyId: string;
    condition: string;
    reason: string;
    marketContext: any;
  }) {
    const lesson = `STRATEGY_FAIL: ${failure.strategyId} failed on ${failure.condition} because ${failure.reason}. Context: ${JSON.stringify(failure.marketContext)}`;
    const vector = await getEmbedding(lesson);

    await qdrant.upsert(MEMORY_COLLECTION, {
      points: [{
        id: Math.random().toString(36).substr(2, 9),
        vector: vector,
        payload: {
          content: lesson,
          source: 'FAILED_CONDITION',
          strategyId: failure.strategyId
        }
      }]
    });
  }
};

