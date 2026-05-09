import { ref, computed } from 'vue';
import { activePositions } from './tradeStore';

export interface Balance {
  asset: string;
  free: number;
  locked: number;
}

export const balances = ref<Balance[]>([
  { asset: 'USDT', free: 300.00, locked: 0 },
  { asset: 'BTC', free: 0, locked: 0 },
  { asset: 'ETH', free: 0, locked: 0 },
]);

export interface VaultAccount {
  id: string;
  name: string;
  exchange: string;
  isDefault?: boolean;
}

export const vaultAccounts = ref<VaultAccount[]>([
  { id: 'master_main', name: 'Master Main', exchange: 'Binance', isDefault: true }
]);

export const fetchVaultAccounts = async () => {
    try {
        const { apiClient } = await import('../lib/apiClient');
        const res = await apiClient.get<{ accounts: VaultAccount[] }>('/vault/accounts');
        if (res.success && res.data) {
            vaultAccounts.value = res.data.accounts;
        }
    } catch (e) {
        // Mock fallback if api fails
    }
};

export const totalUsdtBalance = computed(() => {
    // Basic mock calculation for total value
    return balances.value.reduce((acc, b) => {
        if (b.asset === 'USDT') return acc + b.free;
        // In a real app, we'd multiply by current prices
        return acc + (b.asset === 'BTC' ? b.free * 64000 : b.free * 3200);
    }, 0);
});

// User Data Stream (Listen Key) management
export const listenKey = ref<string | null>(null);
let userWs: WebSocket | null = null;

export const startUserStream = async () => {
    try {
        // Mocking the listenKey generation via Binance API
        // const res = await fetch('https://api.binance.com/api/v3/userDataStream', { method: 'POST' });
        // const data = await res.json();
        // listenKey.value = data.listenKey;
        
        listenKey.value = 'mock_listen_key_' + Math.random().toString(36).substr(2, 9);
        connectUserWs(listenKey.value);
    } catch (e) {
        console.error('Failed to start user stream:', e);
    }
};

const connectUserWs = (key: string) => {
    if (typeof window === 'undefined') return;
    
    // In production, this would be wss://stream.binance.com:9443/ws/${key}
    // For this demo, we'll simulate account updates
    console.log('User Stream Connected:', key);
    
    // Simulate an execution report (order fill) after 10 seconds for demo purposes
    setTimeout(() => {
        simulateOrderFill();
    }, 15000);
};

const simulateOrderFill = () => {
    console.log('SIMULATION: Order Filled!');
    // Update balances, positions, etc.
    const usdt = balances.value.find(b => b.asset === 'USDT');
    if (usdt) usdt.free -= 5000;
    
    const btc = balances.value.find(b => b.asset === 'BTC');
    if (btc) btc.free += 0.08;
};

// Initialize if in browser
if (typeof window !== 'undefined') {
    startUserStream();
}
