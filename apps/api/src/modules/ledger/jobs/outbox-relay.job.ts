import { Queue, Worker } from 'bullmq';
import { bullmqConnectionOptions } from '../../../shared/bullmq.js';
import { dispatchEvent } from '../../../shared/events/registry.js';
import { db } from '../../../shared/db.js';
import { ledgerOutboxRepository } from '../repository/index.js';

const QUEUE_NAME = 'ledger-outbox-relay';
const BATCH_SIZE = 50;

let queue: Queue | null = null;
let worker: Worker | null = null;

/**
 * Drains `ledger.outbox_events` and dispatches to in-process consumers
 * (System Design §8.3). Replaces ad-hoc dispatchEvent calls at producers.
 */
export async function startOutboxRelayJob(): Promise<void> {
  if (worker) return;

  const connection = bullmqConnectionOptions();
  queue = new Queue(QUEUE_NAME, { connection });

  await queue.add(
    'relay-tick',
    {},
    {
      repeat: { every: 1000 },
      jobId: 'ledger-outbox-relay-tick',
    },
  );

  worker = new Worker(
    QUEUE_NAME,
    async () => {
      const unpublished = await ledgerOutboxRepository.listUnpublished(BATCH_SIZE);
      for (const row of unpublished) {
        await dispatchEvent(row.eventType, {
          event_id: row.id,
          event_type: row.eventType,
          tenant_id: row.tenantId,
          aggregate_type: row.aggregateType,
          aggregate_id: row.aggregateId,
          payload: row.payload,
        });

        await db.transaction(async (tx) => {
          await ledgerOutboxRepository.markPublished(tx, row.id);
        });
      }
      return { relayed: unpublished.length };
    },
    { connection },
  );

  worker.on('failed', (_job, err) => {
    console.error('ledger.outbox_relay.failed', { error: err.message });
  });
}

export async function stopOutboxRelayJob(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
