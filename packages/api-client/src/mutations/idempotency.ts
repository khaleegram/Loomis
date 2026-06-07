import { LoomisClientError } from '../http/errors.js';

/** Server marks idempotency replays with this details shape (Frontend Architecture §6). */
export interface IdempotencyReplayDetails {
  idempotencyReplay: true;
  originalResult: unknown;
}

export function isIdempotencyReplay(error: unknown): error is LoomisClientError & {
  details: IdempotencyReplayDetails;
} {
  if (!(error instanceof LoomisClientError) || error.status !== 409) {
    return false;
  }
  const details = error.details;
  return (
    details?.['idempotencyReplay'] === true &&
    details['originalResult'] !== undefined
  );
}

export function getIdempotencyReplayResult<T>(error: LoomisClientError): T {
  return error.details?.['originalResult'] as T;
}
