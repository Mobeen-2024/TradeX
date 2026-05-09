import { ref } from 'vue';

export const activeStrategy = ref({
  id: 'strategy-1',
  name: 'Momentum Scalper',
  status: 'running',
  pair: 'BTC/USDT',
  trades: 14,
  winRate: '68%',
});
