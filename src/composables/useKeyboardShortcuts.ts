import { onMounted, onUnmounted } from 'vue';
import { currentPrice, addPosition, closePosition, cancelOrder, openOrders, activePositions, quickTradeMode, quickTradePreferences } from '../store/tradeStore';
import { setGlobalTool, globalSymbol } from '../store/workspaceStore';

export function useKeyboardShortcuts(uiFlashParams: { triggerFlash: (type: 'buy' | 'sell') => void }) {
  const handleKeydown = (e: KeyboardEvent) => {
    // Only trigger if not typing in an input
    if (e.target && ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

    const { defaultRisk, defaultLeverage } = quickTradePreferences.value;
    const size = defaultRisk / currentPrice.value;
    // Some basic check for mock pairs
    const symbol = globalSymbol.value.replace('USDT', '/USDT');

    if (e.key.toLowerCase() === 'b') {
        // Instant Market Buy
        uiFlashParams.triggerFlash('buy');
        addPosition({
            pair: symbol,
            type: 'LONG',
            leverage: `${defaultLeverage}x`,
            size: Number(size.toFixed(5)),
            cost: defaultRisk / defaultLeverage,
            entry: currentPrice.value
        });
    } else if (e.key.toLowerCase() === 's') {
        // Instant Market Sell
        uiFlashParams.triggerFlash('sell');
        addPosition({
            pair: symbol,
            type: 'SHORT',
            leverage: `${defaultLeverage}x`,
            size: Number(size.toFixed(5)),
            cost: defaultRisk / defaultLeverage,
            entry: currentPrice.value
        });
    } else if (e.key.toLowerCase() === 'c') {
        // Cancel All Open Orders
        openOrders.value.forEach(o => cancelOrder(o.id));
    } else if (e.key.toLowerCase() === 'x') {
        // Close All Positions
        activePositions.value.forEach(p => closePosition(p.id));
    } else if (e.altKey && e.key.toLowerCase() === 'h') {
        setGlobalTool('hline');
    } else if (e.altKey && e.key.toLowerCase() === 'f') {
        setGlobalTool('fib');
    } else if (e.altKey && e.key.toLowerCase() === 'a') {
        setGlobalTool('alert');
    } else if (e.key.toLowerCase() === 'q') {
        quickTradeMode.value = !quickTradeMode.value;
    } else if (e.key === 'Escape') {
        setGlobalTool('none');
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
}
