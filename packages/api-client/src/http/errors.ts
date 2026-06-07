import type { ApiError, LoomisErrorCode } from '@loomis/contracts';

/**
 * Typed client-side error. Components/hooks switch on `code`,
 * never on HTTP status or message strings (Frontend Architecture §11.1).
 */
export class LoomisClientError extends Error {
  readonly code: LoomisErrorCode;
  readonly status: number;
  readonly requestId: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'LoomisClientError';
    this.code = error.code;
    this.status = status;
    this.requestId = error.requestId;
    if (error.details !== undefined) {
      this.details = error.details;
    }
  }

  /** Token aged out — eligible for single-flight refresh + retry. */
  get isTokenExpired(): boolean {
    return this.code === 'IDENTITY_TOKEN_EXPIRED';
  }

  /** Session killed server-side (user_ver bump / blacklist) — hard logout, never refresh. */
  get isSessionInvalidated(): boolean {
    return this.code === 'IDENTITY_SESSION_INVALIDATED';
  }
}
