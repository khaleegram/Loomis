import { Resend } from 'resend';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';

let client: Resend | null = null;

function getResendClient(): Resend {
  if (!client) {
    const env = getEnv();
    if (!env.RESEND_API_KEY) {
      throw new LoomisError(
        'COMMS_EMAIL_UNAVAILABLE',
        503,
        'Email delivery requires RESEND_API_KEY in environment configuration',
      );
    }
    client = new Resend(env.RESEND_API_KEY);
  }
  return client;
}

export function isEmailConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const env = getEnv();
  if (!env.RESEND_FROM_EMAIL || !env.RESEND_API_KEY) {
    throw new LoomisError(
      'COMMS_EMAIL_UNAVAILABLE',
      503,
      'Email delivery requires RESEND_API_KEY and RESEND_FROM_EMAIL in environment configuration',
    );
  }

  const { error } = await getResendClient().emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    text: input.body,
  });

  if (error) {
    throw new LoomisError('COMMS_DELIVERY_UNAVAILABLE', 502, 'Resend email delivery failed', {
      name: error.name,
    });
  }
}
