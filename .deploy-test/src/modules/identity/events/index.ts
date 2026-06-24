import { registerEventHandler } from '../../../shared/events/registry.js';
import {
  handleStaffDeactivated,
  handleStaffRoleChanged,
} from './consumers/staff-events.consumer.js';

/**
 * Wires Identity event consumers into the in-process event registry.
 *
 * NOTE — HRM module (Phase 1 Step 3) is the producer for `staff.role.changed` and
 * `staff.deactivated`. HRM does not exist yet, so nothing publishes these events
 * today. Handlers are registered here so the future outbox relay / BullMQ worker
 * can call `dispatchEvent(...)` once HRM ships. Do NOT add a fake HRM publisher.
 */
export function registerIdentityEventConsumers(): void {
  registerEventHandler('staff.role.changed', handleStaffRoleChanged);
  registerEventHandler('staff.deactivated', handleStaffDeactivated);
}

export type { StaffDeactivatedEvent, StaffRoleChangedEvent } from './types.js';
export { handleStaffDeactivated, handleStaffRoleChanged } from './consumers/staff-events.consumer.js';
