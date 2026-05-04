/**
 * ipcClient.ts — Zero-Trust Communication Adapter
 * 
 * This adapter transparently switches between REST/WebSocket and 
 * Electron IPC based on the runtime environment. In desktop mode, 
 * it treats the renderer as untrusted and routes via a secure preload bridge.
 */

import { apiClient } from './apiClient';

const isDesktop = typeof window !== 'undefined' && 'tradex' in window;

export const executionClient = {
  /**
   * Places an order through the most secure channel available.
   */
  async placeOrder(payload: any) {
    if (isDesktop) {
      console.log('[IPC] Routing order via Secure Bridge');
      return (window as any).tradex.placeOrder(payload);
    }
    
    // Fallback to REST for web version
    return apiClient.post('/place_order', payload);
  },

  /**
   * Subscribes to system events with read-only guarantees.
   */
  onSystemEvent(type: string, callback: (data: any) => void) {
    if (isDesktop && (window as any).tradex.onEvent) {
      return (window as any).tradex.onEvent(type, callback);
    }
    
    // Web version uses standard WebSocket subscriptions
    // (Handled by wsManager elsewhere, but could be unified here)
  }
};
