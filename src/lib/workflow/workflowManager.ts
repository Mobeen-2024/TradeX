import { db } from '../db.ts';
import { stateSyncManager } from '../stateSyncManager.ts';

/**
 * Institutional Workflow Manager ("Git for Workflows")
 * 
 * Handles the strategy versioning lifecycle, including commits,
 * parameter diffing, and rollbacks.
 */
export const workflowManager = {
  /**
   * Commits a new version of a strategy to the database
   */
  async commit(strategyId: string, config: {
    name?: string;
    description?: string;
    nodes: any[];
    edges: any[];
    settings: any;
    alloc: number;
    pairs: string[];
    commitMessage?: string;
  }) {
    console.log(`[Workflow] Committing new version for strategy: ${strategyId}`);

    return await (db as any).$transaction(async (tx: any) => {
      // 1. Ensure Strategy exists
      const strategy = await tx.strategy.upsert({
        where: { id: strategyId },
        update: { 
          name: config.name || 'Untitled Strategy',
          description: config.description
        },
        create: {
          id: strategyId,
          name: config.name || 'Untitled Strategy',
          description: config.description
        }
      });

      // 2. Get next version number
      const lastVersion = await tx.strategyVersion.findFirst({
        where: { strategyId },
        orderBy: { versionNumber: 'desc' }
      });
      const nextVersionNum = (lastVersion?.versionNumber || 0) + 1;

      // 3. Mark all other versions as inactive
      await tx.strategyVersion.updateMany({
        where: { strategyId },
        data: { isActive: false }
      });

      // 4. Create new Version
      const version = await tx.strategyVersion.create({
        data: {
          strategyId,
          versionNumber: nextVersionNum,
          commitMessage: config.commitMessage || `Deployment v${nextVersionNum}`,
          isActive: true,
          alloc: config.alloc,
          settings: config.settings,
          pairs: config.pairs.join(','),
          nodes: {
            create: config.nodes.map(n => ({
              id: n.id,
              type: n.type,
              label: n.data?.label || n.type,
              positionX: n.position.x,
              positionY: n.position.y,
              config: n.data ? JSON.parse(JSON.stringify(n.data)) : {}
            }))
          },
          edges: {
            create: config.edges.map(e => ({
              id: e.id,
              sourceNodeId: e.source,
              targetNodeId: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle
            }))
          }
        }
      });

      // 5. Initialize StrategyRuntime if it doesn't exist
      await tx.strategyRuntime.upsert({
        where: { strategyId },
        update: { status: 'RUNNING' },
        create: { strategyId, status: 'RUNNING' }
      });

      // 6. Snapshot to Redis for immediate execution
      await stateSyncManager.snapshotStrategy({
        id: strategyId,
        name: strategy.name,
        ...config,
        status: 'RUNNING',
        version: nextVersionNum
      });

      return version;
    });
  },

  /**
   * Rolls back a strategy to a historical version
   */
  async rollback(strategyId: string, versionId: string) {
    const historicalVersion = await (db as any).strategyVersion.findUnique({
      where: { id: versionId },
      include: { nodes: true, edges: true, strategy: true }
    });

    if (!historicalVersion) throw new Error('Version not found');

    // To maintain linear history, we commit the historical config as a NEW version
    return await this.commit(strategyId, {
      name: historicalVersion.strategy.name,
      description: historicalVersion.strategy.description || undefined,
      nodes: historicalVersion.nodes.map(n => ({
        id: n.id,
        type: n.type,
        data: n.config,
        position: { x: n.positionX, y: n.positionY }
      })),
      edges: historicalVersion.edges.map(e => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle
      })),
      settings: historicalVersion.settings,
      alloc: historicalVersion.alloc,
      pairs: historicalVersion.pairs.split(','),
      commitMessage: `Rollback to v${historicalVersion.versionNumber}`
    });
  }
};
