import { describe, expect, it } from 'vitest';
import { LoomisClientError } from '../http/errors.js';
import { getIdempotencyReplayResult, isIdempotencyReplay } from './idempotency.js';

describe('idempotency replay helpers', () => {
  it('detects 409 replay payloads', () => {
    const error = new LoomisClientError(409, {
      code: 'FINANCE_PAYMENT_DUPLICATE',
      message: 'Already processed',
      requestId: 'req-1',
      details: { idempotencyReplay: true, originalResult: { paymentId: 'pay-1' } },
    });

    expect(isIdempotencyReplay(error)).toBe(true);
    expect(getIdempotencyReplayResult<{ paymentId: string }>(error)).toEqual({
      paymentId: 'pay-1',
    });
  });

  it('rejects non-replay 409 conflicts', () => {
    const error = new LoomisClientError(409, {
      code: 'FINANCE_PAYMENT_NOT_VERIFIABLE',
      message: 'Not verifiable',
      requestId: 'req-2',
    });

    expect(isIdempotencyReplay(error)).toBe(false);
  });
});
