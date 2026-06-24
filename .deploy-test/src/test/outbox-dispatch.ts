import { dispatchEvent } from '../shared/events/registry.js';
import { withTenantContext } from '../shared/tenant-context.js';
import { ledgerOutboxRepository } from '../modules/ledger/repository/outbox.repository.js';

/** Drains unpublished outbox rows through in-process consumers (test helper). */
export async function drainOutbox(limit = 100): Promise<number> {
  const unpublished = await ledgerOutboxRepository.listUnpublished(limit);
  for (const row of unpublished) {
    await dispatchEvent(row.eventType, {
      event_id: row.id,
      event_type: row.eventType,
      tenant_id: row.tenantId,
      aggregate_type: row.aggregateType,
      aggregate_id: row.aggregateId,
      payload: row.payload,
    });
    await withTenantContext(null, async (tx) => {
      await ledgerOutboxRepository.markPublished(tx, row.id);
    });
  }
  return unpublished.length;
}
