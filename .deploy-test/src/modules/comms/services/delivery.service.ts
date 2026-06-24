import type { NotificationType } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import {
  isApnsConfigured,
  isApnsTokenInvalidError,
  sendApnsPush,
} from '../gateways/apns.gateway.js';
import {
  isFcmConfigured,
  isFcmTokenInvalidError,
  sendFcmPush,
} from '../gateways/fcm.gateway.js';
import {
  isWebPushConfigured,
  isWebPushSubscriptionInvalidError,
  sendWebPush,
} from '../gateways/webpush.gateway.js';
import { isSesConfigured, sendEmail } from '../gateways/ses.gateway.js';
import { isTermiiConfigured, sendSms } from '../gateways/termii.gateway.js';
import {
  notificationRepository,
  pushSubscriptionRepository,
  recipientRepository,
} from '../repository/index.js';
import { buildSafeCopy } from '../utils/safe-notification.js';

const EXTERNAL_DELIVERY_CONCURRENCY = 8;

export type InAppNotificationInput = {
  tenantId: string | null;
  userId: string;
  notificationType: NotificationType;
  safeCopy: { title: string; body: string; deepLinkResourceType: string };
  resourceId: string;
  messageId?: string | null;
  eventIdempotencyKey?: string | null;
};

type CreatedInAppNotification = {
  id: string;
  userId: string;
  tenantId: string | null;
  title: string;
  body: string;
  deepLinkResourceType: string;
  deepLinkResourceId: string;
};

type ExternalDeliveryJob = {
  notificationId: string;
  userId: string;
  tenantId: string | null;
  title: string;
  body: string;
  deepLinkResourceType: string;
  deepLinkResourceId: string;
  channels?: Array<'email' | 'sms' | 'push'>;
};

export const deliveryService = {
  /** Fast path: in-app notifications only — one DB transaction for all recipients. */
  async createManyInApp(inputs: InAppNotificationInput[]): Promise<CreatedInAppNotification[]> {
    if (inputs.length === 0) return [];

    const tenantId = inputs[0]?.tenantId ?? null;
    const rows = inputs.map((input) => {
      const copy = buildSafeCopy(input.safeCopy, input.resourceId);
      return {
        tenantId: input.tenantId,
        userId: input.userId,
        messageId: input.messageId ?? null,
        notificationType: input.notificationType,
        title: copy.title,
        body: copy.body,
        deepLinkResourceType: copy.deepLinkResourceType,
        deepLinkResourceId: copy.deepLinkResourceId,
        eventIdempotencyKey: input.eventIdempotencyKey ?? null,
      };
    });

    const inserted = await withTenantContext(tenantId, async (tx) =>
      notificationRepository.createMany(tx, rows),
    );

    return inserted.map((row) => ({
      id: row.id,
      userId: row.userId,
      tenantId: row.tenantId,
      title: row.title,
      body: row.body,
      deepLinkResourceType: row.deepLinkResourceType,
      deepLinkResourceId: row.deepLinkResourceId,
    }));
  },

  /** Email / SMS / push run in the background so send APIs return immediately. */
  scheduleExternalDeliveries(jobs: ExternalDeliveryJob[]): void {
    if (jobs.length === 0) return;

    void (async () => {
      for (let offset = 0; offset < jobs.length; offset += EXTERNAL_DELIVERY_CONCURRENCY) {
        const chunk = jobs.slice(offset, offset + EXTERNAL_DELIVERY_CONCURRENCY);
        await Promise.allSettled(
          chunk.map((job) =>
            this.deliverExternalChannels(job.notificationId, job.userId, job.tenantId, {
              title: job.title,
              body: job.body,
              deepLinkResourceType: job.deepLinkResourceType,
              deepLinkResourceId: job.deepLinkResourceId,
              channels: job.channels ?? ['email', 'sms', 'push'],
            }),
          ),
        );
      }
    })();
  },

  async createAndDeliver(input: {
    tenantId: string | null;
    userId: string;
    notificationType: NotificationType;
    safeCopy: { title: string; body: string; deepLinkResourceType: string };
    resourceId: string;
    messageId?: string | null;
    eventIdempotencyKey?: string | null;
    requestId?: string;
    actorUserId?: string | null;
    channels?: Array<'email' | 'sms' | 'push'>;
  }) {
    if (input.eventIdempotencyKey) {
      const existing = await withTenantContext(input.tenantId, async (tx) =>
        notificationRepository.findByIdempotencyKey(tx, input.eventIdempotencyKey!),
      );
      if (existing) return existing;
    }

    const [created] = await this.createManyInApp([
      {
        tenantId: input.tenantId,
        userId: input.userId,
        notificationType: input.notificationType,
        safeCopy: input.safeCopy,
        resourceId: input.resourceId,
        ...(input.messageId != null ? { messageId: input.messageId } : {}),
        ...(input.eventIdempotencyKey != null
          ? { eventIdempotencyKey: input.eventIdempotencyKey }
          : {}),
      },
    ]);

    if (!created) {
      if (input.eventIdempotencyKey) {
        const existing = await withTenantContext(input.tenantId, async (tx) =>
          notificationRepository.findByIdempotencyKey(tx, input.eventIdempotencyKey!),
        );
        if (existing) return existing;
      }
      throw new LoomisError('INTERNAL_ERROR', 500, 'Failed to create notification');
    }

    this.scheduleExternalDeliveries([
      {
        notificationId: created.id,
        userId: created.userId,
        tenantId: created.tenantId,
        title: created.title,
        body: created.body,
        deepLinkResourceType: created.deepLinkResourceType,
        deepLinkResourceId: created.deepLinkResourceId,
        ...(input.channels != null ? { channels: input.channels } : {}),
      },
    ]);

    const row = await withTenantContext(input.tenantId, async (tx) =>
      notificationRepository.findById(tx, input.tenantId, created.id, input.userId),
    );
    if (!row) {
      throw new LoomisError('INTERNAL_ERROR', 500, 'Failed to load created notification');
    }
    return row;
  },

  async deliverExternalChannels(
    notificationId: string,
    userId: string,
    tenantId: string | null,
    input: {
      title: string;
      body: string;
      deepLinkResourceType: string;
      deepLinkResourceId: string;
      channels: Array<'email' | 'sms' | 'push'>;
    },
  ): Promise<void> {
    const deliveryChannels: Record<string, 'pending' | 'sent' | 'failed' | 'skipped'> = {
      in_app: 'sent',
    };

    await withTenantContext(tenantId, async (tx) => {
      if (input.channels.includes('email')) {
        if (!isSesConfigured()) {
          deliveryChannels.email = 'skipped';
        } else {
          const email = await recipientRepository.getUserEmail(tx, userId);
          if (!email) {
            deliveryChannels.email = 'skipped';
          } else {
            try {
              await sendEmail({ to: email, subject: input.title, body: input.body });
              deliveryChannels.email = 'sent';
            } catch {
              deliveryChannels.email = 'failed';
            }
          }
        }
      }

      if (input.channels.includes('sms')) {
        if (!isTermiiConfigured()) {
          deliveryChannels.sms = 'skipped';
        } else {
          const phone = await recipientRepository.getUserPhone(tx, userId);
          if (!phone) {
            deliveryChannels.sms = 'skipped';
          } else {
            try {
              await sendSms({ to: phone, message: input.body });
              deliveryChannels.sms = 'sent';
            } catch {
              deliveryChannels.sms = 'failed';
            }
          }
        }
      }

      if (input.channels.includes('push')) {
        const subscriptions = await pushSubscriptionRepository.listActiveForUser(tx, userId);
        if (subscriptions.length === 0) {
          deliveryChannels.push = 'skipped';
        } else {
          let anySent = false;
          let anyFailed = false;
          const pushData = {
            resourceType: input.deepLinkResourceType,
            resourceId: input.deepLinkResourceId,
            notificationId,
          };

          for (const sub of subscriptions) {
            try {
              if (sub.provider === 'webpush') {
                if (!isWebPushConfigured()) {
                  throw new LoomisError(
                    'COMMS_PUSH_UNAVAILABLE',
                    503,
                    'Web push VAPID keys are not configured',
                  );
                }
                await sendWebPush({
                  subscriptionJson: sub.token,
                  title: input.title,
                  body: input.body,
                  data: pushData,
                });
              } else if (sub.provider === 'fcm') {
                if (!isFcmConfigured()) {
                  throw new LoomisError(
                    'COMMS_PUSH_UNAVAILABLE',
                    503,
                    'FCM_SERVICE_ACCOUNT_JSON is not configured',
                  );
                }
                await sendFcmPush({
                  token: sub.token,
                  title: input.title,
                  body: input.body,
                  data: pushData,
                });
              } else {
                if (!isApnsConfigured()) {
                  throw new LoomisError(
                    'COMMS_PUSH_UNAVAILABLE',
                    503,
                    'APNs credentials are not configured',
                  );
                }
                await sendApnsPush({
                  token: sub.token,
                  title: input.title,
                  body: input.body,
                  data: pushData,
                });
              }
              anySent = true;
            } catch (err) {
              anyFailed = true;
              if (
                isFcmTokenInvalidError(err) ||
                isApnsTokenInvalidError(err) ||
                isWebPushSubscriptionInvalidError(err)
              ) {
                await pushSubscriptionRepository.deregisterByToken(tx, sub.token);
              }
            }
          }
          deliveryChannels.push = anySent ? 'sent' : anyFailed ? 'failed' : 'skipped';
        }
      }

      await notificationRepository.updateDeliveryChannels(tx, notificationId, deliveryChannels);
    });
  },
};
