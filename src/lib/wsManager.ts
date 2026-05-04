import { ref } from 'vue';

type MessageHandler = (data: any) => void;

class WebSocketManager {
    private ws: WebSocket | null = null;
    private handlers: Map<string, Set<MessageHandler>> = new Map();
    private activeSubscriptions: Set<string> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 20;
    
    private getUrl() {
        if (typeof window === 'undefined') return 'ws://localhost:3000/ws/trading';
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
        console.log('[WS] Connecting to Institutional Backend:', url);
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('[WS] Connected');
            this.isConnected.value = true;
            this.reconnectAttempts = 0;
            // Restore subscriptions if any (institutional backend broadcasts all by default now)
            this.activeSubscriptions.forEach(stream => {
                this.send({ type: 'subscribe', stream });
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // 1. Snapshot Handling (Institutional Upgrade)
                if (data.type === 'snapshot') {
                    this.dispatch('app@snapshot', data);
                    
                    // Also normalize to ticker for immediate UI update
                    if (data.globalState) {
                        const tickerData = {
                            s: 'BTCUSDT',
                            c: data.globalState.price || '0',
                            p: data.globalState.priceChange || '0.00',
                            P: data.globalState.priceChangePct || '0.00',
                            h: data.globalState.high24h || '0',
                            l: data.globalState.low24h || '0',
                            v: data.globalState.volume || '0',
                            q: '0'
                        };
                        this.dispatch('btcusdt@ticker', tickerData);
                    }
                    return;
                }

                // 2. Trade & Ticker Updates
                if (data.type === 'trade') {
                    // Update positions if included
                    if (data.positions) {
                        this.dispatch('app@positions', data.positions);
                    }

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
                }

                // 3. Order Book Depth
                if (data.type === 'depth') {
                    const depthData = {
                        b: data.orderBook.bids.map((b: any) => [b.price.toString(), b.amount.toString()]),
                        a: data.orderBook.asks.map((a: any) => [a.price.toString(), a.amount.toString()])
                    };
                    this.dispatch('btcusdt@depth20@100ms', depthData);
                }

                // Handle legacy or direct stream routing
                const stream = data.stream || (data.e ? `${data.s?.toLowerCase()}@${data.e}` : null);
                if (stream) {
                    this.dispatch(stream, data.data || data);
                }
            } catch (e) {
                console.error('[WS] Parse Error:', e);
            }
        };

        this.ws.onclose = () => {
            this.isConnected.value = false;
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = Math.min(this.reconnectAttempts * 1000, 10000);
                console.log(`[WS] Disconnected. Reconnecting in ${delay}ms...`);
                setTimeout(() => this.connect(), delay);
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
