import type { ChangeStaffRoleRequest, StaffPrimaryRole } from '@loomis/contracts';
import { getRedis } from '../../../../shared/redis.js';
import type { WorkflowCompletedEvent } from '../../../workflow/events/types.js';
import { staffService } from '../../services/staff.service.js';

const PROCESSED_EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

function processedEventKey(eventId: string): string {
  return `hrm:workflow:processed:${eventId}`;
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

function parseRoleChangePayload(payload: Record<string, unknown>): ChangeStaffRoleRequest | null {
  const primaryRole = payload.primaryRole;
  if (typeof primaryRole !== 'string') return null;

  return {
    primaryRole: primaryRole as StaffPrimaryRole,
    replacementStaffProfileId:
      typeof payload.replacementStaffProfileId === 'string'
        ? payload.replacementStaffProfileId
        : undefined,
    singletonOverrideConfirmed: payload.singletonOverrideConfirmed === true,
  };
}

/** Applies Owner-approved staff role changes from workflow completion (US-HRM-004). */
export async function handleWorkflowCompleted(payload: WorkflowCompletedEvent): Promise<void> {
  if (payload.workflowType !== 'staff_role_change') return;
  if (!(await claimEvent(payload.eventId))) return;
  if (payload.status !== 'approved') return;
  if (!payload.tenantId || !payload.approvedById) return;

  const staffProfileId = payload.subjectId ?? payload.payload.staffProfileId;
  if (typeof staffProfileId !== 'string') return;

  const changeInput = parseRoleChangePayload(payload.payload);
  if (!changeInput) return;

  await staffService.applyApprovedStaffRoleChange(
    payload.tenantId,
    staffProfileId,
    changeInput,
    payload.approvedById,
  );
}
