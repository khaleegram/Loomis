import { and, desc, eq } from 'drizzle-orm';
import { notifications } from '../../../../drizzle/schema/comms.js';
import type { Executor } from '../../../shared/db.js';
import type { NotificationType } from '@loomis/contracts';

export const notificationRepository = {
  async create(
    tx: Executor,
    input: {
      tenantId: string | null;
      userId: string;
      messageId?: string | null;
      notificationType: NotificationType;
      title: string;
      body: string;
      deepLinkResourceType: string;
      deepLinkResourceId: string;
      eventIdempotencyKey?: string | null;
      deliveryChannels?: Record<string, 'pending' | 'sent' | 'failed' | 'skipped'>;
    },
  ) {
    const [row] = await tx
      .insert(notifications)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        messageId: input.messageId ?? null,
        notificationType: input.notificationType,
        title: input.title,
        body: input.body,
        deepLinkResourceType: input.deepLinkResourceType,
        deepLinkResourceId: input.deepLinkResourceId,
        eventIdempotencyKey: input.eventIdempotencyKey ?? null,
        status: 'delivered',
        deliveryChannels: input.deliveryChannels ?? { in_app: 'sent' },
        deliveredAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  },

  async createMany(
    tx: Executor,
    inputs: Array<{
      tenantId: string | null;
      userId: string;
      messageId?: string | null;
      notificationType: NotificationType;
      title: string;
      body: string;
      deepLinkResourceType: string;
      deepLinkResourceId: string;
      eventIdempotencyKey?: string | null;
    }>,
  ) {
    if (inputs.length === 0) return [];

    const rows = await tx
      .insert(notifications)
      .values(
        inputs.map((input) => ({
          tenantId: input.tenantId,
          userId: input.userId,
          messageId: input.messageId ?? null,
          notificationType: input.notificationType,
          title: input.title,
          body: input.body,
          deepLinkResourceType: input.deepLinkResourceType,
          deepLinkResourceId: input.deepLinkResourceId,
          eventIdempotencyKey: input.eventIdempotencyKey ?? null,
          status: 'delivered' as const,
          deliveryChannels: { in_app: 'sent' as const },
          deliveredAt: new Date(),
        })),
      )
      .returning();

    return rows;
  },

  async findByIdempotencyKey(tx: Executor, key: string) {
    const [row] = await tx
      .select()
      .from(notifications)
      .where(eq(notifications.eventIdempotencyKey, key))
      .limit(1);
    return row ?? null;
  },

  async findById(tx: Executor, tenantId: string | null, notificationId: string, userId: string) {
    const [row] = await tx
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
          tenantId ? eq(notifications.tenantId, tenantId) : undefined,
        ),
      )
      .limit(1);
    return row ?? null;
  },

  async listForUser(tx: Executor, userId: string, tenantId?: string | null) {
    const conditions = [eq(notifications.userId, userId)];
    if (tenantId) conditions.push(eq(notifications.tenantId, tenantId));
    return tx
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt));
  },

  async userReceivedMessage(tx: Executor, userId: string, messageId: string): Promise<boolean> {
    const [row] = await tx
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.messageId, messageId)))
      .limit(1);
    return Boolean(row);
  },

  async markRead(tx: Executor, notificationId: string, userId: string) {
    const [row] = await tx
      .update(notifications)
      .set({ status: 'read', readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();
    return row ?? null;
  },

  async updateDeliveryChannels(
    tx: Executor,
    notificationId: string,
    deliveryChannels: Record<string, 'pending' | 'sent' | 'failed' | 'skipped'>,
  ) {
    const [row] = await tx
      .update(notifications)
      .set({ deliveryChannels })
      .where(eq(notifications.id, notificationId))
      .returning();
    return row ?? null;
  },
};
