import { ref } from 'vue';

type MessageHandler = (data: any) => void;

class WebSocketManager {
    private ws: WebSocket | null = null;
    private handlers: Map<string, Set<MessageHandler>> = new Map();
    private activeSubscriptions: Set<string> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    
    // Dynamic URL based on environment or window location
    private getUrl() {
        if (typeof window === 'undefined') return 'ws://localhost:3000/ws/trading';
        
        // If we want to force Binance for certain streams, we could logic it here.
        // For TradeX development, we favor our own backend which can proxy or mock.
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws/trading`;
    }

    public isConnected = ref(false);

    constructor() {
        if (typeof window !== 'undefined') {
            this.connect();
        }
    }

    private connect() {
        const url = this.getUrl();
        console.log('Connecting to WS:', url);
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WS Manager Connected');
            this.isConnected.value = true;
            this.reconnectAttempts = 0;
            // Restore subscriptions
            this.activeSubscriptions.forEach(stream => {
                this.send({ type: 'subscribe', stream });
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Normalization Layer: Convert local backend messages to Binance-style 
                // for tradeStore compatibility, OR handle local specific types.
                
                if (data.type === 'trade') {
                    // Normalize to ticker-like update
                    const tickerData = {
                        s: 'BTCUSDT',
                        c: data.price.toString(),
                        p: data.ticker?.p || '0.00',
                        P: data.ticker?.P || '0.00',
                        h: data.ticker?.h || data.price.toString(),
                        l: data.ticker?.l || data.price.toString(),
                        v: data.ticker?.v || '0',
                        q: data.ticker?.q || '0'
                    };
                    this.dispatch('btcusdt@ticker', tickerData);

                    // Normalize to depth-like update
                    if (data.orderBook) {
                        const depthData = {
                            b: data.orderBook.bids.map((b: any) => [b.price.toString(), b.amount.toString()]),
                            a: data.orderBook.asks.map((a: any) => [a.price.toString(), a.amount.toString()])
                        };
                        this.dispatch('btcusdt@depth20@100ms', depthData);
                    }
                }

                // Handle legacy or direct stream routing
                const stream = data.stream || (data.e ? `${data.s?.toLowerCase()}@${data.e}` : null);
                if (stream) {
                    this.dispatch(stream, data.data || data);
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

    private dispatch(stream: string, data: any) {
        if (this.handlers.has(stream)) {
            this.handlers.get(stream)?.forEach(handler => handler(data));
        }
    }

    public subscribe(stream: string, handler: MessageHandler) {
        if (!this.handlers.has(stream)) {
            this.handlers.set(stream, new Set());
            this.activeSubscriptions.add(stream);
            this.send({ type: 'subscribe', stream });
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
                this.send({ type: 'unsubscribe', stream });
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
