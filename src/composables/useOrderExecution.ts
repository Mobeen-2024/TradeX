import { ref, computed } from 'vue';
import { 
    placeOrder, 
    availableUsdt, 
    availableBtc, 
    activePositions, 
    currentPrice 
} from '../store/tradeStore';

export function useOrderExecution() {
    const isPending = ref(false);

    const availableMargin = computed(() => {
        const unrealizedPNL = activePositions.value.reduce((acc, pos) => acc + (pos.liveDelta || 0), 0);
        return availableUsdt.value + unrealizedPNL;
    });

    const executeTrade = async (params: {
        side: 'Buy' | 'Sell';
        type: string;
        amount: number;
        price: number;
        leverage: number;
        marginEnabled: boolean;
        stopPrice?: number;
        callbackRate?: number;
        activationPrice?: number;
        takeProfitPrice?: number;
        stopLossPrice?: number;
        iceberg?: boolean;
    }) => {
        if (isPending.value) return;
        isPending.value = true;

        try {
            const mult = params.marginEnabled ? params.leverage : 1;
            const totalCost = params.price * params.amount;
            const marginRequired = totalCost / mult;

            // Simple validation
            if (params.side === 'Buy' && marginRequired > (params.marginEnabled ? availableMargin.value : availableUsdt.value)) {
                throw new Error('Insufficient funds');
            }

            if (params.side === 'Sell' && params.amount > (availableBtc.value * mult)) {
                throw new Error('Insufficient funds');
            }

            // Update local balances for immediate feedback (optimistic UI)
            if (params.side === 'Buy') {
                availableUsdt.value -= marginRequired;
            } else {
                availableBtc.value -= (params.amount / mult);
            }

            await placeOrder({
                pair: 'BTC/USDT',
                side: params.side,
                type: params.type,
                quantity: params.amount,
                price: params.price,
                stopPrice: params.stopPrice,
                callbackRate: params.callbackRate,
                activationPrice: params.activationPrice,
                leverage: params.marginEnabled ? `Cross_${params.leverage}x` : 'Spot',
                cost: marginRequired,
                takeProfitPrice: params.takeProfitPrice,
                stopLossPrice: params.stopLossPrice,
                iceberg: params.iceberg,
            });

            return { success: true };
        } catch (err: any) {
            console.error('Execution Error:', err);
            return { success: false, error: err.message };
        } finally {
            isPending.value = false;
        }
    };

    return {
        isPending,
        availableMargin,
        executeTrade
    };
}
