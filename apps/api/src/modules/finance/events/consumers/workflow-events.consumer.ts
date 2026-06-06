import type { FeeItemCategory } from '@loomis/contracts';
import { getRedis } from '../../../../shared/redis.js';
import type { WorkflowCompletedEvent } from '../../../workflow/events/types.js';
import { feeStructureService } from '../../services/fee-structure.service.js';

const PROCESSED_EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

function processedEventKey(eventId: string): string {
  return `finance:workflow:processed:${eventId}`;
}

/** Idempotent claim so a redelivered event is applied at most once (CON-012). */
async function claimEvent(eventId: string): Promise<boolean> {
  const result = await getRedis().set(
    processedEventKey(eventId),
    '1',
    'EX',
    PROCESSED_EVENT_TTL_SECONDS,
    'NX',
  );
  return result === 'OK';
}

interface AmendmentPayloadItem {
  name: string;
  category: string;
  amountMinor: number;
}

/**
 * Consumes `workflow.completed` and applies an approved fee-structure amendment
 * (US-FIN-001). The amendment is NOT applied at request time — only here, after
 * the Principal approves. Rejected/returned amendments are silently discarded.
 */
export async function handleWorkflowCompleted(payload: WorkflowCompletedEvent): Promise<void> {
  if (payload.workflowType !== 'fee_structure_change') return;
  if (!(await claimEvent(payload.eventId))) return;
  if (payload.status !== 'approved') return;
  if (!payload.tenantId || !payload.approvedById) return;

  const feeStructureId = payload.payload.feeStructureId;
  const rawItems = payload.payload.items;
  if (typeof feeStructureId !== 'string' || !Array.isArray(rawItems)) return;

  const items = rawItems as AmendmentPayloadItem[];

  await feeStructureService.applyApprovedAmendment({
    tenantId: payload.tenantId,
    feeStructureId,
    items: items.map((item) => ({
      name: item.name,
      category: item.category as FeeItemCategory,
      amountMinor: item.amountMinor,
    })),
    requestedById: payload.requestedById,
    approvedById: payload.approvedById,
    workflowInstanceId: payload.workflowInstanceId,
    eventId: payload.eventId,
  });
}
