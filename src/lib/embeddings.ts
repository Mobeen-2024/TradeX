import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * AI Embeddings Service
 * 
 * Converts text observations into vectors for the Cognitive Memory.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!genAI) {
    console.warn('[AI] No GEMINI_API_KEY found. Using mock embeddings.');
    // Return a random 768-dim vector for mock testing
    return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (e) {
    console.error('[AI] Embedding generation failed:', e);
    // Fallback to mock so the system doesn't crash
    return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
  }
}
