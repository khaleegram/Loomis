import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { codeRepository, kycRepository, participantRepository } from '../repository/index.js';
import type { ActorContext } from '../types.js';
import { REGIONAL_ROLES } from '../types.js';
import { generateRawReferralCode, hashReferralCode } from '../utils/referral-code.js';

function requireRegional(actor: ActorContext): void {
  if (actor.tenantId !== null || !REGIONAL_ROLES.has(actor.role)) {
    throw new LoomisError('FORBIDDEN', 403, 'Regional role required');
  }
}

export const codeService = {
  async generateForParticipant(participantId: string, actor: ActorContext, requestId: string) {
    return withTenantContext(null, async (tx) => {
      const hasKyc = await kycRepository.hasApprovedKyc(tx, participantId);
      if (!hasKyc) {
        throw new LoomisError(
          'REFERRAL_KYC_NOT_APPROVED',
          422,
          'KYC must be approved before generating a referral code',
        );
      }

      await codeRepository.revokeActiveForParticipant(tx, participantId);

      const rawCode = generateRawReferralCode();
      const codeHash = hashReferralCode(rawCode);
      const code = await codeRepository.create(tx, {
        participantId,
        codeHash,
        status: 'active',
      });
      await codeRepository.markShownOnce(tx, code.id);

      await writeAudit({
        tenantId: null,
        actorUserId: actor.userId,
        action: 'referral.code.generated',
        resourceType: 'referral_code',
        resourceId: code.id,
        sensitivity: 'security',
        result: 'success',
        requestId,
      });

      return { codeId: code.id, rawCode };
    });
  },

  async regenerate(actor: ActorContext, requestId: string) {
    requireRegional(actor);
    const participant = await participantRepository.findByUserIdGlobal(actor.userId);
    if (!participant) {
      throw new LoomisError('REFERRAL_PARTICIPANT_NOT_FOUND', 404, 'Participant not found');
    }
    if (participant.status === 'deactivated') {
      throw new LoomisError('REFERRAL_PARTICIPANT_DEACTIVATED', 403, 'Participant is deactivated');
    }

    const reveal = await this.generateForParticipant(participant.id, actor, requestId);
    return {
      codeId: reveal.codeId,
      rawCode: reveal.rawCode,
      message: 'Store this code securely. It cannot be retrieved again.' as const,
    };
  },

  async getMyCodeSummary(actor: ActorContext) {
    requireRegional(actor);
    const participant = await participantRepository.findByUserIdGlobal(actor.userId);
    if (!participant) {
      throw new LoomisError('REFERRAL_PARTICIPANT_NOT_FOUND', 404, 'Participant not found');
    }

    return withTenantContext(null, async (tx) => {
      const code = await codeRepository.findLatestByParticipant(tx, participant.id);
      if (!code) {
        throw new LoomisError('REFERRAL_CODE_NOT_FOUND', 404, 'No referral code exists yet');
      }
      return {
        id: code.id,
        status: code.status,
        activatedAt: code.activatedAt?.toISOString() ?? null,
        canRegenerate: participant.status === 'active',
      };
    });
  },

  async resolveActiveCode(rawCode: string) {
    const codeHash = hashReferralCode(rawCode);
    return withTenantContext(null, async (tx) => {
      const code = await codeRepository.findByHash(tx, codeHash);
      if (!code || code.status !== 'active') return null;

      const participant = await participantRepository.findById(tx, code.participantId);
      if (!participant || participant.status === 'deactivated') return null;

      const kycApproved = await kycRepository.hasApprovedKyc(tx, participant.id);
      if (!kycApproved) return null;

      return { code, participant };
    });
  },
};
