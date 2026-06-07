import { REFERRAL_EVENT_TYPES } from '@loomis/contracts';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import {
  attributionRepository,
  participantRepository,
  referralOutboxRepository,
} from '../repository/index.js';
import type { ActorContext } from '../types.js';
import { PLATFORM_ROLES } from '../types.js';
import { codeService } from './code.service.js';

export const attributionService = {
  /**
   * Validates a raw referral code for tenant provisioning (US-PLT-001 / CON-015).
   * Returns null when invalid or KYC not approved.
   */
  async validateReferralCode(rawCode: string) {
    const resolved = await codeService.resolveActiveCode(rawCode);
    if (!resolved) {
      return { valid: false as const };
    }
    return {
      valid: true as const,
      participantId: resolved.participant.id,
      participantType: resolved.participant.participantType,
      kycApproved: true,
      codeId: resolved.code.id,
      directParticipantId: resolved.participant.id,
      managerParticipantId: resolved.participant.managerParticipantId,
    };
  },

  async createAttributionForTenant(input: {
    tenantId: string;
    rawReferralCode: string;
    onboardingSource: 'manager_direct' | 'subordinate' | 'self_registration' | 'platform';
    actorUserId?: string | null;
    requestId?: string;
  }) {
    const validation = await this.validateReferralCode(input.rawReferralCode);
    if (!validation.valid) {
      throw new LoomisError(
        'REFERRAL_CODE_INVALID',
        422,
        'Referral code is invalid or participant is not KYC-verified',
      );
    }

    return withTenantContext(input.tenantId, async (tx) => {
      const existing = await attributionRepository.findByTenant(tx, input.tenantId);
      if (existing) {
        throw new LoomisError(
          'REFERRAL_ATTRIBUTION_EXISTS',
          409,
          'This tenant already has a referral attribution',
        );
      }

      const directParticipant = await participantRepository.findById(
        tx,
        validation.directParticipantId,
      );
      if (!directParticipant) {
        throw new LoomisError('REFERRAL_PARTICIPANT_NOT_FOUND', 404, 'Participant not found');
      }

      let managerParticipantId = validation.managerParticipantId ?? null;
      if (directParticipant.participantType === 'regional_subordinate') {
        managerParticipantId = directParticipant.managerParticipantId;
      } else {
        managerParticipantId = null;
      }

      let status: 'active' | 'flagged' = 'active';
      let flagReason: string | null = null;

      if (input.onboardingSource === 'self_registration') {
        status = 'flagged';
        flagReason = 'self_registration';
      }

      const attribution = await attributionRepository.create(tx, {
        tenantId: input.tenantId,
        referralCodeId: validation.codeId,
        directParticipantId: validation.directParticipantId,
        managerParticipantId,
        onboardingSource: input.onboardingSource,
        status,
        flagReason,
      });

      await referralOutboxRepository.append(tx, {
        tenantId: input.tenantId,
        aggregateType: 'attribution',
        aggregateId: attribution.id,
        eventType: REFERRAL_EVENT_TYPES.attributionCreated,
        payload: {
          tenantId: input.tenantId,
          attributionId: attribution.id,
          directParticipantId: attribution.directParticipantId,
          managerParticipantId: attribution.managerParticipantId,
          status: attribution.status,
        },
      });

      if (input.requestId && input.actorUserId) {
        await writeAudit({
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          action: 'referral.attribution.created',
          resourceType: 'attribution',
          resourceId: attribution.id,
          sensitivity: 'privileged',
          result: 'success',
          requestId: input.requestId,
        });
      }

      return attribution;
    });
  },

  async listAttributionMap(actor: ActorContext, status?: string) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }
    return attributionRepository.listPlatform(status as never);
  },

  async getAttributionForTenant(tenantId: string, actor: ActorContext) {
    if (!PLATFORM_ROLES.has(actor.role) && actor.tenantId !== tenantId) {
      throw new LoomisError('FORBIDDEN', 403, 'Access denied');
    }
    const attribution = await attributionRepository.findByTenantGlobal(tenantId);
    if (!attribution) {
      throw new LoomisError('NOT_FOUND', 404, 'No attribution for this tenant');
    }
    return attribution;
  },
};
