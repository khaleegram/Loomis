import { getRedis } from '../../../../shared/redis.js';
import type { WorkflowCompletedEvent } from '../../../workflow/events/types.js';
import { studentService } from '../../services/student.service.js';

function processedEventKey(eventId: string): string {
  return `student:workflow:processed:${eventId}`;
}

async function claimEvent(eventId: string): Promise<boolean> {
  const result = await getRedis().set(processedEventKey(eventId), '1', 'EX', 7 * 24 * 60 * 60, 'NX');
  return result === 'OK';
}

/** Applies approved student transfer workflows (US-SIS-006 / Sprint 9). */
export async function handleStudentWorkflowCompleted(payload: WorkflowCompletedEvent): Promise<void> {
  if (payload.workflowType !== 'student_transfer_out') return;
  if (payload.status !== 'approved') return;
  if (!payload.tenantId || !payload.approvedById) return;
  if (!(await claimEvent(payload.eventId))) return;

  await studentService.applyApprovedTransferOut(
    payload.tenantId,
    payload.payload,
    payload.approvedById,
  );
}
