import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import middie from '@fastify/middie';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const DB_FILE = path.join(process.cwd(), 'mock_db.json');
let positions: any[] = [];

if (fs.existsSync(DB_FILE)) {
  try {
    positions = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {}
}

const saveDb = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(positions, null, 2));
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
};

let globalPrice = 36000.00;
let openOrders: any[] = [];

setInterval(() => {
    const volatility = globalPrice * 0.001;
    globalPrice += (Math.random() - 0.5) * volatility;
    const mark = Number(globalPrice.toFixed(2));
    
    // 1. Process Open Orders (Stop Loss / Take Profit / Trailing)
    openOrders = openOrders.filter(order => {
        let triggered = false;
        
        if (order.type === 'STOP_MARKET' || order.type === 'STOP') {
            if (order.side === 'Buy' && mark >= order.stopPrice) triggered = true;
            if (order.side === 'Sell' && mark <= order.stopPrice) triggered = true;
        } else if (order.type === 'TAKE_PROFIT_MARKET' || order.type === 'TAKE_PROFIT') {
            if (order.side === 'Buy' && mark <= order.stopPrice) triggered = true;
            if (order.side === 'Sell' && mark >= order.stopPrice) triggered = true;
        } else if (order.type === 'TRAILING_STOP_MARKET') {
            // Simple mock: trigger if price moves against us by callbackRate
            // In real logic, we'd track the "peak" price.
            if (order.side === 'Sell' && mark <= order.activationPrice * (1 - order.callbackRate/100)) triggered = true;
            if (order.side === 'Buy' && mark >= order.activationPrice * (1 + order.callbackRate/100)) triggered = true;
        }

        if (triggered) {
            console.log('Order Triggered:', order.type, 'at', mark);
            positions.push({
                id: order.id,
                pair: order.pair,
                type: order.side === 'Buy' ? 'LONG' : 'SHORT',
                leverage: order.leverage,
                size: order.amount,
                cost: order.cost,
                entry: mark,
                mark: mark,
                liveDelta: 0,
                liveDeltaPercent: 0,
                protocolLimits: ['-', '-']
            });
            return false; // Remove from open orders
        }
        return true;
    });

    // 2. Update mock positions PNL globally
    positions = positions.map(pos => {
       const diff = pos.type === 'LONG' ? mark - pos.entry : pos.entry - mark;
       const liveDelta = diff * pos.size;
       const liveDeltaPercent = (diff / pos.entry) * 100 * (pos.leverage.includes('10x') ? 10 : 1);
       return { ...pos, mark, liveDelta, liveDeltaPercent };
    });
    
    if (openOrders.length > 0 || positions.length > 0) saveDb();
}, 500);

async function start() {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyWebsocket);
  await fastify.register(middie);

  const isProd = process.env.NODE_ENV === 'production';

  fastify.post('/api/place_order', async (request, reply) => {
    try {
        const order: any = request.body;
        const isInstant = order.type === 'Market' || !order.type;
        
        if (isInstant) {
            const newPos = {
                id: Math.random().toString(36).substr(2, 9),
                pair: order.pair,
                type: order.side === 'Buy' ? 'LONG' : 'SHORT',
                leverage: order.leverage,
                size: order.amount,
                cost: order.cost,
                entry: order.price || globalPrice,
                mark: order.price || globalPrice,
                liveDelta: 0,
                liveDeltaPercent: 0,
                protocolLimits: ['-', '-']
            };
            positions.push(newPos);
            saveDb();
            return { success: true, position: newPos };
        } else {
            // Advanced Order
            const newOrder = {
                id: Math.random().toString(36).substr(2, 9),
                ...order,
                activationPrice: order.activationPrice || globalPrice
            };
            openOrders.push(newOrder);
            return { success: true, order: newOrder };
        }
    } catch(e: any) {
        return reply.status(500).send({ error: e.message });
    }
  });

  fastify.post('/api/close_position/:id', async (request, reply) => {
    const { id } = request.params as any;
    positions = positions.filter(p => p.id !== id);
    saveDb();
    console.log('Position POST closed, id:', id);
    return { success: true };
  });

  fastify.get('/api/positions', async (request, reply) => {
      return { positions };
  });
    fastify.get('/ws/trading', { websocket: true }, (connection /* WebSocket */, req) => {
      console.log('WS Connection opened!');
      connection.send(JSON.stringify({ type: 'connected', message: 'Fastify High-Speed Trading Backend Connected' }));

      // Send initial state immediately
      connection.send(JSON.stringify({
          type: 'trade',
          price: Number(globalPrice.toFixed(2)),
          amount: 0,
          side: 'buy',
          timestamp: Date.now(),
          orderBook: { asks: [], bids: [] },
          positions
      }));

      // Simulate high-frequency trading data pushing
      const interval = setInterval(() => {
          if (connection.readyState === 1) { // OPEN
              const asks = Array.from({ length: 7 }, (_, i) => ({
                  price: Number((globalPrice + (7 - i) * 1.5 + Math.random()).toFixed(2)),
                  amount: Number((Math.random() * 5 + 1).toFixed(3))
              }));
              
              const bids = Array.from({ length: 7 }, (_, i) => ({
                  price: Number((globalPrice - (i + 1) * 1.5 - Math.random()).toFixed(2)),
                  amount: Number((Math.random() * 5 + 1).toFixed(3))
              }));

              const mockTrade = {
                  type: 'trade',
                  price: Number(globalPrice.toFixed(2)),
                  amount: Number((Math.random() * 2).toFixed(4)),
                  side: Math.random() > 0.5 ? 'buy' : 'sell',
                  timestamp: Date.now(),
                  orderBook: {
                      asks,
                      bids
                  }
              };
              
              connection.send(JSON.stringify({
                  ...mockTrade,
                  positions
              }));
          }
      }, 500); // 500ms updates

      connection.on('message', (message) => {
         try {
            const data = JSON.parse(message.toString());
            console.log('Backend received ws message:', data.type, 'Order data:', data.order ? data.order.pair : '');
            if (data.type === 'place_order') {
                const order = data.order;
                const isInstant = order.type === 'Market' || !order.type;
                
                if (isInstant) {
                    const newPos = {
                        id: Math.random().toString(36).substr(2, 9),
                        pair: order.pair,
                        type: order.side === 'Buy' ? 'LONG' : 'SHORT',
                        leverage: order.leverage,
                        size: order.amount,
                        cost: order.cost,
                        entry: order.price || globalPrice,
                        mark: order.price || globalPrice,
                        liveDelta: 0,
                        liveDeltaPercent: 0,
                        protocolLimits: ['-', '-']
                    };
                    positions.push(newPos);
                    saveDb();
                    connection.send(JSON.stringify({ type: 'position_opened', position: newPos }));
                } else {
                    const newOrder = {
                        id: Math.random().toString(36).substr(2, 9),
                        ...order,
                        activationPrice: order.activationPrice || globalPrice
                    };
                    openOrders.push(newOrder);
                    saveDb();
                    connection.send(JSON.stringify({ type: 'order_placed', order: newOrder }));
                }
            }
 else if (data.type === 'close_position') {
                console.log('Processing close_position', data.id);
                positions = positions.filter(p => p.id !== data.id);
                saveDb();
            }
         } catch(e) {
            console.error('Error handling WS message:', e);
         }
      });

      connection.on('close', () => {
          clearInterval(interval);
          console.log('WS Connection closed');
      });
      connection.on('error', (err) => {
          console.error('WS Connection error:', err);
      });
    });

  if (!isProd) {
    // Mount Vite dev server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    // Use middie to register vite middleware
    fastify.use(vite.middlewares);

    fastify.get('*', async (request, reply) => {
        try {
            const url = request.url;
            let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            reply.type('text/html').send(template);
        } catch (e: any) {
            vite.ssrFixStacktrace(e);
            reply.status(500).send(e.message);
        }
    });
  } else {
    // In production, serve the built static files
    fastify.get('*', async (request, reply) => {
        const indexPath = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath, 'utf-8');
            return reply.type('text/html').send(content);
        }
        reply.status(404).send('Not Found. Please run npm run build first.');
    });
  }

  // AI Studio uses port 3000
  const port = 3000;
  fastify.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    // Server started
  });

  const shutdown = async () => {
    // Closing...
    await fastify.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
