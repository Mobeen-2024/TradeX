import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import middie from '@fastify/middie';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { gateway } from './src/lib/exchangeGateway.ts';
import {
  redis,
  KEYS,
  getPositions,
  getPositionsBySymbol,
  getGlobalState,
  setPosition,
  deletePosition,
  getOpenOrders,
  setOpenOrder,
  deleteOpenOrder
} from './src/lib/redis.ts';
import { credentialVault } from './src/lib/credentialVault.ts';
import { runRiskChecks, setRiskProfile } from './src/lib/riskEngine.ts';
import { smartOrderRouter } from './src/lib/smartOrderRouter.ts';
import { workerManager, setWorkerBroadcast } from './src/lib/workerManager.ts';
import { queueManager } from './src/lib/queueManager.ts';
import { startAIAnalytics } from './src/lib/aiAnalytics.ts';
import { circuitBreakers } from './src/lib/circuitBreaker.ts';
import { PlaceOrderSchema, AddVaultAccountSchema, RiskProfileSchema, WsMessageSchema } from './src/lib/schemas.ts';
import { bootManager } from './src/lib/bootManager.ts';
import { persistenceService } from './src/lib/persistenceService.ts';
import { stateSyncManager } from './src/lib/stateSyncManager.ts';
import { db } from './src/lib/db.ts';
import { initQdrant } from './src/lib/qdrant.ts';
import { memoryEngine } from './src/lib/ai/memoryEngine.ts';
import { eventBus } from './src/lib/events/eventBus.ts';
// import './src/workers/eventArchiver.ts'; // Replaced by durable BullMQ audit worker
import './src/workers/portfolioArchiver.ts'; // Start portfolio snapshots
import './src/workers/runtimeSnapshotWorker.ts'; // Start runtime checkpointing
import './src/workers/queueWorker.ts'; // Start persistent queues
import { runtimeOrchestrator } from './src/lib/supervisor/runtimeOrchestrator.ts'; // Start Runtime Supervisor
import { z } from 'zod';

async function start() {
  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught exception:', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled rejection:', reason);
  });

  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyWebsocket);
  await fastify.register(middie);

  // ── Start Persistence & Hydration ──────────────────────────
  await initQdrant();
  await bootManager.hydrateRuntime();
  persistenceService.start();

  // ── Start Projection Engine (Deterministic Event Sourcing) ────
  import('./src/lib/events/projectors/positionProjector.ts').then(({ positionProjector }) => {
    console.log('[System] Projection Engine Booted.');
  });

  eventBus.emitEvent('system.boot', 'system', 'INFO', { msg: 'TradeX Pro Engine Started' });

  const isProd = process.env.NODE_ENV === 'production';
  const clients = new Set<any>();

  // ── Wire worker manager broadcast to WS clients ───────────
  setWorkerBroadcast((payload) => {
    for (const client of clients) {
      if (client.readyState === 1) client.send(payload);
    }
  });

  // ── Wire Event Bus to WS clients ──────────────────────────
  eventBus.on('event', (event) => {
    const payload = JSON.stringify({ type: 'audit_event', data: event });
    for (const client of clients) {
      if (client.readyState === 1) client.send(payload);
    }
  });

  const { setWorkflowBroadcast, submitWorkflow } = await import('./src/lib/workflow/orchestrator.ts').then(async (m) => {
    const engineModule = await import('./src/lib/workflow/engine.ts');
    return {
      setWorkflowBroadcast: engineModule.setWorkflowBroadcast,
      submitWorkflow: m.submitWorkflow
    };
  });

  setWorkflowBroadcast((payload: string) => {
    for (const client of clients) {
      if (client.readyState === 1) client.send(payload);
    }
  });

  // ── Start Background Services ──────────────────────────────
  // (AI Analytics is now handled by workerManager at the bottom of the file)

  // ── Circuit Breaker Broadcast ──────────────────────────────
  Object.values(circuitBreakers).forEach(cb => {
    cb.onStateChange((state) => {
      const payload = JSON.stringify({
        type: 'app@circuit_breaker',
        name: cb.getState().name,
        state
      });
      for (const client of clients) {
        if (client.readyState === 1) client.send(payload);
      }
    });
  });

  // ── Gateway → Broadcast pipe ──────────────────────────────
  gateway.on('trade', async (tick) => {
    const symbol = tick.symbol.toLowerCase();
    const mark = tick.price;

    // 1. Efficiently fetch ONLY positions affected by this symbol
    const positions = await getPositionsBySymbol(symbol);
    if (positions.length === 0) {
      // Still broadcast the trade to clients even if no positions
      const payload = JSON.stringify({
        type: 'trade',
        price: tick.price,
        amount: tick.qty,
        side: tick.side,
        timestamp: tick.timestamp,
        positions: [], // No positions for this symbol
      });
      for (const client of clients) {
        if (client.readyState === 1) client.send(payload);
      }
      return;
    }

    // 2. Compute live PnL strictly in memory for broadcast (avoids O(N) Redis write bottlenecks)
    const updatedPositions = [];

    for (const pos of positions) {
      const diff = pos.type === 'LONG' ? mark - pos.entry : pos.entry - mark;
      const liveDelta = diff * pos.size;

      const leverageFactor = typeof pos.leverage === 'number' ? pos.leverage : 1;

      const liveDeltaPercent = (diff / pos.entry) * 100 * leverageFactor;
      const updated = { ...pos, mark, liveDelta, liveDeltaPercent };

      updatedPositions.push(updated);
    }

    // 3. Broadcast to all frontend WS clients
    const payload = JSON.stringify({
      type: 'trade',
      price: tick.price,
      amount: tick.qty,
      side: tick.side,
      timestamp: tick.timestamp,
      positions: updatedPositions,
    });

    for (const client of clients) {
      if (client.readyState === 1) client.send(payload);
    }

    // 4. Sync to workers for in-memory mock mode
    workerManager.postMessageToAll({
      type: 'mock_sync',
      key: KEYS.globalState,
      value: { price: mark.toString() }
    });
  });

  gateway.on('depth', ({ symbol, orderBook }) => {
    const payload = JSON.stringify({ type: 'depth', symbol, orderBook });
    for (const client of clients) {
      if (client.readyState === 1) client.send(payload);
    }

    // Sync to workers
    workerManager.postMessageToAll({
      type: 'mock_sync',
      key: KEYS.orderBook(symbol),
      value: orderBook
    });
  });

  gateway.on('ticker', (data) => {
    const tickerUpdate = {
      price: parseFloat(data.c).toFixed(2),
      high24h: parseFloat(data.h).toFixed(2),
      low24h: parseFloat(data.l).toFixed(2),
      volume: parseFloat(data.v).toFixed(2),
      priceChange: data.p,
      priceChangePct: data.P,
      updatedAt: Date.now().toString(),
    };

    workerManager.postMessageToAll({
      type: 'mock_sync',
      key: KEYS.globalState,
      value: tickerUpdate
    });

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

  // ── Validation Guard ──────────────────────────────────────
  const zodGuard = (schema: z.ZodTypeAny) => {
    return async (request: any, reply: any) => {
      const result = schema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'INVALID_PAYLOAD',
          issues: result.error.issues
        });
      }
      request.body = result.data;
    };
  };

  // ── Phase 2 API Endpoints ──────────────────────────────────

  // ── Institutional order execution (risk → SOR) ────────────
  const handleOrder = async (request: any, reply: any) => {
    try {
      const req = request.body as any; // Now validated
      const globalState = await getGlobalState();
      const currentPrice = parseFloat(globalState.price ?? '0');

      const rawOrder = {
        accountId: req.accountIds?.[0] ?? req.accountId ?? 'default',
        symbol: req.pair ?? req.symbol ?? 'btcusdt',
        side: req.side,
        type: req.type ?? 'Market',
        quantity: req.quantity ?? req.amount,
        price: req.price || currentPrice,
        leverage: parseInt(String(req.leverage ?? '1x').replace('x', '').replace('Cross_', '')) || 1,
        notionalUsd: (req.quantity ?? req.amount) * (req.price || currentPrice),
      };

      // Risk check on primary account
      const riskResult = await runRiskChecks(rawOrder);
      if (!riskResult.approved) {
        return reply.status(422).send({ success: false, error: riskResult.reason, code: 'RISK_BLOCKED' });
      }

      // Instead of immediate direct routing, we push to a durable queue
      const job = await queueManager.addExecution({
        order: rawOrder,
        accountIds: req.accountIds ?? [rawOrder.accountId],
        sorConfig: req.sorConfig ?? { strategy: 'market' }
      });

      return { 
        success: true, 
        jobId: job.id, 
        status: 'QUEUED',
        warnings: riskResult.warnings 
      };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }

  };

  fastify.post('/api/place_order', { preHandler: zodGuard(PlaceOrderSchema) }, handleOrder);
  fastify.post('/api/sor/execute', { preHandler: zodGuard(PlaceOrderSchema) }, handleOrder);

  fastify.post('/api/close_position/:id', async (request, reply) => {
    const { id } = request.params as any;
    const { exitReason = 'MANUAL' } = (request.body as any) || {};
    
    // 1. Get position data before deleting
    const raw = await redis.hget(KEYS.positions, id);
    if (!raw) return reply.status(404).send({ error: 'Position not found' });
    const pos = JSON.parse(raw);
    
    // 2. Get market context
    const marketSnapshot = await getGlobalState();
    
    // 3. Delete position
    await deletePosition(id);
    
    // 4. Trigger AI Learning asynchronously
    memoryEngine.learnFromOutcome({
      strategyId: pos.strategyId || 'manual',
      pair: pos.pair,
      side: pos.type,
      pnlUsdt: pos.liveDelta || 0,
      durationSec: Math.floor((Date.now() - (pos.openedAt || Date.now())) / 1000),
      exitReason,
      marketContext: marketSnapshot
    }).catch(err => console.error('[Memory] Async learning failed:', err));

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

  fastify.get('/api/circuit-breakers', async () => {
    return { breakers: Object.values(circuitBreakers).map(cb => cb.getState()) };
  });

  fastify.post('/api/vault/accounts', { preHandler: zodGuard(AddVaultAccountSchema) }, async (request, reply) => {
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

  // ── AI Cognitive Memory Endpoints ──────────────────────────
  fastify.get('/api/ai/experiences', async () => {
    return (db as any).aiExperience.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20
    });
  });

  fastify.get('/api/ai/outcomes', async () => {
    return (db as any).tradeOutcome.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20
    });
  });

  fastify.get('/api/ai/recall', async (request) => {
    const { query = '' } = (request.query as any) || {};
    if (!query) return [];
    return memoryEngine.recallRelevantMemories(query);
  });

  fastify.get('/api/events', async (request) => {
    const { type, severity, limit = 50 } = (request.query as any) || {};
    const where: any = {};
    if (type) where.eventType = type;
    if (severity) where.severity = severity;

    return (db as any).auditEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit.toString())
    });
  });

  fastify.get('/api/portfolio/history', async (request) => {
    const { accountId = 'default_account', limit = 100 } = (request.query as any) || {};
    
    return (db as any).portfolioSnapshot.findMany({
      where: { accountId },
      orderBy: { timestamp: 'asc' },
      take: parseInt(limit.toString())
    });
  });

  // ── Risk Profiles ────────────────────────────────────────
  fastify.post('/api/risk/profile', { preHandler: zodGuard(RiskProfileSchema) }, async (request, reply) => {
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
      
      // Snapshot strategy metadata
      await stateSyncManager.snapshotStrategy({
        id: workerId,
        name: config.name || type,
        type,
        status: 'RUNNING',
        alloc: config.alloc || 0,
        pairs: [config.symbol || 'BTCUSDT'],
        createdAt: Date.now()
      });

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
        const raw = JSON.parse(message.toString());

        // WebSocket Validation — Discriminated Union for all WS message types
        const wsResult = WsMessageSchema.safeParse(raw);
        if (!wsResult.success) {
          console.warn('[WS] Dropped invalid message:', wsResult.error.issues[0].message);
          return;
        }

        const data = wsResult.data;
        if (data.type === 'place_order') {
          const order = data.order;
          const globalState = await getGlobalState();
          const currentPrice = parseFloat(globalState.price ?? '0');
          const isInstant = order.type === 'Market' || !order.type;

          if (isInstant) {
            const newPos = {
              id: Math.random().toString(36).substr(2, 9),
              accountId: order.accountIds?.[0] ?? 'default',
              pair: order.pair,
              type: order.side === 'Buy' ? 'LONG' : 'SHORT',
              leverage: typeof order.leverage === 'number' ? order.leverage : parseInt(String(order.leverage ?? '1').replace(/[^0-9]/g, '')) || 1,
              size: order.quantity || order.amount,
              cost: order.cost,
              entry: order.price || currentPrice,
              mark: order.price || currentPrice,
              liveDelta: 0,
              liveDeltaPercent: 0,
              protocolLimits: ['-', '-']
            };
            await setPosition(newPos.id, newPos);
            workerManager.postMessageToAll({ type: 'mock_sync', key: KEYS.positions, value: await getPositions() });
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
          workerManager.postMessageToAll({ type: 'mock_sync', key: KEYS.positions, value: await getPositions() });
        } else if (data.type === 'execute_workflow') {
          await submitWorkflow(data.workflowId, data.nodes, data.edges, data.settings);
        }
      } catch (e) {
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
  let vite: any;
  if (!isProd) {
    vite = await createViteServer({
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

    // ── Resume Background Tasks ────────────────────
    smartOrderRouter.resumeActiveTwaps().catch(err => console.error('[SOR] Resumption failed:', err));

    // ── Start Institutional Intelligence Cluster ───────────
    
    // 1. Intelligence Agents (Environmental Modeling)
    const agents = [
      { type: 'volatility_agent', config: { symbol: 'btcusdt' } },
      { type: 'sentiment_agent',  config: { symbol: 'btcusdt' } },
      { type: 'macro_agent',      config: { symbol: 'btcusdt' } },
      { type: 'ai_analytics',     config: { symbol: 'btcusdt', intentIntervalMs: 1000, levelsIntervalMs: 30000, qualityGateEnabled: true } }
    ] as const;

    for (const agent of agents) {
      workerManager.start(agent.type as any, agent.config).catch(err => 
        console.error(`[AI] Agent ${agent.type} failed to start:`, err)
      );
    }
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

    // Terminate all WS clients to prevent Fastify close from hanging
    for (const client of clients) {
      client.terminate();
    }

    if (vite) {
      await vite.close();
    }

    // 1. Drain Fastify to finish in-flight requests (relies on Redis)
    await fastify.close();

    // 2. Stop async worker threads
    await workerManager.stopAll();

    // 3. Pause TWAP orders safely (needs Redis)
    await smartOrderRouter.cancelAllTwap();

    // 4. Stop market data ingestion
    gateway.terminate();

    // 5. Terminate persistent connections
    await redis.quit();

    console.log('[Server] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
