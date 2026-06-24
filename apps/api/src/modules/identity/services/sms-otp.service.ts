import { createHash, randomInt } from 'node:crypto';
import type { StepUpAction } from '@loomis/contracts';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';
import { getRedis } from '../../../shared/redis.js';
import { sendSms } from '../../comms/gateways/termii.gateway.js';

export type SmsOtpPurpose =
  | 'login'
  | 'step_up'
  | 'password_reset'
  | 'parent_new_device';

const OTP_TTL_SECONDS = 5 * 60;
const OTP_MAX_ATTEMPTS = 5;

/** Dev-only bypass when Termii is not configured (Sprint 6 exit criteria). */
export const SMS_OTP_DEV_BYPASS_CODE = '000000';

function otpKey(userId: string, purpose: SmsOtpPurpose, action?: StepUpAction): string {
  const suffix = purpose === 'step_up' && action ? `:${action}` : '';
  return `identity:sms-otp:${purpose}:${userId}${suffix}`;
}

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

function isTermiiConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.TERMII_API_KEY && env.TERMII_SENDER_ID);
}

function devBypassAllowed(): boolean {
  const env = getEnv();
  return (
    env.SMS_OTP_DEMO_BYPASS ||
    (env.NODE_ENV === 'development' && !isTermiiConfigured())
  );
}

function maskPhone(phoneE164: string): string {
  if (phoneE164.length < 6) return '***';
  return `${phoneE164.slice(0, 4)}···${phoneE164.slice(-3)}`;
}

interface StoredSmsOtp {
  otpHash: string;
  attempts: number;
  phoneE164: string;
}

export const smsOtpService = {
  maskPhone,

  isDeliveryAvailable(): boolean {
    return isTermiiConfigured() || devBypassAllowed();
  },

  devBypassAllowed,

  async sendOtp(input: {
    userId: string;
    phoneE164: string;
    purpose: SmsOtpPurpose;
    action?: StepUpAction;
  }): Promise<{ maskedPhone: string; devBypass: boolean }> {
    if (!input.phoneE164) {
      throw new LoomisError(
        'IDENTITY_SMS_PHONE_REQUIRED',
        422,
        'A verified phone number is required for SMS verification',
      );
    }

    const bypass = devBypassAllowed();
    if (!isTermiiConfigured() && !bypass) {
      throw new LoomisError(
        'COMMS_SMS_UNAVAILABLE',
        503,
        'SMS delivery requires TERMII_API_KEY and TERMII_SENDER_ID in environment configuration',
      );
    }

    const otp = bypass ? SMS_OTP_DEV_BYPASS_CODE : String(randomInt(100_000, 999_999));
    const payload: StoredSmsOtp = {
      otpHash: hashOtp(otp),
      attempts: 0,
      phoneE164: input.phoneE164,
    };
    const key = otpKey(input.userId, input.purpose, input.action);
    await getRedis().setex(key, OTP_TTL_SECONDS, JSON.stringify(payload));

    if (!bypass) {
      const message =
        input.purpose === 'login'
          ? `Your Loomis sign-in code is ${otp}. Valid for 5 minutes.`
          : input.purpose === 'step_up'
            ? `Your Loomis verification code is ${otp}. Valid for 5 minutes.`
            : `Your Loomis code is ${otp}. Valid for 5 minutes.`;
      await sendSms({ to: input.phoneE164, message });
    }

    return { maskedPhone: maskPhone(input.phoneE164), devBypass: bypass };
  },

  async verifyOtp(input: {
    userId: string;
    purpose: SmsOtpPurpose;
    code: string;
    action?: StepUpAction;
  }): Promise<void> {
    const key = otpKey(input.userId, input.purpose, input.action);
    const redis = getRedis();
    const raw = await redis.get(key);
    if (!raw) {
      throw new LoomisError('IDENTITY_SMS_OTP_EXPIRED', 401, 'SMS code expired or not found');
    }

    const stored = JSON.parse(raw) as StoredSmsOtp;
    const valid =
      hashOtp(input.code) === stored.otpHash ||
      (devBypassAllowed() && input.code === SMS_OTP_DEV_BYPASS_CODE);

    if (!valid) {
      stored.attempts += 1;
      if (stored.attempts >= OTP_MAX_ATTEMPTS) {
        await redis.del(key);
      } else {
        await redis.setex(key, OTP_TTL_SECONDS, JSON.stringify(stored));
      }
      throw new LoomisError('IDENTITY_SMS_OTP_INVALID', 401, 'Invalid SMS code');
    }

    await redis.del(key);
  },
};
