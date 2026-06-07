import type { FeeItemCategory } from '@loomis/contracts';
import { getRedis } from '../../../../shared/redis.js';
import type { WorkflowCompletedEvent } from '../../../workflow/events/types.js';
import { feeStructureService } from '../../services/fee-structure.service.js';
import { refundService } from '../../services/refund.service.js';

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
 * Consumes `workflow.completed` for Finance-owned workflow types:
 * - `fee_structure_change` — applies approved amendment (US-FIN-001)
 * - `refund_request` — executes approved refund (US-FIN-006)
 * - `psf_reversal_on_refund` — applies platform PSF reversal (FR-FIN-007)
 */
export async function handleWorkflowCompleted(payload: WorkflowCompletedEvent): Promise<void> {
  if (!(await claimEvent(payload.eventId))) return;

  if (payload.workflowType === 'fee_structure_change') {
    await handleFeeStructureChange(payload);
    return;
  }

  if (payload.workflowType === 'refund_request') {
    await handleRefundRequest(payload);
    return;
  }

  if (payload.workflowType === 'psf_reversal_on_refund') {
    await handlePsfReversal(payload);
  }
}

async function handleFeeStructureChange(payload: WorkflowCompletedEvent): Promise<void> {
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

async function handleRefundRequest(payload: WorkflowCompletedEvent): Promise<void> {
  if (!payload.tenantId) return;

  const refundId = payload.payload.refundId;
  if (typeof refundId !== 'string') return;

  if (payload.status === 'approved' && payload.approvedById) {
    await refundService.applyApprovedRefund({
      tenantId: payload.tenantId,
      refundId,
      requestedById: payload.requestedById,
      approvedById: payload.approvedById,
      workflowInstanceId: payload.workflowInstanceId,
      eventId: payload.eventId,
    });
    return;
  }

  if (payload.status === 'rejected' || payload.status === 'returned') {
    await refundService.markRefundRejected({
      tenantId: payload.tenantId,
      refundId,
      eventId: payload.eventId,
    });
  }
}

async function handlePsfReversal(payload: WorkflowCompletedEvent): Promise<void> {
  if (payload.status !== 'approved') return;
  if (!payload.tenantId || !payload.approvedById) return;

  const refundId = payload.payload.refundId;
  if (typeof refundId !== 'string') return;

  await refundService.applyApprovedPsfReversal({
    tenantId: payload.tenantId,
    refundId,
    requestedById: payload.requestedById,
    approvedById: payload.approvedById,
    workflowInstanceId: payload.workflowInstanceId,
    eventId: payload.eventId,
  });
}
