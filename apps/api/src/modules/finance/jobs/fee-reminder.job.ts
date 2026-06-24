import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { getEnv } from '../../../config/env.js';
import { feeReminderService } from '../services/fee-reminder.service.js';

const QUEUE_NAME = 'finance-fee-reminders';

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

/** Daily fee reminder job — standard preset (4 weeks after term start, due soon, overdue). */
export async function startFeeReminderJob(): Promise<void> {
  if (worker) return;

  const connection = connectionOptions();
  queue = new Queue(QUEUE_NAME, { connection });

  await queue.add(
    'daily-fee-reminders',
    {},
    {
      repeat: { pattern: '0 7 * * *' },
      jobId: 'finance-fee-reminders-daily',
    },
  );

  worker = new Worker(
    QUEUE_NAME,
    async () => feeReminderService.runScheduledReminders(),
    { connection },
  );

  worker.on('failed', (_job, err) => {
    console.error('finance.fee_reminder.failed', { error: err.message });
  });
}

export async function stopFeeReminderJob(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
