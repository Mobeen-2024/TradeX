import { executeWorkflow } from './engine.ts';

// In-Memory Queue Simulation since Redis is unavailable in this environment
interface Job {
  data: any;
}

type WorkerProcess = (job: Job) => Promise<void>;

class MockQueue {
  name: string;
  worker?: MockWorker;
  
  constructor(name: string) {
    this.name = name;
  }

  async add(name: string, data: any) {
    if (this.worker) {
      setTimeout(() => {
        this.worker!.process({ data }).catch(console.error);
      }, 0);
    }
  }
}

class MockWorker {
  name: string;
  processor: WorkerProcess;

  constructor(name: string, processor: WorkerProcess, opts: any) {
    this.name = name;
    this.processor = processor;
  }

  async process(job: Job) {
    await this.processor(job);
  }
}

export const workflowQueue = new MockQueue('workflow_queue');

export const workflowWorker = new MockWorker('workflow_queue', async (job: Job) => {
  const { workflowId, nodes, edges, settings } = job.data;
  
  // Node Executor
  await executeWorkflow(workflowId, nodes, edges, settings);
}, { connection: null });

// Link queue to worker for mock execution
workflowQueue.worker = workflowWorker;

export async function submitWorkflow(workflowId: string, nodes: any[], edges: any[], settings: any) {
  await workflowQueue.add('execute', { workflowId, nodes, edges, settings });
}
