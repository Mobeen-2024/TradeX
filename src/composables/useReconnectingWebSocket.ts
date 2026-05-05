import { ref, onUnmounted, type Ref } from 'vue';

interface Options {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onMessage: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Event) => void;
}

export function useReconnectingWebSocket(getUrl: () => string, opts: Options) {
  const isConnected = ref(false);
  let ws: WebSocket | null = null;
  let retryCount = 0;
  let reconnectTimer: number | null = null;
  let manualClose = false;

  const {
    maxRetries = Infinity,
    baseDelayMs = 500,
    maxDelayMs = 30000,
    onMessage,
    onOpen,
    onClose,
    onError
  } = opts;

  const connect = () => {
    if (ws) {
      ws.close();
    }
    
    manualClose = false;
    const url = getUrl();
    
    try {
      ws = new WebSocket(url);
      
      ws.onopen = () => {
        isConnected.value = true;
        retryCount = 0;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        isConnected.value = false;
        onClose?.();
        
        if (!manualClose && retryCount < maxRetries) {
          scheduleReconnect();
        }
      };

      ws.onerror = (err) => {
        onError?.(err);
      };
    } catch (e) {
      console.error('[WS] Connection error:', e);
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimer) return;
    
    const delay = Math.min(baseDelayMs * Math.pow(2, retryCount), maxDelayMs);
    retryCount++;
    
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const disconnect = () => {
    manualClose = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    isConnected.value = false;
  };

  onUnmounted(() => {
    disconnect();
  });

  return {
    connect,
    disconnect,
    isConnected
  };
}
