import { and, eq, isNull } from 'drizzle-orm';
import { notificationTemplates } from '../../../../drizzle/schema/comms.js';
import type { Executor } from '../../../shared/db.js';

export const templateRepository = {
  async upsert(
    tx: Executor,
    input: {
      tenantId: string | null;
      templateKey: string;
      channel: string;
      subjectTemplate: string;
      bodyTemplate: string;
      isActive: boolean;
    },
  ) {
    const existing = await this.find(tx, input.tenantId, input.templateKey, input.channel);
    if (existing) {
      const [row] = await tx
        .update(notificationTemplates)
        .set({
          subjectTemplate: input.subjectTemplate,
          bodyTemplate: input.bodyTemplate,
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(notificationTemplates.id, existing.id))
        .returning();
      return row!;
    }

    const [row] = await tx
      .insert(notificationTemplates)
      .values(input)
      .returning();
    if (!row) throw new Error('Failed to create notification template');
    return row;
  },

  async find(tx: Executor, tenantId: string | null, templateKey: string, channel: string) {
    const [row] = await tx
      .select()
      .from(notificationTemplates)
      .where(
        and(
          tenantId ? eq(notificationTemplates.tenantId, tenantId) : isNull(notificationTemplates.tenantId),
          eq(notificationTemplates.templateKey, templateKey),
          eq(notificationTemplates.channel, channel),
        ),
      )
      .limit(1);
    return row ?? null;
  },

  async listForTenant(tx: Executor, tenantId: string | null) {
    return tx
      .select()
      .from(notificationTemplates)
      .where(
        tenantId
          ? eq(notificationTemplates.tenantId, tenantId)
          : isNull(notificationTemplates.tenantId),
      );
  },
};
