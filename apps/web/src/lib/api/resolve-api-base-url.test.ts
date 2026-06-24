import { afterEach, describe, expect, it, vi } from 'vitest';

import { RAILWAY_PRODUCTION_API, resolveApiBaseUrl } from './resolve-api-base-url';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveApiBaseUrl', () => {
  it('uses localhost in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(resolveApiBaseUrl(undefined)).toBe('http://localhost:18080/api/v1');
  });

  it('uses Railway fallback in production when custom domain DNS is not ready', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(resolveApiBaseUrl('https://api.loomis.digital/api/v1')).toBe(RAILWAY_PRODUCTION_API);
  });

  it('honours api.loomis.digital when custom domain is marked ready', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LOOMIS_API_CUSTOM_DOMAIN_READY', 'true');
    expect(resolveApiBaseUrl('https://api.loomis.digital/api/v1')).toBe(
      'https://api.loomis.digital/api/v1',
    );
  });

  it('strips a trailing slash', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(resolveApiBaseUrl('http://api.local/api/v1/')).toBe('http://api.local/api/v1');
  });
});
