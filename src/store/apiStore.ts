import { ref, computed } from 'vue';

export interface InternalApiKey {
    id: string;
    name: string;
    key: string;
    created: number;
    lastUsed?: number;
    permissions: ('read' | 'trade' | 'withdraw')[];
}

const apiKeys = ref<InternalApiKey[]>([]);

// Initialize from localStorage
if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tradex_internal_api_keys');
    if (saved) {
        apiKeys.value = JSON.parse(saved);
    }
}

const persist = () => {
    localStorage.setItem('tradex_internal_api_keys', JSON.stringify(apiKeys.value));
};

export const useApiStore = () => {
    const generateKey = (name: string, permissions: ('read' | 'trade' | 'withdraw')[]) => {
        const newKey: InternalApiKey = {
            id: Math.random().toString(36).substring(2, 11),
            name,
            key: 'tx_' + Math.random().toString(36).substring(2, 24) + Math.random().toString(36).substring(2, 24),
            created: Date.now(),
            permissions
        };
        apiKeys.value.push(newKey);
        persist();
        return newKey;
    };

    const deleteKey = (id: string) => {
        apiKeys.value = apiKeys.value.filter(k => k.id !== id);
        persist();
    };

    return {
        apiKeys: computed(() => apiKeys.value),
        generateKey,
        deleteKey
    };
};
