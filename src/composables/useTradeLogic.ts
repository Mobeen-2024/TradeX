import { ref, computed, shallowRef, onUnmounted } from 'vue';
import { 
    placeOrder, 
    availableUsdt, 
    availableBtc, 
    activePositions,
    openOrders 
} from '../store/tradeStore';

// --------------------------------------------------------
// 1. DETERMINISTIC STATE MACHINE
// --------------------------------------------------------
export type TradeState = 'IDLE' | 'VALIDATING' | 'EXECUTING' | 'RETRYING' | 'SUCCESS' | 'FAILURE';

export interface TradeParams {
    side: 'Buy' | 'Sell';
    type: string;
    amount: number;
    price: number;
    leverage: number;
    marginEnabled: boolean;
    accountIds?: string[];
    sorConfig?: any;
    stopPrice?: number;
    callbackRate?: number;
    activationPrice?: number;
    takeProfitPrice?: number;
    stopLossPrice?: number;
    iceberg?: boolean;
}

// --------------------------------------------------------
// 2. CONFIGURATION & CONSTANTS
// --------------------------------------------------------
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500; // Exponential backoff base
const EXECUTION_TIMEOUT_MS = 10000; // 10s max wait time before timeout

export function useTradeLogic() {
    // Current deterministic state
    const currentState = ref<TradeState>('IDLE');
    
    // Error state holding deterministic messages
    const lastError = ref<string | null>(null);

    // Buffers and cleanup tracking
    const retryCount = ref(0);
    const activeTimeouts = new Set<ReturnType<typeof setTimeout>>();

    // --------------------------------------------------------
    // UTILS & CLEANUP
    // --------------------------------------------------------
    const registerTimeout = (fn: () => void, delay: number) => {
        const id = setTimeout(() => {
            fn();
            activeTimeouts.delete(id);
        }, delay);
        activeTimeouts.add(id);
        return id;
    };

    const cleanupTimeouts = () => {
        activeTimeouts.forEach(clearTimeout);
        activeTimeouts.clear();
    };

    onUnmounted(() => {
        cleanupTimeouts();
    });

    // --------------------------------------------------------
    // COMPUTED PROPERTIES
    // --------------------------------------------------------
    const isPending = computed(() => ['VALIDATING', 'EXECUTING', 'RETRYING'].includes(currentState.value));
    
    const availableMargin = computed(() => {
        // Optimization: Use simple reduction without causing deep reactivity loops
        const unrealizedPNL = activePositions.value.reduce((acc, pos) => acc + (pos.liveDelta || 0), 0);
        return availableUsdt.value + unrealizedPNL;
    });

    // --------------------------------------------------------
    // CORE LOGIC FLOW
    // --------------------------------------------------------
    
    /**
     * Executes the trade logic using the deterministic state machine.
     * Prevents race conditions and double executions.
     */
    const executeTrade = async (params: TradeParams) => {
        // Prevent concurrent executions
        if (currentState.value !== 'IDLE' && currentState.value !== 'FAILURE' && currentState.value !== 'SUCCESS') {
            console.warn('[TradeLogic] Execution blocked: Current state is', currentState.value);
            return;
        }

        currentState.value = 'VALIDATING';
        lastError.value = null;
        retryCount.value = 0;

        // 1. Validation Phase
        if (!validateTrade(params)) {
            transitionTo('FAILURE');
            return { success: false, error: lastError.value };
        }

        // 2. Optimistic UI Phase
        const tempOrderId = generateTempOrderId();
        applyOptimisticUI(params, tempOrderId);

        // 3. Execution Phase with Retry Backoff
        const result = await attemptExecutionWithRetries(params, tempOrderId);
        
        if (result.success) {
            transitionTo('SUCCESS');
            // Auto-reset state after 2s
            registerTimeout(() => { if (currentState.value === 'SUCCESS') transitionTo('IDLE'); }, 2000);
            return result;
        } else {
            revertOptimisticUI(tempOrderId);
            transitionTo('FAILURE', result.error);
            // Auto-reset state after 3s to allow user to try again
            registerTimeout(() => { if (currentState.value === 'FAILURE') transitionTo('IDLE'); }, 3000);
            return result;
        }
    };

    /**
     * Validates trade sanity before network overhead
     */
    const validateTrade = (params: TradeParams): boolean => {
        if (params.amount <= 0 || params.price <= 0) {
            lastError.value = 'Invalid amount or price parameters.';
            return false;
        }

        const mult = params.marginEnabled ? params.leverage : 1;
        const totalCost = params.price * params.amount;
        const marginRequired = totalCost / mult;

        if (params.side === 'Buy' && marginRequired > (params.marginEnabled ? availableMargin.value : availableUsdt.value)) {
            lastError.value = 'Insufficient margin or funds available.';
            return false;
        }

        if (params.side === 'Sell' && params.amount > (availableBtc.value * mult)) {
            lastError.value = 'Insufficient BTC balance for this operation.';
            return false;
        }

        return true;
    };

    /**
     * Optimistic UI updates
     */
    const applyOptimisticUI = (params: TradeParams, tempId: string) => {
        openOrders.value.push({
            id: tempId,
            pair: 'BTC/USDT',
            type: params.type,
            side: params.side,
            price: params.price,
            amount: params.amount,
            filled: 0,
            status: 'Pending (Optimistic)',
            time: Date.now()
        });
    };

    const revertOptimisticUI = (tempId: string) => {
        openOrders.value = openOrders.value.filter(o => o.id !== tempId);
    };

    const generateTempOrderId = () => `opt_${Math.random().toString(36).substr(2, 9)}`;

    /**
     * Execution with Exponential Backoff and Timeout Handling
     */
    const attemptExecutionWithRetries = async (params: TradeParams, tempId: string): Promise<{success: boolean, error?: string}> => {
        while (retryCount.value <= MAX_RETRIES) {
            currentState.value = retryCount.value > 0 ? 'RETRYING' : 'EXECUTING';
            
            try {
                // AbortController for Execution Timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

                const mult = params.marginEnabled ? params.leverage : 1;
                const totalCost = params.price * params.amount;
                const marginRequired = totalCost / mult;

                // Simulate the actual network call (placeOrder store action)
                await placeOrder({
                    pair: 'BTC/USDT',
                    side: params.side,
                    type: params.type,
                    quantity: params.amount,
                    price: params.price,
                    accountIds: params.accountIds,
                    sorConfig: params.sorConfig,
                    stopPrice: params.stopPrice,
                    callbackRate: params.callbackRate,
                    activationPrice: params.activationPrice,
                    takeProfitPrice: params.takeProfitPrice,
                    stopLossPrice: params.stopLossPrice,
                    leverage: params.marginEnabled ? `Cross_${params.leverage}x` : 'Spot',
                    cost: marginRequired,
                    iceberg: params.iceberg,
                });

                clearTimeout(timeoutId);

                // Morph optimistic order into confirmed
                const confirmedOrder = openOrders.value.find(o => o.id === tempId);
                if (confirmedOrder) {
                    confirmedOrder.status = 'Open';
                    confirmedOrder.id = `ord_${Math.random().toString(36).substr(2, 9)}`;
                }

                return { success: true };

            } catch (err: any) {
                // Network abort or explicit network failure
                if (err.name === 'AbortError' || err.message?.includes('network') || err.message?.includes('socket')) {
                    retryCount.value++;
                    if (retryCount.value > MAX_RETRIES) {
                        return { success: false, error: 'Network timeout after multiple retries.' };
                    }
                    
                    // Exponential backoff
                    const backoffTime = BASE_BACKOFF_MS * Math.pow(2, retryCount.value - 1);
                    console.warn(`[TradeLogic] Network fault, retrying in ${backoffTime}ms... (Attempt ${retryCount.value}/${MAX_RETRIES})`);
                    await new Promise(resolve => registerTimeout(() => resolve(true), backoffTime));
                    continue;
                }

                // Unrecoverable business logic error (e.g., Insufficient funds, API rejected)
                return { success: false, error: err.message || 'Execution failed due to system error.' };
            }
        }
        return { success: false, error: 'Max retries exceeded' };
    };

    /**
     * Deterministic State Transition Helper
     */
    const transitionTo = (newState: TradeState, errorMsg?: string) => {
        currentState.value = newState;
        if (errorMsg) lastError.value = errorMsg;
    };

    return {
        currentState,
        isPending,
        availableMargin,
        lastError,
        executeTrade
    };
}
