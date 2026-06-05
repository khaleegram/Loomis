import { getRedis } from '../../../../shared/redis.js';
import type { WorkflowCompletedEvent } from '../../../workflow/events/types.js';
import { psfRateService } from '../../services/psf-rate.service.js';

const PROCESSED_EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

function processedEventKey(eventId: string): string {
  return `tenant:workflow:processed:${eventId}`;
}

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

/** Consumes `workflow.completed` for PSF rate override approval (FR-PLT-002). */
export async function handleWorkflowCompleted(payload: WorkflowCompletedEvent): Promise<void> {
  if (!(await claimEvent(payload.eventId))) return;
  if (payload.workflowType !== 'psf_rate_override' || payload.status !== 'approved') return;
  if (!payload.tenantId || !payload.approvedById) return;

  const rateMinor = payload.payload.rateMinor;
  const effectiveFrom = payload.payload.effectiveFrom;
  if (typeof rateMinor !== 'number' || typeof effectiveFrom !== 'string') return;

  await psfRateService.applyApprovedPsfRateOverride({
    tenantId: payload.tenantId,
    rateMinor,
    effectiveFrom: new Date(effectiveFrom),
    reason:
      typeof payload.payload.justification === 'string'
        ? payload.payload.justification
        : 'Approved PSF rate override',
    requestedById: payload.requestedById,
    approvedById: payload.approvedById,
    workflowInstanceId: payload.workflowInstanceId,
  });
}
