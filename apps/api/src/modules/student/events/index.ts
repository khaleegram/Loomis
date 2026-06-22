import { registerEventHandler } from '../../../shared/events/registry.js';
import { WORKFLOW_EVENT_TYPES } from '../../workflow/events/types.js';
import { handleStudentWorkflowCompleted } from './consumers/workflow-events.consumer.js';
import { STUDENT_EVENT_TYPES } from './types.js';

export { STUDENT_EVENT_TYPES };
export type {
  ParentLinkInitiatedPayload,
  ParentLinkVerifiedPayload,
  StudentAdmittedPayload,
  StudentEnrolledPayload,
  StudentTransferredOutPayload,
} from './types.js';

/** Namespace for student module lifecycle events (outbox relay consumers). */
export const studentEvents = {
  types: STUDENT_EVENT_TYPES,
};

export function registerStudentEventConsumers(): void {
  registerEventHandler(WORKFLOW_EVENT_TYPES.completed, handleStudentWorkflowCompleted);
}
