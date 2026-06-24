import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';

const TERMII_BASE = 'https://api.ng.termii.com/api';

export function isTermiiConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.TERMII_API_KEY && env.TERMII_SENDER_ID);
}

export async function sendSms(input: { to: string; message: string }): Promise<void> {
  const env = getEnv();
  if (!env.TERMII_API_KEY || !env.TERMII_SENDER_ID) {
    throw new LoomisError(
      'COMMS_SMS_UNAVAILABLE',
      503,
      'SMS delivery requires TERMII_API_KEY and TERMII_SENDER_ID in environment configuration',
    );
  }

  const response = await fetch(`${TERMII_BASE}/sms/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: env.TERMII_API_KEY,
      to: input.to,
      from: env.TERMII_SENDER_ID,
      sms: input.message,
      type: 'plain',
      channel: 'generic',
    }),
  });

  if (!response.ok) {
    throw new LoomisError('COMMS_DELIVERY_UNAVAILABLE', 502, 'Termii SMS delivery failed', {
      status: response.status,
    });
  }
}
