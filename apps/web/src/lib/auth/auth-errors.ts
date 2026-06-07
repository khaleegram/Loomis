import { AuthError } from '@/lib/auth/auth-client';

/**
 * Maps an auth error to a user-facing message by switching on `error.code`
 * (loomis-frontend: never switch on HTTP status or message strings).
 */
export function authErrorMessage(err: unknown): string {
  const code = err instanceof AuthError ? err.code : 'AUTH_ERROR';
  switch (code) {
    case 'IDENTITY_INVALID_CREDENTIALS':
      return 'Incorrect email or password.';
    case 'IDENTITY_ACCOUNT_LOCKED':
      return 'Account locked after too many attempts. Check your email for details.';
    case 'IDENTITY_MFA_INVALID':
      return 'That code is incorrect or has expired. Try again.';
    case 'IDENTITY_MFA_NOT_ENROLLED':
      return 'Your enrollment session expired. Please sign in again.';
    case 'IDENTITY_SESSION_INVALIDATED':
      return 'Your session has ended. Please sign in again.';
    case 'VALIDATION_ERROR':
      return 'Please check the details you entered.';
    case 'UPSTREAM_UNAVAILABLE':
      return 'The authentication service is temporarily unavailable. Try again shortly.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
