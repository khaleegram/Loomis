import * as argon2 from 'argon2';
import { passwordComplexity, provisionedPassword } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export const passwordService = {
  async hash(plain: string): Promise<string> {
    this.assertComplexity(plain);
    return argon2.hash(plain, ARGON2_OPTIONS);
  },

  /** Hash admin-provisioned temporary passwords (min length only — no complexity). */
  async hashProvisioned(plain: string): Promise<string> {
    const result = provisionedPassword.safeParse(plain);
    if (!result.success) {
      throw new LoomisError(
        'VALIDATION_ERROR',
        400,
        'Provisioned password must be between 8 and 128 characters',
        { issues: result.error.flatten().fieldErrors },
      );
    }
    return argon2.hash(plain, ARGON2_OPTIONS);
  },

  async verify(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  },

  /** Login verify — trims input and accepts common temp-password copy variants. */
  async verifyLoginPassword(plain: string, hash: string): Promise<boolean> {
    const trimmed = plain.trim();
    if (await this.verify(trimmed, hash)) return true;
    if (/^[0-9a-fA-F]{8}$/.test(trimmed)) {
      return this.verify(trimmed.toUpperCase(), hash);
    }
    return false;
  },

  /** Hash without complexity check — used for OTPs and backup codes. */
  async hashSecret(secret: string): Promise<string> {
    return argon2.hash(secret, ARGON2_OPTIONS);
  },

  async verifySecret(secret: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, secret);
    } catch {
      return false;
    }
  },

  assertComplexity(plain: string): void {
    const result = passwordComplexity.safeParse(plain);
    if (!result.success) {
      throw new LoomisError(
        'VALIDATION_ERROR',
        400,
        'Password does not meet complexity requirements',
        { issues: result.error.flatten().fieldErrors },
      );
    }
  },
};
