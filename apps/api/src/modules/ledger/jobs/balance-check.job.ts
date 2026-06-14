import { Queue, Worker } from 'bullmq';
import { bullmqConnectionOptions } from '../../../shared/bullmq.js';
import { balanceCheckService } from '../services/balance-check.service.js';

const QUEUE_NAME = 'ledger-balance-check';

let queue: Queue | null = null;
let worker: Worker | null = null;

/**
 * Nightly platform ledger balance check (System Design §8.3, 04:00 UTC).
 * P1 alert on failure via structured error log.
 */
export async function startBalanceCheckJob(): Promise<void> {
  if (worker) return;

  const connection = bullmqConnectionOptions();
  queue = new Queue(QUEUE_NAME, { connection });

  await queue.add(
    'nightly-balance-check',
    {},
    {
      repeat: { pattern: '0 4 * * *' },
      jobId: 'ledger-balance-check-nightly',
    },
  );

  worker = new Worker(
    QUEUE_NAME,
    async () => balanceCheckService.runBalanceCheck(),
    { connection },
  );

  worker.on('failed', (_job, err) => {
    console.error('ledger.balance_check.job_failed', { error: err.message, severity: 'P1' });
  });
}

export async function stopBalanceCheckJob(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
