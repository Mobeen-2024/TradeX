/**
 * Platform Capability Negotiation
 * 
 * Tracks which infrastructure layers are active vs mocked/local.
 * Prevents "reconnect storms" by ensuring services only attempt to start
 * if their dependencies (Redis, QuestDB, etc.) are verified.
 */
export const runtimeCapabilities = {
  durableQueues:    false,
  redisPersistence: false,
  vectorMemory:     false,
  websocketCluster: true, // Always true for basic local dev
};

export type RuntimeCapabilities = typeof runtimeCapabilities;

console.log('[Runtime] Capability Negotiation Engine Initialized.');
