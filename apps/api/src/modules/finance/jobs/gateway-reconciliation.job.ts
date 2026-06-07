import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { getEnv } from '../../../config/env.js';
import { reconciliationService } from '../services/reconciliation.service.js';

const QUEUE_NAME = 'finance-gateway-reconciliation';

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
 * Registers the nightly gateway reconciliation BullMQ job (US-FIN-007 / SRS §10.1).
 * Runs at 02:00 UTC daily; compares Paystack settlement records to platform payments.
 */
export async function startGatewayReconciliationJob(): Promise<void> {
  if (worker) return;

  const connection = connectionOptions();
  queue = new Queue(QUEUE_NAME, { connection });

  await queue.add(
    'nightly-reconcile',
    {},
    {
      repeat: { pattern: '0 2 * * *' },
      jobId: 'finance-gateway-reconciliation-nightly',
    },
  );

  worker = new Worker(
    QUEUE_NAME,
    async () => {
      const result = await reconciliationService.runGatewayReconciliation();
      return result;
    },
    { connection },
  );

  worker.on('failed', (_job, err) => {
    console.error('finance.reconciliation.failed', { error: err.message });
  });
}

export async function stopGatewayReconciliationJob(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
