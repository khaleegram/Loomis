import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  handleSessionInvalidated,
  isAuthBootstrapping,
  setAuthBootstrapping,
} from './auth-session-guard';

describe('auth-session-guard', () => {
  beforeEach(() => {
    setAuthBootstrapping(false);
  });

  it('suppresses redirect while bootstrapping', () => {
    setAuthBootstrapping(true);
    const redirect = vi.fn();
    handleSessionInvalidated(redirect);
    expect(redirect).not.toHaveBeenCalled();
    expect(isAuthBootstrapping()).toBe(true);
  });

  it('redirects after bootstrap completes', () => {
    vi.stubGlobal('window', { location: { pathname: '/school/dashboard' } });
    const redirect = vi.fn();
    handleSessionInvalidated(redirect);
    expect(redirect).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
