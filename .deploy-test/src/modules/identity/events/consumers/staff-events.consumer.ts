import { getRedis } from '../../../../shared/redis.js';
import { securityInvalidationService } from '../../services/security-invalidation.service.js';
import type { StaffDeactivatedEvent, StaffRoleChangedEvent } from '../types.js';

const PROCESSED_EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

function processedEventKey(eventId: string): string {
  return `identity:processed:${eventId}`;
}

/**
 * Idempotent discard — SET NX so a redelivered event is silently skipped
 * (loomis-financial-integrity processedEvents pattern; Redis until DB table ships).
 */
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

/** Consumes `staff.role.changed` → bump user_ver + revoke all sessions (SEC-AUTH-013). */
export async function handleStaffRoleChanged(payload: StaffRoleChangedEvent): Promise<void> {
  if (!(await claimEvent(payload.eventId))) return;
  await securityInvalidationService.invalidateOnRoleChange(payload.userId);
}

/** Consumes `staff.deactivated` → deactivate account + bump user_ver + revoke sessions. */
export async function handleStaffDeactivated(payload: StaffDeactivatedEvent): Promise<void> {
  if (!(await claimEvent(payload.eventId))) return;
  await securityInvalidationService.invalidateOnDeactivation(payload.userId);
}
