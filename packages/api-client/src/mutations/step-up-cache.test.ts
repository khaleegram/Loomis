import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  _resetStepUpCacheForTests,
  getCachedStepUpToken,
  setCachedStepUpToken,
} from './step-up-cache.js';

afterEach(() => {
  _resetStepUpCacheForTests();
  vi.useRealTimers();
});

describe('step-up cache', () => {
  it('returns a cached token before expiry', () => {
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    setCachedStepUpToken('refund_approve', 'mfa-token-1', expiresAt);
    expect(getCachedStepUpToken('refund_approve')).toBe('mfa-token-1');
  });

  it('expires cached tokens after the server window', () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    setCachedStepUpToken(
      'refund_approve',
      'mfa-token-2',
      new Date(now + 60_000).toISOString(),
    );

    vi.setSystemTime(now + 61_000);
    expect(getCachedStepUpToken('refund_approve')).toBeNull();
  });
});
