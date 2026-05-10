import { useRuntimeStore } from '../stores/runtimeStore';

let socket: WebSocket | null = null;

export function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws/trading`;
  
  socket = new WebSocket(url);

  socket.onopen = () => {
    console.log('[WS] Connected to TradeX Pro Runtime');
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      const runtimeStore = useRuntimeStore();

      switch (payload.type) {
        case 'runtime_health_update':
          runtimeStore.handleHealthUpdate(payload);
          break;
        case 'blackboard_update':
          runtimeStore.handleBlackboardUpdate(payload);
          break;
        case 'audit_event':
          // Optionally handle globally or in a notification store
          break;
      }
    } catch (e) {
      console.error('[WS] Error parsing message:', e);
    }
  };

  socket.onclose = () => {
    console.warn('[WS] Connection lost. Reconnecting...');
    setTimeout(initWebSocket, 3000);
  };

  return socket;
}

export function sendMessage(msg: object) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}
