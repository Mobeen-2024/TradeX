import { Worker } from 'worker_threads';

const w = new Worker('./src/workers/aiAnalyticsWorker.ts', {
  execArgv: ['--import', 'tsx/esm']
});

w.on('error', console.error);
w.on('exit', code => console.log('Exited with', code));
w.on('message', console.log);
