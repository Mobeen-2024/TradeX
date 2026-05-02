import { ref, onUnmounted } from 'vue';

export function useWatchlist() {
  const watchlist = ref([
    { pair: 'BTC/USDT', price: 36000.00, change: 1.25, history: [35800, 35900, 35750, 36100, 36000] },
    { pair: 'ETH/USDT', price: 2450.50, change: -0.85, history: [2500, 2480, 2490, 2460, 2450.5] },
    { pair: 'SOL/USDT', price: 95.20, change: 4.12, history: [90, 92, 91, 94, 95.2] },
    { pair: 'BNB/USDT', price: 310.15, change: 0.15, history: [308, 311, 309, 312, 310.15] },
  ]);

  const updatePrices = setInterval(() => {
    watchlist.value = watchlist.value.map(item => {
      const move = (Math.random() - 0.5) * 10;
      const newPrice = item.price + move;
      const newHistory = [...item.history.slice(1), newPrice];
      return {
        ...item,
        price: newPrice,
        change: item.change + (Math.random() - 0.5) * 0.05,
        history: newHistory
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
