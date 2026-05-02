import { ref, onUnmounted } from 'vue';

export function useWatchlist() {
  const watchlist = ref([
    { pair: 'BTC/USDT', price: 36000.00, change: 1.25, icon: 'Bitcoin' },
    { pair: 'ETH/USDT', price: 2450.50, change: -0.85, icon: 'Activity' },
    { pair: 'SOL/USDT', price: 95.20, change: 4.12, icon: 'Signal' },
    { pair: 'BNB/USDT', price: 310.15, change: 0.15, icon: 'TrendingUp' },
  ]);

  const updatePrices = setInterval(() => {
    watchlist.value = watchlist.value.map(item => {
      const move = (Math.random() - 0.5) * 0.1;
      return {
        ...item,
        price: item.price + move,
        change: item.change + (Math.random() - 0.5) * 0.05
      };
    });
  }, 3000);

  onUnmounted(() => {
    clearInterval(updatePrices);
  });

  return {
    watchlist
  };
}
