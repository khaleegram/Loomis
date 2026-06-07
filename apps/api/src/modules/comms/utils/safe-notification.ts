import { LoomisError } from '../../../shared/errors.js';

const UNSAFE_PATTERNS = [
  /₦/,
  /\bNGN\b/i,
  /\b\d+\s*(kobo|naira)\b/i,
  /\bgrade[s]?\s*[:=]/i,
  /\b\d{1,3}(\.\d+)?\s*%/,
  /@/,
  /\+234/,
  /\b\d{11}\b/,
];

export function assertSafeNotificationBody(title: string, body: string): void {
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(body) || pattern.test(title)) {
      throw new LoomisError(
        'COMMS_UNSAFE_NOTIFICATION_BODY',
        422,
        'Notification content must not contain PII, grades, or monetary amounts',
      );
    }
  }
}

export function buildSafeCopy(
  copy: { title: string; body: string; deepLinkResourceType: string },
  resourceId: string,
) {
  assertSafeNotificationBody(copy.title, copy.body);
  return {
    title: copy.title,
    body: copy.body,
    deepLinkResourceType: copy.deepLinkResourceType,
    deepLinkResourceId: resourceId,
  };
}
