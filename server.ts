import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import middie from '@fastify/middie';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { gateway } from './src/lib/exchangeGateway.js';
import {
  redis,
  KEYS,
  getPositions,
  getGlobalState,
  setPosition,
  deletePosition,
  getOpenOrders,
  setOpenOrder,
  deleteOpenOrder
} from './src/lib/redis.js';
import { credentialVault } from './src/lib/credentialVault.js';
import { runRiskChecks, setRiskProfile } from './src/lib/riskEngine.js';
import { smartOrderRouter } from './src/lib/smartOrderRouter.js';
import { workerManager, setWorkerBroadcast } from './src/lib/workerManager.js';

async function start() {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyWebsocket);
  await fastify.register(middie);

  const isProd = process.env.NODE_ENV === 'production';
  const clients = new Set<any>();

  // ── Wire worker manager broadcast to WS clients ───────────
  setWorkerBroadcast((payload) => {
    for (const client of clients) {
      if (client.readyState === 1) client.send(payload);
    }
  });

  // ── Gateway → Broadcast pipe ──────────────────────────────
  gateway.on('trade', async (tick) => {
    const positions = await getPositions();
    const mark = tick.price;

    // Update live PnL for all positions via Redis pipeline
    const pipe = redis.pipeline();
    for (const pos of positions) {
      const diff = pos.type === 'LONG' ? mark - pos.entry : pos.entry - mark;
      const liveDelta = diff * pos.size;
      const leverageFactor = pos.leverage.includes('10x') ? 10 : 1;
      const liveDeltaPercent = (diff / pos.entry) * 100 * leverageFactor;
      const updated = { ...pos, mark, liveDelta, liveDeltaPercent };
      pipe.hset(KEYS.positions, pos.id, JSON.stringify(updated));
    }
    await pipe.exec();

    // Broadcast to all frontend WS clients
    const payload = JSON.stringify({
      type: 'trade',
      price: tick.price,
      amount: tick.qty,
      side: tick.side,
      timestamp: tick.timestamp,
      positions: await getPositions(),
    });

    for (const client of clients) {
      if (client.readyState === 1) client.send(payload);
    }
  });

  gateway.on('depth', ({ symbol, orderBook }) => {
    const payload = JSON.stringify({ type: 'depth', symbol, orderBook });
    for (const client of clients) {
      if (client.readyState === 1) client.send(payload);
    }
  });

  gateway.on('ticker', (data) => {
    const payload = JSON.stringify({
      type: 'trade', // Reuse trade type for ticker updates to minimize frontend changes
      price: parseFloat(data.c),
      ticker: {
        p: data.p,
        P: data.P,
        h: data.h,
        l: data.l,
        v: data.v,
        q: data.q
      }
    });
    for (const client of clients) {
      if (client.readyState === 1) client.send(payload);
    }
  });

  // ── Phase 2 API Endpoints ──────────────────────────────────

  // ── Institutional order execution (risk → SOR) ────────────
  fastify.post('/api/place_order', async (request, reply) => {
    try {
      const req: any = request.body;
      const globalState = await getGlobalState();
      const currentPrice = parseFloat(globalState.price ?? '0');
      const accountIds: string[] = req.accountIds ?? [req.accountId ?? 'default'];

      const rawOrder = {
        accountId:  accountIds[0],
        symbol:     req.pair ?? req.symbol ?? 'btcusdt',
        side:       req.side,
        type:       req.type ?? 'Market',
        quantity:   req.amount ?? req.quantity,
        price:      req.price || currentPrice,
        leverage:   parseInt((req.leverage ?? '1x').replace('x', '').replace('Cross_', '')) || 1,
        notionalUsd: (req.amount ?? req.quantity) * (req.price || currentPrice),
      };

      // 1. Pre-flight risk checks
      const riskResult = await runRiskChecks(rawOrder);
      if (!riskResult.approved) {
        return reply.status(422).send({ success: false, error: riskResult.reason, code: 'RISK_BLOCKED' });
      }

      // 2. Determine routing strategy
      const sorConfig = req.sorConfig ?? { strategy: 'market' };

      // 3. Route through SOR (multi-account fanout if multiple accountIds)
      const sorResult = await smartOrderRouter.route(rawOrder, accountIds, sorConfig);

      return { success: true, sorResult, warnings: riskResult.warnings };
    } catch(e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  fastify.post('/api/close_position/:id', async (request, reply) => {
    const { id } = request.params as any;
    await deletePosition(id);
    console.log('Position closed via API, id:', id);
    return { success: true };
  });

  fastify.get('/api/positions', async (request, reply) => {
    const positions = await getPositions();
    return { positions };
  });

  // ── Credential Vault ──────────────────────────────────────
  fastify.get('/api/vault/accounts', async () => {
    return { accounts: await credentialVault.listAccounts() };
  });

  fastify.post('/api/vault/accounts', async (request, reply) => {
    try {
      const { label, exchange, apiKey, apiSecret, passphrase, permissions, subAccount } = request.body as any;
      const account = await credentialVault.addAccount(
        label, exchange,
        { apiKey, apiSecret, passphrase },
        permissions, subAccount
      );
      const { encryptedCredentials, authTag, iv, ...safe } = account;
      return { success: true, account: safe };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  fastify.delete('/api/vault/accounts/:id', async (request, reply) => {
    const { id } = request.params as any;
    await credentialVault.removeAccount(id);
    return { success: true };
  });

  fastify.patch('/api/vault/accounts/:id/status', async (request, reply) => {
    const { id } = request.params as any;
    const { status } = request.body as any;
    await credentialVault.updateStatus(id, status);
    return { success: true };
  });

  // ── Risk Profiles ────────────────────────────────────────
  fastify.post('/api/risk/profile', async (request, reply) => {
    try {
      const profile = request.body as any;
      await setRiskProfile(profile);
      return { success: true };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // ── Algorithm Workers ────────────────────────────────────
  fastify.get('/api/workers', async () => {
    return { workers: workerManager.list() };
  });

  fastify.post('/api/workers/start', async (request, reply) => {
    try {
      const { type, config } = request.body as any;
      const workerId = await workerManager.start(type, config);
      return { success: true, workerId };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  fastify.post('/api/workers/:id/stop', async (request, reply) => {
    try {
      const { id } = request.params as any;
      await workerManager.stop(id);
      return { success: true };
    } catch (e: any) {
      return reply.status(404).send({ error: e.message });
    }
  });

  fastify.patch('/api/workers/:id/config', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const config = request.body as any;
      workerManager.updateConfig(id, config);
      return { success: true };
    } catch (e: any) {
      return reply.status(404).send({ error: e.message });
    }
  });

  // ── SOR: Institutional multi-account order ────────────────
  fastify.post('/api/sor/execute', async (request, reply) => {
    try {
      const { order, accountIds, sorConfig } = request.body as any;
      const globalState = await getGlobalState();
      const currentPrice = parseFloat(globalState.price ?? '0');

      const rawOrder = {
        accountId:  accountIds?.[0] ?? 'default',
        symbol:     order.symbol ?? 'btcusdt',
        side:       order.side,
        type:       order.type ?? 'Market',
        quantity:   order.quantity,
        price:      order.price || currentPrice,
        leverage:   order.leverage ?? 1,
        notionalUsd: order.quantity * (order.price || currentPrice),
      };

      // Risk check on primary account
      const riskResult = await runRiskChecks(rawOrder);
      if (!riskResult.approved) {
        return reply.status(422).send({ success: false, error: riskResult.reason, code: 'RISK_BLOCKED' });
      }

      const sorResult = await smartOrderRouter.route(rawOrder, accountIds ?? [rawOrder.accountId], sorConfig ?? { strategy: 'market' });
      return { success: true, sorResult };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });


  // ── WebSocket Handler ──────────────────────────────────────
  fastify.get('/ws/trading', { websocket: true }, async (connection, req) => {
    clients.add(connection);
    console.log('Frontend WS Connection opened!');
    
    connection.send(JSON.stringify({ type: 'connected', message: 'TradeX Pro Institutional Backend Connected' }));

    // Send initial snapshot from Redis
    const [positions, globalState] = await Promise.all([
      getPositions(),
      getGlobalState(),
    ]);

    connection.send(JSON.stringify({
      type: 'snapshot',
      positions,
      globalState,
      price: parseFloat(globalState.price ?? '0'),
      ticker: {
        p: globalState.priceChange,
        P: globalState.priceChangePct,
        h: globalState.high24h,
        l: globalState.low24h,
        v: globalState.volume,
        q: '0' // volUsdt not directly in ticker but can be added
      }
    }));

    connection.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'place_order') {
          const order = data.order;
          const globalState = await getGlobalState();
          const currentPrice = parseFloat(globalState.price ?? '0');
          const isInstant = order.type === 'Market' || !order.type;
          
          if (isInstant) {
            const newPos = {
              id: Math.random().toString(36).substr(2, 9),
              pair: order.pair,
              type: order.side === 'Buy' ? 'LONG' : 'SHORT',
              leverage: order.leverage,
              size: order.amount,
              cost: order.cost,
              entry: order.price || currentPrice,
              mark: order.price || currentPrice,
              liveDelta: 0,
              liveDeltaPercent: 0,
              protocolLimits: ['-', '-']
            };
            await setPosition(newPos.id, newPos);
            connection.send(JSON.stringify({ type: 'position_opened', position: newPos }));
          } else {
            const newOrder = {
              id: Math.random().toString(36).substr(2, 9),
              ...order,
              activationPrice: order.activationPrice || currentPrice
            };
            await setOpenOrder(newOrder.id, newOrder);
            connection.send(JSON.stringify({ type: 'order_placed', order: newOrder }));
          }
        } else if (data.type === 'close_position') {
          await deletePosition(data.id);
        }
      } catch(e) {
        console.error('Error handling WS message:', e);
      }
    });

    let isAlive = true;
    connection.on('pong', () => { isAlive = true; });

    const pingInterval = setInterval(() => {
      if (!isAlive) {
        clients.delete(connection);
        clearInterval(pingInterval);
        return connection.terminate();
      }
      isAlive = false;
      connection.ping();
    }, 15000);

    connection.on('close', () => {
      clients.delete(connection);
      clearInterval(pingInterval);
      console.log('Frontend WS Connection closed');
    });
    
    connection.on('error', (err) => {
      clients.delete(connection);
      clearInterval(pingInterval);
      console.error('Frontend WS Connection error:', err);
    });
  });

  // ── Vite / Static Files ────────────────────────────────────
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
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
    fastify.get('*', async (request, reply) => {
      const indexPath = path.join(process.cwd(), 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf-8');
        return reply.type('text/html').send(content);
      }
      reply.status(404).send('Not Found. Please run npm run build first.');
    });
  }

  const port = 3000;
  fastify.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    console.log(`\n  🚀 TradeX Pro Backend running at: ${address}`);
    gateway.connect();

    // ── Start Institutional AI Analytics ───────────
    workerManager.start('ai_analytics', { 
        symbol: 'btcusdt',
        intentIntervalMs: 1000,
        levelsIntervalMs: 30000,
        qualityGateEnabled: true
    }).catch(err => console.error('[AI] Worker failed to start:', err));
  });

  const shutdown = async () => {
    await workerManager.stopAll();
    gateway.terminate();
    await fastify.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
