import { ref, onBeforeUnmount } from 'vue';

export function useWebSocket(url: string) {
    const isConnected = ref(false);
    const data = ref<any>(null);
    const error = ref<Event | null>(null);
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let reconnectAttempts = 0;
    const maxAttempts = 10;

    const connect = () => {
        ws = new WebSocket(url);

        ws.onopen = () => {
            isConnected.value = true;
            reconnectAttempts = 0;
            console.log(`[useWebSocket] Connected to ${url}`);
        };

        ws.onmessage = (event) => {
            try {
                data.value = JSON.parse(event.data);
            } catch (e) {
                data.value = event.data;
            }
        };

        ws.onclose = () => {
            isConnected.value = false;
            console.log(`[useWebSocket] Disconnected from ${url}`);
            if (reconnectAttempts < maxAttempts) {
                const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
                reconnectAttempts++;
                reconnectTimeout = setTimeout(connect, backoff);
            }
        };

        ws.onerror = (err) => {
            error.value = err;
            console.error(`[useWebSocket] Error on ${url}:`, err);
        };
    };

    const send = (message: any) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(typeof message === 'string' ? message : JSON.stringify(message));
        }
    };

    const close = () => {
        if (ws) {
            ws.close();
        }
        clearTimeout(reconnectTimeout);
    };

    connect();

    onBeforeUnmount(() => {
        close();
    });

    return {
        isConnected,
        data,
        error,
        send,
        close
    };
}
