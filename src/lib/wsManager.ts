import { ref } from 'vue';

type MessageHandler = (data: any) => void;

class WebSocketManager {
    private ws: WebSocket | null = null;
    private handlers: Map<string, Set<MessageHandler>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private url: string = 'wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/btcusdt@depth20@100ms';

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
        };

        this.ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                const stream = payload.stream;
                
                if (this.handlers.has(stream)) {
                    this.handlers.get(stream)?.forEach(handler => handler(payload.data));
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
        }
        this.handlers.get(stream)?.add(handler);
    }

    public unsubscribe(stream: string, handler: MessageHandler) {
        this.handlers.get(stream)?.delete(handler);
    }

    public send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}

export const wsManager = new WebSocketManager();
