import { LoomisClientError } from '@loomis/api-client';

/** Maps student module errors to user-facing copy (switch on `code`). */
export function studentErrorMessage(err: unknown): string {
  const code = err instanceof LoomisClientError ? err.code : 'UNKNOWN';
  switch (code) {
    case 'STUDENT_ADMISSION_NOT_FOUND':
      return 'This admission application could not be found.';
    case 'STUDENT_ADMISSION_NOT_PENDING':
      return 'This application has already been decided.';
    case 'STUDENT_ADMISSION_NUMBER_CONFLICT':
      return 'That admission number is already assigned to another student.';
    case 'STUDENT_NOT_FOUND':
      return 'Student record not found.';
    case 'STUDENT_NOT_ADMITTED':
      return 'Only admitted students can be enrolled.';
    case 'STUDENT_ALREADY_ENROLLED':
      return 'This student is already enrolled for the selected term.';
    case 'STUDENT_IDENTITY_ATTESTATION_REQUIRED':
    case 'STUDENT_CENSUS_ATTESTATION_MISSING':
      return 'Identity attestation must be recorded before billable enrollment.';
    case 'STUDENT_PARENT_LINK_ALREADY_ACTIVE':
      return 'An active parent link already exists for this relationship.';
    case 'STUDENT_PARENT_LINK_EXPIRED':
      return 'The parent link invitation has expired. Initiate a new link.';
    case 'STUDENT_TRANSFER_BLOCKED':
      return 'Transfer cannot proceed while enrollment blockers remain.';
    case 'STUDENT_TERM_NOT_OPEN':
    case 'ACADEMIC_TERM_NOT_OPEN':
      return 'No open term is available for enrollment. Open a term in Academic Sessions first.';
    case 'STUDENT_CLASS_ARM_INVALID':
    case 'ACADEMIC_CLASS_ARM_NOT_FOUND':
      return 'The selected class arm could not be found.';
    case 'VALIDATION_ERROR':
      return 'Please check the details you entered.';
    default:
      return err instanceof Error ? err.message : 'Something went wrong. Try again.';
  }
}
