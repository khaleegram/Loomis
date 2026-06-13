import { LoomisClientError } from '@loomis/api-client';

import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { studentErrorMessage } from '@/lib/student/student-errors';

/**
 * Single entry point for user-facing API errors in the web app.
 * Never re-throw after calling this — show the returned string in the UI.
 */
export function appErrorMessage(err: unknown): string {
  if (!(err instanceof LoomisClientError)) {
    return err instanceof Error ? err.message : 'Something went wrong. Try again.';
  }

  const { code } = err;

  if (
    code.startsWith('ACADEMIC_') ||
    code.startsWith('IDENTITY_MFA') ||
    code === 'VALIDATION_ERROR' ||
    code === 'WORKFLOW_FORBIDDEN' ||
    code === 'WORKFLOW_STEP_NOT_ACTIVE'
  ) {
    return academicErrorMessage(err);
  }

  if (code.startsWith('STUDENT_')) {
    return studentErrorMessage(err);
  }

  if (code.startsWith('HRM_') || code.startsWith('STAFF_')) {
    return staffFacingMessage(err);
  }

  if (code.startsWith('FINANCE_') || code.startsWith('PAYMENT_')) {
    return financeFacingMessage(err);
  }

  if (err.status >= 400 && err.status < 500) {
    return 'We could not complete that action. Check the details and try again.';
  }

  return 'Something went wrong on our side. Try again in a moment.';
}

function staffFacingMessage(err: LoomisClientError): string {
  switch (err.code) {
    case 'FORBIDDEN':
      return 'You do not have permission to do that.';
    case 'VALIDATION_ERROR':
      return 'Please check the details you entered.';
    default:
      return err.status < 500
        ? 'We could not update staff records. Review the form and try again.'
        : 'Something went wrong. Try again.';
  }
}

function financeFacingMessage(err: LoomisClientError): string {
  switch (err.code) {
    case 'FORBIDDEN':
      return 'You do not have permission for this payment action.';
    case 'VALIDATION_ERROR':
      return 'Please check the payment details.';
    default:
      return err.status < 500
        ? 'We could not process that payment action. Review and try again.'
        : 'Something went wrong. Try again.';
  }
}

/** Run a mutation without letting errors escape to the Next.js error overlay. */
export async function runAppMutation<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, message: appErrorMessage(err) };
  }
}
