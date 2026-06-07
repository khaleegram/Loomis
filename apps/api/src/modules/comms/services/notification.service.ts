import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { notificationRepository } from '../repository/index.js';
import type { ActorContext } from '../types.js';

export const notificationService = {
  async listForUser(tenantId: string | null, actor: ActorContext) {
    return withTenantContext(tenantId, async (tx) =>
      notificationRepository.listForUser(tx, actor.userId, tenantId ?? undefined),
    );
  },

  async markRead(tenantId: string, notificationId: string, actor: ActorContext) {
    return withTenantContext(tenantId, async (tx) => {
      const row = await notificationRepository.markRead(tx, notificationId, actor.userId);
      if (!row) {
        throw new LoomisError('NOT_FOUND', 404, 'Notification not found');
      }
      return row;
    });
  },
};
