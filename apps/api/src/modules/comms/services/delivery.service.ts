import { COMMS_EVENT_TYPES } from '@loomis/contracts';
import { writeAudit } from '../../../shared/audit.js';
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
import { isSesConfigured, sendEmail } from '../gateways/ses.gateway.js';
import { isTermiiConfigured, sendSms } from '../gateways/termii.gateway.js';
import {
  commsOutboxRepository,
  notificationRepository,
  pushSubscriptionRepository,
  recipientRepository,
} from '../repository/index.js';
import { buildSafeCopy } from '../utils/safe-notification.js';
import type { NotificationType } from '@loomis/contracts';

export const deliveryService = {
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
    const copy = buildSafeCopy(input.safeCopy, input.resourceId);

    const notification = await withTenantContext(input.tenantId, async (tx) => {
      if (input.eventIdempotencyKey) {
        const existing = await notificationRepository.findByIdempotencyKey(
          tx,
          input.eventIdempotencyKey,
        );
        if (existing) return existing;
      }

      const deliveryChannels: Record<string, 'pending' | 'sent' | 'failed' | 'skipped'> = {
        in_app: 'sent',
      };

      const row = await notificationRepository.create(tx, {
        tenantId: input.tenantId,
        userId: input.userId,
        messageId: input.messageId ?? null,
        notificationType: input.notificationType,
        title: copy.title,
        body: copy.body,
        deepLinkResourceType: copy.deepLinkResourceType,
        deepLinkResourceId: copy.deepLinkResourceId,
        eventIdempotencyKey: input.eventIdempotencyKey ?? null,
        deliveryChannels,
      });

      if (!row) {
        if (input.eventIdempotencyKey) {
          return notificationRepository.findByIdempotencyKey(tx, input.eventIdempotencyKey);
        }
        throw new LoomisError('INTERNAL_ERROR', 500, 'Failed to create notification');
      }

      await commsOutboxRepository.append(tx, {
        tenantId: input.tenantId,
        aggregateType: 'notification',
        aggregateId: row.id,
        eventType: COMMS_EVENT_TYPES.notificationSent,
        payload: {
          notificationId: row.id,
          userId: input.userId,
          tenantId: input.tenantId,
          notificationType: input.notificationType,
        },
      });

      if (input.requestId && input.actorUserId) {
        await writeAudit({
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          action: 'comms.notification.created',
          resourceType: 'notification',
          resourceId: row.id,
          sensitivity: 'standard',
          result: 'success',
          requestId: input.requestId,
        });
      }

      return row;
    });

    if (!notification) return notification;

    await this.deliverExternalChannels(notification.id, input.userId, input.tenantId, {
      title: copy.title,
      body: copy.body,
      deepLinkResourceType: copy.deepLinkResourceType,
      deepLinkResourceId: copy.deepLinkResourceId,
      channels: input.channels ?? ['email', 'sms', 'push'],
    });

    return notification;
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
              if (sub.provider === 'fcm') {
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
              if (isFcmTokenInvalidError(err) || isApnsTokenInvalidError(err)) {
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
