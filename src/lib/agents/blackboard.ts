import { redis } from '../redis.ts';
import { eventBus } from '../events/eventBus.ts';

const BLACKBOARD_PREFIX = 'tradex:blackboard:';

/**
 * Blackboard System
 * 
 * Central shared memory where autonomous agents post their 'beliefs'
 * (e.g., sentiment, volatility, macro trends).
 */
export const blackboard = {
  
  /**
   * Post an agent's finding to the blackboard for a specific asset.
   */
  async setBelief(symbol: string, agentName: string, belief: any) {
    const key = `${BLACKBOARD_PREFIX}${symbol.toUpperCase()}`;
    try {
      const data = {
        ...belief,
        updatedAt: Date.now()
      };
      await redis.hset(key, agentName, JSON.stringify(data));
      
      eventBus.emitEvent('blackboard.belief_updated', `agent:${agentName}`, 'INFO', {
        symbol: symbol.toUpperCase(),
        belief: data
      });
    } catch (e) {
      // Silent fail in dev if redis unavailable
    }
  },

  /**
   * Read all agent beliefs for a specific asset.
   */
  async getBeliefs(symbol: string): Promise<Record<string, any>> {
    const key = `${BLACKBOARD_PREFIX}${symbol.toUpperCase()}`;
    try {
      const all = await redis.hgetall(key);
      const result: Record<string, any> = {};
      for (const [agent, raw] of Object.entries(all)) {
        result[agent] = JSON.parse(raw as string);
      }
      return result;
    } catch (e) {
      return {};
    }
  },

  /**
   * Clear old blackboard data
   */
  async clear(symbol: string) {
    await redis.del(`${BLACKBOARD_PREFIX}${symbol.toUpperCase()}`);
  }
};
