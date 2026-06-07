import { describe, expect, it } from 'vitest';

import { parseSession, serializeSession } from './session';

describe('session cookie', () => {
  it('round-trips a valid session', () => {
    const raw = serializeSession({ role: 'principal', tenantId: 'tenant-1' });
    expect(parseSession(raw)).toEqual({ role: 'principal', tenantId: 'tenant-1' });
  });

  it('normalises a null tenant for platform roles', () => {
    const raw = serializeSession({ role: 'platform_owner', tenantId: null });
    expect(parseSession(raw)).toEqual({ role: 'platform_owner', tenantId: null });
  });

  it('rejects an empty or missing cookie', () => {
    expect(parseSession(undefined)).toBeNull();
    expect(parseSession(null)).toBeNull();
    expect(parseSession('')).toBeNull();
  });

  it('rejects malformed JSON', () => {
    expect(parseSession('not-json')).toBeNull();
  });

  it('rejects an unknown role (tampered cookie)', () => {
    expect(parseSession(JSON.stringify({ role: 'super_admin', tenantId: null }))).toBeNull();
  });
});
