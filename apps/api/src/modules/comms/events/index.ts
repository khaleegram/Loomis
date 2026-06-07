import { registerEventHandler } from '../../../shared/events/registry.js';
import { FINANCE_EVENT_TYPES } from '../../finance/events/types.js';
import { ACADEMIC_OPS_EVENT_TYPES } from '../../academic/events/ops-events.js';
import { RISK_EVENT_TYPES } from '@loomis/contracts';
import { automatedNotificationService } from '../services/automated-notification.service.js';

/** Registers Comms event consumers (System Design §3.2 Comms row). */
export function registerCommsEventConsumers(): void {
  registerEventHandler(FINANCE_EVENT_TYPES.paymentVerified, (event) =>
    automatedNotificationService.handlePaymentVerified(event as never),
  );
  registerEventHandler(RISK_EVENT_TYPES.breakGlassActivated, (event) =>
    automatedNotificationService.handleBreakGlassActivated(event as never),
  );
  registerEventHandler(ACADEMIC_OPS_EVENT_TYPES.assignmentPublished, (event) =>
    automatedNotificationService.handleAssignmentPublished(event as never),
  );
}
