import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { getEnv } from '../../../config/env.js';
import { defaultQueueJobOptions } from '../../../shared/bullmq.js';
import { breakGlassRepository } from '../repository/break-glass.repository.js';
import { ivpBatchService } from '../services/ivp-batch.service.js';

const QUEUE_NAME = 'risk-ivp-batch';

let queue: Queue | null = null;
let worker: Worker | null = null;

function connectionOptions(): ConnectionOptions {
  const url = new URL(getEnv().REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    ...(url.password ? { password: url.password } : {}),
    ...(url.username && url.username !== 'default' ? { username: url.username } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

/**
 * Nightly IVP anomaly scoring batch (System Design §8.2, 02:00 UTC).
 */
export async function startIvpBatchJob(): Promise<void> {
  if (worker) return;

  const connection = connectionOptions();
  queue = new Queue(QUEUE_NAME, { connection, defaultJobOptions: defaultQueueJobOptions });

  await queue.add(
    'nightly-ivp-batch',
    {},
    {
      repeat: { pattern: '0 2 * * *' },
      jobId: 'risk-ivp-batch-nightly',
    },
  );

  worker = new Worker(
    QUEUE_NAME,
    async () => {
      await breakGlassRepository.expireStale();
      return ivpBatchService.runNightlyBatch();
    },
    { connection },
  );

  worker.on('failed', (_job, err) => {
    console.error('risk.ivp_batch.job_failed', { error: err.message });
  });
}

export async function stopIvpBatchJob(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
