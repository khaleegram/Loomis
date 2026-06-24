import admin from 'firebase-admin';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';

let initialized = false;

function ensureFcm(): admin.app.App {
  const env = getEnv();
  if (!env.FCM_SERVICE_ACCOUNT_JSON) {
    throw new LoomisError(
      'COMMS_PUSH_UNAVAILABLE',
      503,
      'Android push requires FCM_SERVICE_ACCOUNT_JSON in environment configuration',
    );
  }

  if (!initialized) {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON) as admin.ServiceAccount,
      ),
    });
    initialized = true;
  }

  return admin.app();
}

export function isFcmConfigured(): boolean {
  return Boolean(getEnv().FCM_SERVICE_ACCOUNT_JSON);
}

export async function sendFcmPush(input: {
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
}): Promise<void> {
  await ensureFcm().messaging().send({
    token: input.token,
    notification: { title: input.title, body: input.body },
    data: input.data,
  });
}

export function isFcmTokenInvalidError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return (
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token'
  );
}
