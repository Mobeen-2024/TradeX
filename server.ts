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

setInterval(() => {
    const volatility = globalPrice * 0.001;
    globalPrice += (Math.random() - 0.5) * volatility;
    
    // Update mock positions PNL globally
    positions = positions.map(pos => {
       const mark = Number(globalPrice.toFixed(2));
       const diff = pos.type === 'LONG' ? mark - pos.entry : pos.entry - mark;
       const liveDelta = diff * pos.size;
       const liveDeltaPercent = (diff / pos.entry) * 100 * (pos.leverage.includes('10x') ? 10 : 1);
       return { ...pos, mark, liveDelta, liveDeltaPercent };
    });
}, 500);

async function start() {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyWebsocket);
  await fastify.register(middie);

  const isProd = process.env.NODE_ENV === 'production';

  fastify.post('/api/place_order', async (request, reply) => {
    try {
        const order: any = request.body;
        const newPos = {
            id: Math.random().toString(36).substr(2, 9),
            pair: order.pair,
            type: order.side === 'Buy' ? 'LONG' : 'SHORT',
            leverage: order.leverage,
            size: order.amount,
            cost: order.cost,
            entry: order.price,
            mark: order.price,
            liveDelta: 0,
            liveDeltaPercent: 0,
            protocolLimits: ['-', '-']
        };
        positions.push(newPos);
        saveDb();
        console.log('Position POST added, total positions:', positions.length);
        return { success: true, position: newPos };
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
                console.log('Processing place_order');
                const newPos = {
                    id: Math.random().toString(36).substr(2, 9),
                    pair: data.order.pair,
                    type: data.order.side === 'Buy' ? 'LONG' : 'SHORT',
                    leverage: data.order.leverage,
                    size: data.order.amount,
                    cost: data.order.cost,
                    entry: data.order.price,
                    mark: data.order.price,
                    liveDelta: 0,
                    liveDeltaPercent: 0,
                    protocolLimits: ['-', '-']
                };
                positions.push(newPos);
                saveDb();
                console.log('Position added, total positions:', positions.length);
                connection.send(JSON.stringify({ type: 'position_opened', position: newPos }));
            } else if (data.type === 'close_position') {
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
