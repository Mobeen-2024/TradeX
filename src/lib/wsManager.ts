import { ref } from 'vue';

type MessageHandler = (data: any) => void;

class WebSocketManager {
    private ws: WebSocket | null = null;
    private handlers: Map<string, Set<MessageHandler>> = new Map();
    private activeSubscriptions: Set<string> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private url: string = 'wss://stream.binance.com:9443/ws'; // Clean base URL for dynamic subs

    public isConnected = ref(false);

    constructor() {
        if (typeof window !== 'undefined') {
            this.connect();
        }
    }

    private connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('WS Manager Connected');
            this.isConnected.value = true;
            this.reconnectAttempts = 0;
            // Restore active subscriptions on reconnect
            if (this.activeSubscriptions.size > 0) {
                this.send({
                    method: 'SUBSCRIBE',
                    params: Array.from(this.activeSubscriptions),
                    id: Date.now()
                });
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Binance dynamic stream payload has 's' for symbol and 'e' for event, 
                // or just 'stream' if using combined streams. 
                // Since we're using /ws with individual subs, it might look different.
                const stream = data.stream || (data.e ? `${data.s?.toLowerCase()}@${data.e}` : null);
                
                if (stream && this.handlers.has(stream)) {
                    this.handlers.get(stream)?.forEach(handler => handler(data.data || data));
                }
            } catch (e) {
                console.error('WS Parse Error:', e);
            }
        };

        this.ws.onclose = () => {
            this.isConnected.value = false;
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.connect(), 3000);
            }
        };
    }

    public subscribe(stream: string, handler: MessageHandler) {
        if (!this.handlers.has(stream)) {
            this.handlers.set(stream, new Set());
            this.activeSubscriptions.add(stream);
            
            // Send subscription message if connected
            this.send({
                method: 'SUBSCRIBE',
                params: [stream],
                id: Date.now()
            });
        }
        this.handlers.get(stream)?.add(handler);
    }

    public unsubscribe(stream: string, handler: MessageHandler) {
        const handlers = this.handlers.get(stream);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.handlers.delete(stream);
                this.activeSubscriptions.delete(stream);
                this.send({
                    method: 'UNSUBSCRIBE',
                    params: [stream],
                    id: Date.now()
                });
            }
        }
    }

    public send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}

export const wsManager = new WebSocketManager();
