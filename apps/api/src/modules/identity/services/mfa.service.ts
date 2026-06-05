import { createCipheriv, createDecipheriv, randomBytes, randomInt } from 'node:crypto';
import speakeasy from 'speakeasy';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';
import { passwordService } from './password.service.js';

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const TOTP_WINDOW = 1;
const AES_ALGORITHM = 'aes-256-gcm';
const AES_IV_BYTES = 12;

function getEncryptionKey(): Buffer {
  const env = getEnv();
  const key = Buffer.from(env.TOTP_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) {
    throw new Error('TOTP_ENCRYPTION_KEY must decode to 32 bytes');
  }
  return key;
}

function formatBackupCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export const mfaService = {
  generateSecret(): { base32: string; ascii: string } {
    const secret = speakeasy.generateSecret({ length: 20 });
    if (!secret.base32 || !secret.ascii) {
      throw new Error('Failed to generate TOTP secret');
    }
    return { base32: secret.base32, ascii: secret.ascii };
  },

  buildProvisioningUri(secretBase32: string, email: string): string {
    const env = getEnv();
    return speakeasy.otpauthURL({
      secret: secretBase32,
      label: email,
      issuer: env.TOTP_ISSUER,
      encoding: 'base32',
    });
  },

  encryptSecret(plainSecret: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(AES_IV_BYTES);
    const cipher = createCipheriv(AES_ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  },

  decryptSecret(encryptedBlob: string): string {
    const key = getEncryptionKey();
    const [ivB64, tagB64, dataB64] = encryptedBlob.split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new LoomisError('IDENTITY_MFA_INVALID', 400, 'Invalid encrypted MFA secret');
    }
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  },

  verifyTotp(encryptedSecret: string, code: string): boolean {
    const secret = this.decryptSecret(encryptedSecret);
    return speakeasy.totp.verify({
      secret,
      encoding: 'ascii',
      token: code,
      window: TOTP_WINDOW,
    });
  },

  async generateBackupCodes(): Promise<{ plain: string[]; hashed: string[] }> {
    const plain: string[] = [];
    const hashed: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = formatBackupCode();
      plain.push(code);
      hashed.push(await passwordService.hashSecret(code.replace('-', '')));
    }
    return { plain, hashed };
  },

  async verifyBackupCode(
    code: string,
    backupCodesHash: string[],
    usedIndexes: number[],
  ): Promise<number | null> {
    const normalized = code.replace(/[\s-]/g, '').toUpperCase();
    for (let i = 0; i < backupCodesHash.length; i++) {
      if (usedIndexes.includes(i)) continue;
      const hash = backupCodesHash[i];
      if (!hash) continue;
      const valid = await passwordService.verifySecret(normalized, hash);
      if (valid) return i;
    }
    return null;
  },

  verifyCodeOrThrow(encryptedSecret: string, code: string): void {
    const valid = this.verifyTotp(encryptedSecret, code);
    if (!valid) {
      throw new LoomisError('IDENTITY_MFA_INVALID', 401, 'Invalid MFA code');
    }
  },
};
