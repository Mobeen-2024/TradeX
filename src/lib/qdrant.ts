import { QdrantClient } from '@qdrant/js-client-rest';

/**
 * AI Vector Memory (Qdrant)
 * 
 * Used for storing and retrieving high-dimensional semantic embeddings
 * of AI experiences, trade outcomes, and market patterns.
 */
import fs from 'fs';
import path from 'path';

let useMock = false;
const MOCK_FILE = path.join(process.cwd(), 'mock_memory.json');
let mockMemory: any[] = [];

// Load existing mock memory if it exists
if (fs.existsSync(MOCK_FILE)) {
  try {
    mockMemory = JSON.parse(fs.readFileSync(MOCK_FILE, 'utf-8'));
  } catch (e) {
    mockMemory = [];
  }
}

function saveMock() {
  fs.writeFileSync(MOCK_FILE, JSON.stringify(mockMemory, null, 2));
}

/**
 * AI Vector Memory (Qdrant) with Persistent Mock Fallback
 */
export const qdrant: any = new Proxy(new QdrantClient({ 
  url: process.env.QDRANT_URL || 'http://127.0.0.1:6333' 
}), {
  get(target, prop) {
    if (useMock) {
      if (prop === 'upsert') return async (_coll: string, data: any) => {
        mockMemory.push(...data.points);
        saveMock();
        return { status: 'ok' };
      };
      if (prop === 'search') return async (_coll: string, data: any) => {
        return mockMemory.slice(-data.limit).map(p => ({ 
          payload: p.payload, 
          score: 0.99 
        }));
      };
      return async () => ({});
    }
    return (target as any)[prop];
  }
});

export const MEMORY_COLLECTION = 'ai_cognitive_memory';

export async function initQdrant() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some((c: any) => c.name === MEMORY_COLLECTION);

    if (!exists) {
      console.log(`[Qdrant] Creating collection: ${MEMORY_COLLECTION}`);
      await qdrant.createCollection(MEMORY_COLLECTION, {
        vectors: { size: 768, distance: 'Cosine' }
      });
    }
  } catch (e) {
    console.warn('[Qdrant] Connection failed. Switching to Memory Mock Mode.');
    useMock = true;
  }
}
