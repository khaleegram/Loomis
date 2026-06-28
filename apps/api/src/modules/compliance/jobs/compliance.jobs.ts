import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { getEnv } from '../../../config/env.js';
import { defaultQueueJobOptions } from '../../../shared/bullmq.js';
import { breachService } from '../services/breach.service.js';
import { dsarService } from '../services/dsar.service.js';
import { retentionService } from '../services/retention.service.js';

const DSAR_QUEUE = 'compliance-dsar-escalation';
const BREACH_QUEUE = 'compliance-breach-escalation';
const RETENTION_QUEUE = 'compliance-retention';

let dsarQueue: Queue | null = null;
let breachQueue: Queue | null = null;
let retentionQueue: Queue | null = null;
let dsarWorker: Worker | null = null;
let breachWorker: Worker | null = null;
let retentionWorker: Worker | null = null;

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
 * Compliance background jobs (System Design §19.2–19.4).
 * - DSAR escalation alerts at day 21 and 28
 * - Breach DPO inaction escalation at 48h
 * - Nightly retention processor (anonymise + 90-day hard delete)
 */
export async function startComplianceJobs(): Promise<void> {
  if (retentionWorker) return;

  const connection = connectionOptions();

  dsarQueue = new Queue(DSAR_QUEUE, { connection, defaultJobOptions: defaultQueueJobOptions });
  await dsarQueue.add(
    'daily-dsar-escalation',
    {},
    { repeat: { pattern: '0 8 * * *' }, jobId: 'compliance-dsar-escalation-daily' },
  );

  breachQueue = new Queue(BREACH_QUEUE, { connection, defaultJobOptions: defaultQueueJobOptions });
  await breachQueue.add(
    'hourly-breach-escalation',
    {},
    { repeat: { pattern: '0 * * * *' }, jobId: 'compliance-breach-escalation-hourly' },
  );

  retentionQueue = new Queue(RETENTION_QUEUE, { connection, defaultJobOptions: defaultQueueJobOptions });
  await retentionQueue.add(
    'nightly-retention',
    {},
    { repeat: { pattern: '0 3 * * *' }, jobId: 'compliance-retention-nightly' },
  );

  dsarWorker = new Worker(DSAR_QUEUE, async () => dsarService.processEscalations(), { connection });
  breachWorker = new Worker(BREACH_QUEUE, async () => breachService.processEscalations(), {
    connection,
  });
  retentionWorker = new Worker(
    RETENTION_QUEUE,
    async () => retentionService.runNightlyProcessor(),
    { connection },
  );

  const onFailed = (name: string) => (_job: unknown, err: Error) => {
    console.error(`${name}.job_failed`, { error: err.message });
  };

  dsarWorker.on('failed', onFailed('compliance.dsar_escalation'));
  breachWorker.on('failed', onFailed('compliance.breach_escalation'));
  retentionWorker.on('failed', onFailed('compliance.retention'));
}

export async function stopComplianceJobs(): Promise<void> {
  await dsarWorker?.close();
  await breachWorker?.close();
  await retentionWorker?.close();
  await dsarQueue?.close();
  await breachQueue?.close();
  await retentionQueue?.close();
  dsarWorker = null;
  breachWorker = null;
  retentionWorker = null;
  dsarQueue = null;
  breachQueue = null;
  retentionQueue = null;
}
