import { ApnsClient, Notification, PushType } from 'apns2';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';

let client: ApnsClient | null = null;

function getApnsClient(): ApnsClient {
  const env = getEnv();
  if (!env.APNS_KEY_ID || !env.APNS_TEAM_ID || !env.APNS_BUNDLE_ID || !env.APNS_PRIVATE_KEY) {
    throw new LoomisError(
      'COMMS_PUSH_UNAVAILABLE',
      503,
      'iOS push requires APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, and APNS_PRIVATE_KEY',
    );
  }

  if (!client) {
    client = new ApnsClient({
      team: env.APNS_TEAM_ID,
      keyId: env.APNS_KEY_ID,
      signingKey: env.APNS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      defaultTopic: env.APNS_BUNDLE_ID,
    });
  }
  return client;
}

export function isApnsConfigured(): boolean {
  const env = getEnv();
  return Boolean(
    env.APNS_KEY_ID && env.APNS_TEAM_ID && env.APNS_BUNDLE_ID && env.APNS_PRIVATE_KEY,
  );
}

export async function sendApnsPush(input: {
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
}): Promise<void> {
  const env = getEnv();
  const notification = new Notification(input.token, {
    alert: { title: input.title, body: input.body },
    data: input.data,
    type: PushType.alert,
    topic: env.APNS_BUNDLE_ID!,
  });

  await getApnsClient().send(notification);
}

export function isApnsTokenInvalidError(err: unknown): boolean {
  const reason = (err as { reason?: string })?.reason;
  return reason === 'BadDeviceToken' || reason === 'Unregistered';
}
