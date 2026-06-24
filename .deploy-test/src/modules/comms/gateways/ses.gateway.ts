import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';

let client: SESClient | null = null;

function getSesClient(): SESClient {
  if (!client) {
    const env = getEnv();
    client = new SESClient({
      region: env.SES_REGION ?? env.S3_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

export function isSesConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.SES_REGION && env.SES_FROM_EMAIL);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const env = getEnv();
  if (!env.SES_FROM_EMAIL || !env.SES_REGION) {
    throw new LoomisError(
      'COMMS_EMAIL_UNAVAILABLE',
      503,
      'Email delivery requires SES_FROM_EMAIL and SES_REGION in environment configuration',
    );
  }

  await getSesClient().send(
    new SendEmailCommand({
      Source: env.SES_FROM_EMAIL,
      Destination: { ToAddresses: [input.to] },
      Message: {
        Subject: { Data: input.subject, Charset: 'UTF-8' },
        Body: { Text: { Data: input.body, Charset: 'UTF-8' } },
      },
    }),
  );
}
