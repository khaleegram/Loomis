import webpush from 'web-push';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';

let configured = false;

function ensureWebPush(): void {
  const env = getEnv();
  if (!env.WEB_PUSH_VAPID_PUBLIC_KEY || !env.WEB_PUSH_VAPID_PRIVATE_KEY) {
    throw new LoomisError(
      'COMMS_PUSH_UNAVAILABLE',
      503,
      'Web push requires WEB_PUSH_VAPID_PUBLIC_KEY and WEB_PUSH_VAPID_PRIVATE_KEY',
    );
  }

  if (!configured) {
    webpush.setVapidDetails(
      env.WEB_PUSH_VAPID_SUBJECT ?? 'mailto:support@loomis.app',
      env.WEB_PUSH_VAPID_PUBLIC_KEY,
      env.WEB_PUSH_VAPID_PRIVATE_KEY,
    );
    configured = true;
  }
}

export function isWebPushConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.WEB_PUSH_VAPID_PUBLIC_KEY && env.WEB_PUSH_VAPID_PRIVATE_KEY);
}

export function getWebPushPublicKey(): string | null {
  return getEnv().WEB_PUSH_VAPID_PUBLIC_KEY ?? null;
}

export async function sendWebPush(input: {
  subscriptionJson: string;
  title: string;
  body: string;
  data: Record<string, string>;
}): Promise<void> {
  ensureWebPush();
  const subscription = JSON.parse(input.subscriptionJson) as webpush.PushSubscription;
  const url =
    input.data.resourceType === 'attendance'
      ? `/parent/attendance?student=${input.data.resourceId}`
      : '/parent/dashboard';

  await webpush.sendNotification(
    subscription,
    JSON.stringify({
      title: input.title,
      body: input.body,
      url,
      resourceType: input.data.resourceType,
      resourceId: input.data.resourceId,
      notificationId: input.data.notificationId,
    }),
  );
}

export function isWebPushSubscriptionInvalidError(err: unknown): boolean {
  const statusCode = (err as { statusCode?: number })?.statusCode;
  return statusCode === 404 || statusCode === 410;
}
