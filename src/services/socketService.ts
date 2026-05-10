import { io } from 'socket.io-client';
import { useLiquidStore } from '../store/liquidStore';

const SOCKET_URL = 'https://ws.example.com';

export const socket = io(SOCKET_URL, {
  autoConnect: false
});

export const initSocket = () => {
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
