import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getEnv } from '../../../config/env.js';

/** 96 bits of entropy per FR-REF-003. */
export function generateRawReferralCode(): string {
  return randomBytes(12).toString('base64url');
}

export function hashReferralCode(rawCode: string): string {
  const env = getEnv();
  return createHmac('sha256', env.REFERRAL_CODE_HMAC_SECRET).update(rawCode).digest('hex');
}

export function verifyReferralCodeHash(rawCode: string, expectedHash: string): boolean {
  const computed = hashReferralCode(rawCode);
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Compute referral earning amount from settled PSF (integer math, kobo). */
export function computeEarningAmountMinor(psfSettledMinor: number, rateBasisPoints: number): number {
  return Math.floor((psfSettledMinor * rateBasisPoints) / 10_000);
}
