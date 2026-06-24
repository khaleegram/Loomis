import { COMPLIANCE_EVENT_TYPES } from '@loomis/contracts';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { complianceOutboxRepository, consentRepository } from '../repository/index.js';
import type { ActorContext } from '../types.js';

function requireDpo(actor: ActorContext): void {
  if (actor.role !== 'dpo') {
    throw new LoomisError('FORBIDDEN', 403, 'DPO role required');
  }
}

export const consentService = {
  async list(actor: ActorContext) {
    requireDpo(actor);
    return consentRepository.listGlobal();
  },

  async getActive(actor: ActorContext) {
    requireDpo(actor);
    return consentRepository.findActiveGlobal();
  },

  async publish(
    input: {
      versionLabel: string;
      privacyPolicyHash: string;
      contentSummary: string;
      effectiveFrom: string;
    },
    actor: ActorContext,
    requestId: string,
  ) {
    requireDpo(actor);

    return withTenantContext(null, async (tx) => {
      const existing = await consentRepository.findByVersionLabel(tx, input.versionLabel);
      if (existing) {
        throw new LoomisError(
          'COMPLIANCE_CONSENT_VERSION_CONFLICT',
          409,
          'Consent version label already exists',
        );
      }

      const record = await consentRepository.create(tx, {
        versionLabel: input.versionLabel,
        privacyPolicyHash: input.privacyPolicyHash,
        contentSummary: input.contentSummary,
        effectiveFrom: new Date(input.effectiveFrom),
        publishedById: actor.userId,
      });

      await complianceOutboxRepository.append(tx, {
        tenantId: null,
        aggregateType: 'consent_version',
        aggregateId: record.id,
        eventType: COMPLIANCE_EVENT_TYPES.consentPublished,
        payload: { consentVersionId: record.id, versionLabel: record.versionLabel },
      });

      await writeAudit({
        tenantId: null,
        actorUserId: actor.userId,
        action: 'compliance.consent.published',
        resourceType: 'consent_version',
        resourceId: record.id,
        sensitivity: 'standard',
        result: 'success',
        requestId,
      });

      return record;
    });
  },
};
