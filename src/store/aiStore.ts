/**
 * aiStore.ts — Vue Store
 *
 * Reactive state for AI-driven insights:
 *  - Real-time intent narration
 *  - Order book imbalance visualization
 *  - Structural supply/demand zones
 *  - Pattern recognition alerts
 */

import { ref } from 'vue';
import { wsManager } from '../lib/wsManager';

export interface AILevel {
  price: number;
  upperBound: number;
  lowerBound: number;
  type: 'supply' | 'demand' | 'poi';
  strength: number;
  touches: number;
}

export interface AIPatternAlert {
  pattern: string;
  direction: 'bullish' | 'bearish';
  confidence: number;
  price: number;
  rationale: string;
}

// ── State ──────────────────────────────────────────────────────────
export const aiNarration = ref('');
export const aiImbalance = ref(0.5);
export const aiLevels = ref<AILevel[]>([]);
export const aiAlerts = ref<AIPatternAlert[]>([]);
export const isAiThinking = ref(false);

// ── WebSocket Integration ──────────────────────────────────────────
export function initAIStore() {
  // 1. Intent Chunks (Streaming)
  wsManager.subscribe('app@ai_intent_chunk', (data) => {
    isAiThinking.value = true;
    aiNarration.value += data.chunk;
  });

  // 2. Intent Full Narration
  wsManager.subscribe('app@ai_intent', (data) => {
    aiNarration.value = data.narration;
    aiImbalance.value = data.imbalanceRatio;
    isAiThinking.value = false;
  });

  // 3. Structural Levels
  wsManager.subscribe('app@ai_levels', (data) => {
    aiLevels.value = data.levels;
  });

  // 4. Pattern Alerts
  wsManager.subscribe('app@ai_pattern', (data) => {
    // Prepend new alerts
    aiAlerts.value = [...data.alerts, ...aiAlerts.value].slice(0, 50);
  });
}

// Clear narration for new analysis
export function resetNarration() {
  aiNarration.value = '';
}
