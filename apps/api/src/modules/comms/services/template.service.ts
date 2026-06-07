import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { templateRepository } from '../repository/index.js';
import { assertSafeNotificationBody } from '../utils/safe-notification.js';
import type { ActorContext, UpsertNotificationTemplateInput } from '../types.js';

const PLATFORM_ROLES = new Set(['platform_owner', 'platform_admin', 'school_owner', 'principal']);

export const templateService = {
  async upsert(
    tenantId: string | null,
    templateKey: string,
    channel: string,
    input: UpsertNotificationTemplateInput,
    actor: ActorContext,
  ) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Not authorised to manage notification templates');
    }

    assertSafeNotificationBody(input.subjectTemplate, input.bodyTemplate);

    return withTenantContext(tenantId, async (tx) =>
      templateRepository.upsert(tx, {
        tenantId,
        templateKey,
        channel,
        subjectTemplate: input.subjectTemplate,
        bodyTemplate: input.bodyTemplate,
        isActive: input.isActive,
      }),
    );
  },

  async list(tenantId: string | null, actor: ActorContext) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Not authorised to view notification templates');
    }
    return withTenantContext(tenantId, async (tx) => templateRepository.listForTenant(tx, tenantId));
  },
};
