import { LoomisClientError } from '@loomis/api-client';

/** Maps academic module errors to user-facing copy (switch on `code`). */
export function academicErrorMessage(err: unknown): string {
  const code = err instanceof LoomisClientError ? err.code : 'UNKNOWN';
  switch (code) {
    case 'ACADEMIC_YEAR_OVERLAP':
      return 'These dates overlap an existing academic year. Adjust the range.';
    case 'ACADEMIC_YEAR_ALREADY_ACTIVE':
      return 'Another academic year is already active. Close it before activating this one.';
    case 'ACADEMIC_YEAR_ACTIVATION_BLOCKED':
      return 'A previous year still has unclosed terms. Close them first.';
    case 'ACADEMIC_YEAR_NOT_DRAFT':
      return 'This academic year can no longer be activated.';
    case 'ACADEMIC_TERM_NOT_DRAFT':
      return 'This term is no longer in draft and cannot be reconfigured.';
    case 'ACADEMIC_TERM_ALREADY_OPEN':
      return 'Another term in this year is already open.';
    case 'ACADEMIC_TERM_PREVIOUS_NOT_CLOSED':
      return 'Close the previous term before opening this one.';
    case 'ACADEMIC_TERM_INVALID_CONFIG':
      return 'Configure all required term dates before opening.';
    case 'ACADEMIC_TERM_CLOSURE_BLOCKED':
      return closureBlockedMessage(err);
    case 'ACADEMIC_CENSUS_NOT_READY':
      return 'The term must be open before you can lock the census.';
    case 'ACADEMIC_CENSUS_ALREADY_LOCKED':
      return 'The census for this term is already locked and cannot be changed.';
    case 'ACADEMIC_CENSUS_VARIANCE_REASON_REQUIRED':
      return 'Your declared count differs from the system count. Document a reason.';
    case 'ACADEMIC_CENSUS_PSF_RATE_MISSING':
      return 'No PSF rate is configured. Contact platform support before locking.';
    case 'IDENTITY_MFA_INVALID':
      return 'That verification code is incorrect or expired. Try again.';
    case 'IDENTITY_MFA_NOT_ENROLLED':
      return 'MFA must be enrolled before this action. Check Settings → Security.';
    case 'VALIDATION_ERROR':
      return 'Please check the details you entered.';
    case 'ACADEMIC_GRADING_SCHEME_CONFLICT':
      return 'A grading scheme with this name already exists.';
    case 'ACADEMIC_GRADEBOOK_FORBIDDEN':
      return 'You do not have permission to access this gradebook.';
    case 'ACADEMIC_EXAM_CONFIG_NOT_FOUND':
      return 'No exam configuration found for this class and subject.';
    case 'ACADEMIC_EXAM_CONFIG_CONFLICT':
      return 'An exam configuration already exists for this class and subject.';
    case 'ACADEMIC_GRADE_CORRECTION_PENDING':
      return 'A grade correction is already pending for this entry.';
    case 'ACADEMIC_RESULTS_EMPTY':
      return 'No gradebook entries found. Complete grade entry before publishing.';
    case 'ACADEMIC_RESULTS_CORRECTION_PENDING':
      return 'Resolve pending grade corrections before publishing results.';
    case 'ACADEMIC_ATTENDANCE_DATE_INVALID':
      return 'Attendance can only be marked online for today.';
    case 'ACADEMIC_ATTENDANCE_FORBIDDEN_ROLE':
    case 'ACADEMIC_ATTENDANCE_NOT_ASSIGNED':
      return 'You are not the active class teacher for this class.';
    case 'WORKFLOW_FORBIDDEN':
      return 'You cannot action this workflow step.';
    case 'WORKFLOW_STEP_NOT_ACTIVE':
      return 'This workflow step is no longer active.';
    default:
      return err instanceof Error ? err.message : 'Something went wrong. Try again.';
  }
}

function closureBlockedMessage(err: unknown): string {
  if (!(err instanceof LoomisClientError) || !err.details) {
    return 'Term closure is blocked. Resolve the listed conditions first.';
  }
  const financial = err.details.financialBlockers;
  const operational = err.details.operationalBlockers;
  if (Array.isArray(financial) && financial.length > 0) {
    return 'Financial blockers must be resolved before closure. Platform approval may be required.';
  }
  if (Array.isArray(operational) && operational.length > 0) {
    return 'Operational blockers remain. Provide an override reason or resolve them first.';
  }
  return 'Term closure is blocked. Resolve the listed conditions first.';
}
