import { registerEventHandler } from '../../../shared/events/registry.js';
import { ACADEMIC_EVENT_TYPES } from '../../academic/events/types.js';
import { FINANCE_EVENT_TYPES } from '../../finance/events/types.js';
import { STUDENT_EVENT_TYPES } from '../../student/events/types.js';
import { readModelProjectionService } from '../services/projection.service.js';

/** Registers read-model projection consumers (System Design §6.2). */
export function registerReadModelEventConsumers(): void {
  registerEventHandler(
    STUDENT_EVENT_TYPES.PARENT_LINK_VERIFIED,
    readModelProjectionService.handleParentLinkVerified,
  );
  registerEventHandler(
    STUDENT_EVENT_TYPES.ENROLLED,
    readModelProjectionService.handleStudentEnrolled,
  );
  registerEventHandler(
    FINANCE_EVENT_TYPES.paymentVerified,
    readModelProjectionService.handlePaymentVerified,
  );
  registerEventHandler(
    ACADEMIC_EVENT_TYPES.termCensusLocked,
    readModelProjectionService.handleTermCensusLocked,
  );
}
