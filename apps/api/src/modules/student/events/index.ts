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
