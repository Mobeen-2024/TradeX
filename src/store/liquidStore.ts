import { createPinia, defineStore } from 'pinia';

export const useLiquidStore = defineStore('liquid', {
  state: () => ({
    marketDominance: 50,
    activeNodes: 0,
    realtimeEvents: [] as string[],
  }),
  actions: {
    addEvent(event: string) {
      this.realtimeEvents.push(event);
      if (this.realtimeEvents.length > 50) this.realtimeEvents.shift();
    },
    updateMarketDominance(val: number) {
      this.marketDominance = val;
    }
  }
});
