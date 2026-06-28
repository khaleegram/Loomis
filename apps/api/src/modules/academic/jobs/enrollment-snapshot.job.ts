import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { getEnv } from '../../../config/env.js';
import { defaultQueueJobOptions } from '../../../shared/bullmq.js';
import { censusService } from '../services/census.service.js';

const QUEUE_NAME = 'academic-enrollment-snapshot';

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
 * Daily enrollment billing snapshot job (US-ASM-003). Auto-snapshots open terms
 * whose census snapshot date has been reached, and sends T-7 MTC warnings.
 */
export async function startEnrollmentSnapshotJob(): Promise<void> {
  if (worker) return;

  const connection = connectionOptions();
  queue = new Queue(QUEUE_NAME, { connection, defaultJobOptions: defaultQueueJobOptions });

  await queue.add(
    'daily-snapshot',
    {},
    {
      repeat: { pattern: '0 3 * * *' },
      jobId: 'academic-enrollment-snapshot-daily',
    },
  );

  worker = new Worker(
    QUEUE_NAME,
    async () => {
      const snapshotResult = await censusService.runScheduledSnapshots();
      const mtcResult = await censusService.runMtcWarnings();
      return { ...snapshotResult, ...mtcResult };
    },
    { connection },
  );

  worker.on('failed', (_job, err) => {
    console.error('academic.enrollment_snapshot.failed', { error: err.message });
  });
}

export async function stopEnrollmentSnapshotJob(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
