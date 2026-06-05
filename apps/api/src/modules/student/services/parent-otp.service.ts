import { createHash, randomInt } from 'node:crypto';

/**
 * Parent link OTP delivery (FR-SIS-003 / US-SIS-004..005).
 *
 * BLOCKED: SES (email) and Termii (SMS) are not configured in this environment.
 * OTP generation and hashing work locally, but `sendParentLinkOtp` does not
 * dispatch messages. Configure AWS SES credentials and TERMII_API_KEY in
 * `.env.local` before enabling parent link invitations in production.
 */
export const parentOtpService = {
  generateOtp(): string {
    return String(randomInt(100000, 999999));
  },

  hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  },

  verifyOtp(otp: string, hash: string | null): boolean {
    if (!hash) return false;
    return this.hashOtp(otp) === hash;
  },

  // BLOCKED: requires AWS SES (email) and/or Termii (SMS) — not configured.
  async sendParentLinkOtp(_input: {
    email: string;
    phone: string;
    otp: string;
    linkId: string;
  }): Promise<{ sent: false; reason: 'SES_TERMII_NOT_CONFIGURED' }> {
    return { sent: false, reason: 'SES_TERMII_NOT_CONFIGURED' };
  },
};
