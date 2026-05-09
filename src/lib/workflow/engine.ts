import { setWorkerBroadcast } from '../workerManager.ts';

// We'll use a hack to broadcast to WS clients
let broadcastFn: ((payload: string) => void) | null = null;
export function setWorkflowBroadcast(fn: (payload: string) => void) {
  broadcastFn = fn;
}

function broadcastNodeState(workflowId: string, nodeId: string, status: string, outputs: any = {}, latency: number = 0, logs: string[] = []) {
  if (broadcastFn) {
    broadcastFn(JSON.stringify({
      type: 'workflow_node_state',
      workflowId,
      nodeId,
      status, // 'idle' | 'running' | 'success' | 'failed'
      outputs,
      latency,
      logs
    }));
  }
}

export async function executeWorkflow(workflowId: string, nodes: any[], edges: any[], settings: any) {
  // 1. Dependency Graph & Traversal
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const nodeMap = new Map<string, any>();

  for (const node of nodes) {
    adjList.set(node.id, []);
    inDegree.set(node.id, 0);
    nodeMap.set(node.id, node);
  }

  for (const edge of edges) {
    // some nodes might not exist if edges are dangling
    if (adjList.has(edge.source) && inDegree.has(edge.target)) {
      adjList.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, inDegree.get(edge.target)! + 1);
    }
  }

  // Find start nodes
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  // Execution Context & State Management
  const context: Record<string, any> = {};

  const executeNode = async (currentId: string) => {
    const node = nodeMap.get(currentId)!;
    const startTime = Date.now();
    broadcastNodeState(workflowId, currentId, 'running', {}, 0, ['Starting execution']);

    try {
      // Simulate execution time
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

      let output = {};
      const inputs = context[currentId] || {};

      if (node.type === 'priceFeed') {
        output = { price: 65000 + Math.floor(Math.random() * 100) }; 
      } else if (node.type === 'bybitStream') {
        output = { price: 65000 + Math.floor(Math.random() * 100), source: 'Bybit' };
      } else if (node.type === 'wsFeed') {
        output = { value: 65000, source: 'WebSocket' };
      } else if (node.type === 'rsiIndicator') {
        output = { rsi: 29 + Math.floor(Math.random() * 5) };
      } else if (node.type === 'emaIndicator') {
        output = { ema: 64500 };
      } else if (node.type === 'macdIndicator') {
        output = { macd: 1.25, signal: 1.05, hist: 0.2 };
      } else if (node.type === 'vwapIndicator') {
        output = { vwap: 64600 };
      } else if (node.type === 'atrIndicator') {
        output = { atr: 1500.5 };
      } else if (node.type === 'bollingerIndicator') {
        output = { upper: 66000, lower: 63000, basis: 64500 };
      } else if (node.type === 'sentiment') {
        output = { score: 85, label: 'Bullish' };
      } else if (node.type === 'whaleAlerts') {
        output = { alerts: 2, totalVolume: '$150M' };
      } else if (node.type === 'newsAnalysis') {
        output = { impact: 'Positive', mentions: 12 };
      } else if (node.type === 'volatilityPrediction') {
        output = { predictedVol: 'High', confidence: '82%' };
      } else if (node.type === 'ifElseLogic') {
        output = { result: true };
      } else if (node.type === 'riskManager') {
        const kill = node.data?.killSwitch;
        if (kill) {
          throw new Error('Kill switch engaged. Trading halted.');
        } else {
          output = { riskPassed: true };
        }
      } else if (node.type === 'marketOrder') {
        output = { success: true, orderId: `ord_${Math.floor(Math.random() * 1000)}` };
      } else if (node.type === 'twapOrder') {
        output = { success: true, twapId: `twap_${Math.floor(Math.random() * 1000)}`, status: 'running' };
      } else if (node.type === 'icebergOrder') {
        output = { success: true, icebergId: `ice_${Math.floor(Math.random() * 1000)}`, filled: '1 BTC / 10 BTC' };
      } else if (node.type === 'dcaOrder') {
        output = { success: true, dcaId: `dca_${Math.floor(Math.random() * 1000)}`, nextRun: 'in 24h' };
      } else if (node.type === 'smartRouting') {
        output = { success: true, routedTo: 'BYB', executionPrice: 64510.5 };
      }

      const latency = Date.now() - startTime;
      
      const children = adjList.get(currentId) || [];
      const nextNodesToRun = [];

      for (const childId of children) {
        if (!context[childId]) context[childId] = {};
        context[childId][currentId] = output;
        
        const deg = inDegree.get(childId)! - 1;
        inDegree.set(childId, deg);
        if (deg === 0) {
          nextNodesToRun.push(childId);
        }
      }

      broadcastNodeState(workflowId, currentId, 'success', output, latency, ['Execution successful']);

      if (nextNodesToRun.length > 0) {
        await Promise.all(nextNodesToRun.map(id => executeNode(id)));
      }

    } catch (e: any) {
      const latency = Date.now() - startTime;
      broadcastNodeState(workflowId, currentId, 'failed', {}, latency, [e.message]);
    }
  };

  if (queue.length > 0) {
    await Promise.all(queue.map(id => executeNode(id)));
  }
}
