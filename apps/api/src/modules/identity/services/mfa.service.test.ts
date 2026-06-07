import { beforeEach, describe, expect, it, vi } from 'vitest';
import speakeasy from 'speakeasy';

vi.mock('../../../config/env.js', () => ({
  getEnv: () => ({
    TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    TOTP_ISSUER: 'Loomis Test',
  }),
}));

vi.mock('./password.service.js', () => ({
  passwordService: {
    hashSecret: vi.fn(async (s: string) => `hash:${s}`),
    verifySecret: vi.fn(),
  },
}));

const { mfaService } = await import('./mfa.service.js');

describe('mfaService.verifyTotp', () => {
  const DEV_TOTP_BASE32 = 'JBSWY3DPEHPK3PXP';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies codes for a fixed base32 dev secret', () => {
    const encrypted = mfaService.encryptSecret(DEV_TOTP_BASE32);
    const code = speakeasy.totp({ secret: DEV_TOTP_BASE32, encoding: 'base32' });

    expect(mfaService.verifyTotp(encrypted, code)).toBe(true);
    expect(mfaService.verifyTotp(encrypted, '000000')).toBe(false);
  });

  it('verifies codes for a generated ascii enrollment secret', () => {
    const secret = mfaService.generateSecret();
    const encrypted = mfaService.encryptSecret(secret.ascii);
    const code = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });

    expect(mfaService.verifyTotp(encrypted, code)).toBe(true);
  });
});
