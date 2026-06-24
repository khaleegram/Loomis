import { createHash, randomInt } from 'node:crypto';
import { getEnv } from '../../../config/env.js';
import { isEmailConfigured, sendEmail } from '../../comms/gateways/resend.gateway.js';
import { isTermiiConfigured, sendSms } from '../../comms/gateways/termii.gateway.js';

/** Dev-only bypass when neither Resend nor Termii is configured. */
export const PARENT_OTP_DEV_BYPASS_CODE = '000000';

function devBypassAllowed(): boolean {
  const env = getEnv();
  return env.NODE_ENV === 'development' && !isEmailConfigured() && !isTermiiConfigured();
}

export type ParentOtpDeliveryResult =
  | { sent: true }
  | { sent: false; reason: 'EMAIL_TERMII_NOT_CONFIGURED' | 'SEND_FAILED' };

export const parentOtpService = {
  generateOtp(): string {
    return devBypassAllowed()
      ? PARENT_OTP_DEV_BYPASS_CODE
      : String(randomInt(100_000, 999_999));
  },

  hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  },

  verifyOtp(otp: string, hash: string | null): boolean {
    if (!hash) return false;
    if (devBypassAllowed() && otp === PARENT_OTP_DEV_BYPASS_CODE) return true;
    return this.hashOtp(otp) === hash;
  },

  async sendParentLinkOtp(input: {
    email: string;
    phone: string;
    otp: string;
    linkId: string;
  }): Promise<ParentOtpDeliveryResult> {
    if (devBypassAllowed()) {
      return { sent: true };
    }

    let emailSent = false;
    let smsSent = false;

    if (isEmailConfigured()) {
      try {
        await sendEmail({
          to: input.email.toLowerCase(),
          subject: 'Your Loomis parent link verification code',
          body: [
            'Hello,',
            '',
            'Your school invited you to link your parent account on Loomis.',
            '',
            `Your verification code is: ${input.otp}`,
            '',
            'This code expires in 15 minutes.',
            '',
            'If you did not expect this message, contact the school.',
          ].join('\n'),
        });
        emailSent = true;
      } catch {
        // try SMS fallback
      }
    }

    if (isTermiiConfigured()) {
      try {
        await sendSms({
          to: input.phone,
          message: `Your Loomis parent verification code is ${input.otp}. Valid for 15 minutes.`,
        });
        smsSent = true;
      } catch {
        // continue
      }
    }

    if (emailSent || smsSent) {
      return { sent: true };
    }

    if (!isEmailConfigured() && !isTermiiConfigured()) {
      return { sent: false, reason: 'EMAIL_TERMII_NOT_CONFIGURED' };
    }

    return { sent: false, reason: 'SEND_FAILED' };
  },
};
