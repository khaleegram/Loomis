import { uuidv7 } from 'uuidv7';
import { registerEventHandler } from '../../../shared/events/registry.js';
import { dispatchEvent } from '../../../shared/events/registry.js';
import { WORKFLOW_EVENT_TYPES } from '../../workflow/events/types.js';
import { handleWorkflowCompleted } from './consumers/workflow-events.consumer.js';
import {
  TENANT_EVENT_TYPES,
  type TenantPsfRateChangedEvent,
  type TenantProvisionedEvent,
  type TenantReinstatedEvent,
  type TenantSuspendedEvent,
} from './types.js';

/**
 * Tenant event publishers.
 *
 * NOTE — durable outbox: the loomis-financial-integrity outbox pattern (state
 * change + `outbox_events` row in ONE transaction, drained by the BullMQ relay)
 * is the target. That relay + the `outbox_events` table are not built yet, so —
 * consistent with the Identity module — these publish through the in-process
 * event registry (`dispatchEvent`). When the outbox table/relay ship, swap these
 * calls for transactional outbox inserts. Do NOT add a second delivery path.
 */
/** Registers in-process consumers for cross-module workflow events. */
export function registerTenantEventConsumers(): void {
  registerEventHandler(WORKFLOW_EVENT_TYPES.completed, handleWorkflowCompleted);
}

export const tenantEvents = {
  async publishProvisioned(
    payload: Omit<TenantProvisionedEvent, 'eventId' | 'occurredAt'>,
  ): Promise<void> {
    const event: TenantProvisionedEvent = {
      eventId: uuidv7(),
      occurredAt: new Date().toISOString(),
      ...payload,
    };
    await dispatchEvent(TENANT_EVENT_TYPES.provisioned, event);
  },

  async publishSuspended(
    payload: Omit<TenantSuspendedEvent, 'eventId' | 'occurredAt'>,
  ): Promise<void> {
    const event: TenantSuspendedEvent = {
      eventId: uuidv7(),
      occurredAt: new Date().toISOString(),
      ...payload,
    };
    await dispatchEvent(TENANT_EVENT_TYPES.suspended, event);
  },

  async publishReinstated(
    payload: Omit<TenantReinstatedEvent, 'eventId' | 'occurredAt'>,
  ): Promise<void> {
    const event: TenantReinstatedEvent = {
      eventId: uuidv7(),
      occurredAt: new Date().toISOString(),
      ...payload,
    };
    await dispatchEvent(TENANT_EVENT_TYPES.reinstated, event);
  },

  async publishPsfRateChanged(
    payload: Omit<TenantPsfRateChangedEvent, 'eventId' | 'occurredAt'>,
  ): Promise<void> {
    const event: TenantPsfRateChangedEvent = {
      eventId: uuidv7(),
      occurredAt: new Date().toISOString(),
      ...payload,
    };
    await dispatchEvent(TENANT_EVENT_TYPES.psfRateChanged, event);
  },
};

export { TENANT_EVENT_TYPES } from './types.js';
export type {
  TenantPsfRateChangedEvent,
  TenantProvisionedEvent,
  TenantReinstatedEvent,
  TenantSuspendedEvent,
} from './types.js';
