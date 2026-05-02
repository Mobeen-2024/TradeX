import { ref, computed } from 'vue';

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    time: number;
    read: boolean;
}

export interface PriceAlert {
    id: string;
    symbol: string;
    target: number;
    condition: 'above' | 'below';
    triggered: boolean;
}

const notifications = ref<Notification[]>([]);
const alerts = ref<PriceAlert[]>([]);

export const activeNotifications = computed(() => notifications.value.filter(n => !n.read));
export const notificationHistory = computed(() => [...notifications.value].sort((a, b) => b.time - a.time));

export const addNotification = (notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
    notifications.value.unshift({
        ...notif,
        id: Math.random().toString(36).substring(7),
        time: Date.now(),
        read: false
    });
};

export const markAsRead = (id: string) => {
    const n = notifications.value.find(n => n.id === id);
    if (n) n.read = true;
};

export const clearNotifications = () => {
    notifications.value = [];
};

export const createPriceAlert = (symbol: string, target: number, condition: 'above' | 'below') => {
    alerts.value.push({
        id: Math.random().toString(36).substring(7),
        symbol,
        target,
        condition,
        triggered: false
    });
};

export const removePriceAlert = (id: string) => {
    alerts.value = alerts.value.filter(a => a.id !== id);
};

export const activePriceAlerts = computed(() => alerts.value.filter(a => !a.triggered));
