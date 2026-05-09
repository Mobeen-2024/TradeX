import { io } from 'socket.io-client';
import { useLiquidStore } from '../store/liquidStore';

// In a real app, point this to your actual backend.
// We use a mock configuration for the sandbox.
export const initSocket = () => {
  // Using a dummy URL for the sandbox to avoid actual connection errors causing timeouts,
  // but demonstrating Socket.IO usage for realtime events.
  const socket = io('https://ws.example.com', {
    autoConnect: false
  });

  socket.on('connect', () => {
    console.log('Liquid 3.0 Realtime Connected');
  });

  socket.on('marketPulse', (data: any) => {
    const liquidStore = useLiquidStore();
    liquidStore.updateMarketDominance(data.dominance);
    liquidStore.addEvent('Pulse received from websocket');
  });

  // Attempt to connect or simulate connection in preview
  setTimeout(() => {
    const liquidStore = useLiquidStore();
    liquidStore.addEvent('Realtime connection simulated (Socket.IO Ready)');
  }, 1000);

  return socket;
};
