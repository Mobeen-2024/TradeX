/**
 * aiAnalytics.ts — Server-side only
 *
 * Core Google Gemini AI client and prompt engineering layer for:
 *  1. Real-time Intent Analysis (streaming)
 *  2. Structural Level Validation (structured JSON)
 *  3. Pattern Recognition Scan (structured JSON)
 *
 * Uses @google/genai with strict schemas for institutional reliability.
 */

import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

// ── Models ────────────────────────────────────────────────────────
const MODEL_NAME = 'gemini-2.0-flash'; // High-speed flash for real-time loops

// ── Intent Analysis ───────────────────────────────────────────────
export interface IntentSnapshot {
  symbol: string;
  price: number;
  bidVolume: number;
  askVolume: number;
  imbalanceRatio: number;
  recentTrades: { side: string; qty: number; price: number }[];
  spread: number;
}

export async function streamIntentAnalysis(
  snapshot: IntentSnapshot,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
): Promise<void> {
  const prompt = `You are an institutional market microstructure analyst.
Analyze this real-time order book snapshot for ${snapshot.symbol}:
- Price: $${snapshot.price}
- Bid Volume (top 10): ${snapshot.bidVolume.toFixed(2)}
- Ask Volume (top 10): ${snapshot.askVolume.toFixed(2)}
- Imbalance Ratio: ${(snapshot.imbalanceRatio * 100).toFixed(1)}% bid-side
- Spread: $${snapshot.spread.toFixed(2)}
- Last Trades: ${snapshot.recentTrades.map(t => `${t.side} ${t.qty.toFixed(3)}@${t.price}`).join(', ')}

In ONE sentence (max 20 words), identify institutional intent: accumulation, distribution, absorption, or neutral. No fluff.`;

  try {
    const response = await client.models.generateContentStream({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
        maxOutputTokens: 120,
      }
    });

    let fullText = '';
    for await (const chunk of response) {
      const chunkText = chunk.text;
      fullText += chunkText;
      onChunk(chunkText);
    }
    onComplete(fullText);
  } catch (e) {
    console.error('[AI] Intent Stream Error:', e);
    onComplete('Analysis currently unavailable.');
  }
}

// ── Level Validation ──────────────────────────────────────────────
export interface StructuralZone {
  price: number;
  upperBound: number;
  lowerBound: number;
  type: 'supply' | 'demand' | 'poi';
  strength: number;
  touches: number;
}

export async function validateLevelsWithAI(
  zones: StructuralZone[],
  candles: any[],
): Promise<StructuralZone[]> {
  const prompt = `Given these detected structural zones and the last 200 candles:
Zones: ${JSON.stringify(zones)}

Filter and validate these zones. Return a JSON array of validated zones.
Rules:
- Remove weak levels with strength < 3.
- Classify as 'supply' (resistance), 'demand' (support), or 'poi' (point of interest).
- Correct the bounds if they don't align with candle wicks.
- Use this JSON schema: [{ "price": number, "upperBound": number, "lowerBound": number, "type": string, "strength": number, "touches": number, "reasoning": string }]`;

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      }
    });

    return JSON.parse(response.text);
  } catch (e) {
    console.error('[AI] Level Validation Error:', e);
    return zones; // Fallback to raw zones
  }
}

// ── Pattern Recognition ───────────────────────────────────────────
export interface PatternAlert {
  pattern: string;
  direction: 'bullish' | 'bearish';
  confidence: number;
  price: number;
  rationale: string;
  actionable: boolean;
}

export async function scanForPatternsAI(
  candles: any[],
  currentPrice: number,
): Promise<PatternAlert[]> {
  const prompt = `Analyze the last 10 candles for institutional exhaustion patterns.
Price: $${currentPrice}
Patterns to look for: Institutional Engulfing, Rejection Wicks, Volume Exhaustion, Fair Value Gaps.

Return a JSON array of alerts using this schema:
[{ "pattern": string, "direction": "bullish"|"bearish", "confidence": number, "price": number, "rationale": string, "actionable": boolean }]
If no strong patterns, return [].`;

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.15,
        responseMimeType: 'application/json',
      }
    });

    return JSON.parse(response.text);
  } catch (e) {
    console.error('[AI] Pattern Scan Error:', e);
    return [];
  }
}
