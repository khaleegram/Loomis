import { uuidv7 } from 'uuidv7';
import { dispatchEvent } from '../../../shared/events/registry.js';
import {
  HRM_EVENT_TYPES,
  type StaffDeactivatedEvent,
  type StaffRoleChangedEvent,
} from './types.js';

/**
 * HRM event publishers. Uses the in-process registry until the shared durable
 * outbox table/relay exists, matching Identity/Tenant's current integration path.
 */
export const hrmEvents = {
  async publishStaffRoleChanged(
    payload: Omit<StaffRoleChangedEvent, 'eventId'>,
  ): Promise<void> {
    await dispatchEvent(HRM_EVENT_TYPES.staffRoleChanged, {
      eventId: uuidv7(),
      ...payload,
    });
  },

  async publishStaffDeactivated(
    payload: Omit<StaffDeactivatedEvent, 'eventId'>,
  ): Promise<void> {
    await dispatchEvent(HRM_EVENT_TYPES.staffDeactivated, {
      eventId: uuidv7(),
      ...payload,
    });
  },
};

export { HRM_EVENT_TYPES } from './types.js';
export type { StaffDeactivatedEvent, StaffRoleChangedEvent } from './types.js';
