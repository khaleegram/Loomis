import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { kycRepository, participantRepository } from '../repository/index.js';
import type { ActorContext, RejectKycInput, ReviewKycInput, SubmitKycInput } from '../types.js';
import { PLATFORM_ROLES, REGIONAL_ROLES } from '../types.js';
import { codeService } from './code.service.js';

function requireRegional(actor: ActorContext): void {
  if (actor.tenantId !== null || !REGIONAL_ROLES.has(actor.role)) {
    throw new LoomisError('FORBIDDEN', 403, 'Regional role required');
  }
}

async function assertCanReviewKyc(
  tx: Parameters<typeof kycRepository.findById>[0],
  kycId: string,
  reviewerUserId: string,
): Promise<NonNullable<Awaited<ReturnType<typeof kycRepository.findById>>>> {
  const kyc = await kycRepository.findById(tx, kycId);
  if (!kyc) {
    throw new LoomisError('NOT_FOUND', 404, 'KYC record not found');
  }
  if (kyc.status !== 'pending') {
    throw new LoomisError('REFERRAL_KYC_PENDING', 409, 'KYC is not pending review');
  }

  const participant = await participantRepository.findById(tx, kyc.participantId);
  if (!participant) {
    throw new LoomisError('REFERRAL_PARTICIPANT_NOT_FOUND', 404, 'Participant not found');
  }

  if (participant.userId === reviewerUserId) {
    throw new LoomisError(
      'REFERRAL_SELF_APPROVAL_BLOCKED',
      403,
      'Participants cannot approve their own KYC',
    );
  }

  if (participant.managerParticipantId) {
    const isManagerReviewer = await participantRepository.isSubordinateOf(
      tx,
      participant.id,
      reviewerUserId,
    );
    if (isManagerReviewer) {
      throw new LoomisError(
        'REFERRAL_SELF_APPROVAL_BLOCKED',
        403,
        'Regional Managers cannot approve their subordinates KYC',
      );
    }
  }

  return kyc;
}

export const kycService = {
  async submit(input: SubmitKycInput, actor: ActorContext, requestId: string) {
    requireRegional(actor);

    return withTenantContext(null, async (tx) => {
      const participant = await participantRepository.findByUserId(tx, actor.userId);
      if (!participant) {
        throw new LoomisError('REFERRAL_PARTICIPANT_NOT_FOUND', 404, 'Participant not found');
      }

      const pending = await kycRepository.findLatestForParticipant(tx, participant.id);
      if (pending?.status === 'pending') {
        throw new LoomisError('REFERRAL_KYC_PENDING', 409, 'A KYC submission is already pending');
      }

      const record = await kycRepository.create(tx, {
        participantId: participant.id,
        submittedByUserId: actor.userId,
        identityDocumentObjectId: input.identityDocumentObjectId,
        addressProofObjectId: input.addressProofObjectId,
        conflictOfInterestDeclared: input.conflictOfInterestDeclared,
        conflictDetails: input.conflictDetails ?? null,
        conflictAnswers: input.conflictAnswers ?? {},
      });

      await writeAudit({
        tenantId: null,
        actorUserId: actor.userId,
        action: 'referral.kyc.submitted',
        resourceType: 'kyc_record',
        resourceId: record.id,
        sensitivity: 'pii',
        result: 'success',
        requestId,
      });

      return record;
    });
  },

  async getMyLatest(actor: ActorContext) {
    requireRegional(actor);
    const participant = await participantRepository.findByUserIdGlobal(actor.userId);
    if (!participant) {
      throw new LoomisError('REFERRAL_PARTICIPANT_NOT_FOUND', 404, 'Participant not found');
    }
    return withTenantContext(null, async (tx) =>
      kycRepository.findLatestForParticipant(tx, participant.id),
    );
  },

  async listPending(actor: ActorContext) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }
    return withTenantContext(null, async (tx) => kycRepository.listPending(tx));
  },

  async approve(kycId: string, _input: ReviewKycInput, actor: ActorContext, requestId: string) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }

    const result = await withTenantContext(null, async (tx) => {
      await assertCanReviewKyc(tx, kycId, actor.userId);
      const approved = await kycRepository.approve(tx, kycId, actor.userId);
      if (!approved) {
        throw new LoomisError('NOT_FOUND', 404, 'KYC record not found');
      }

      await participantRepository.activate(tx, approved.participantId);
      return approved;
    });

    const codeReveal = await codeService.generateForParticipant(
      result.participantId,
      actor,
      requestId,
    );

    await writeAudit({
      tenantId: null,
      actorUserId: actor.userId,
      action: 'referral.kyc.approved',
      resourceType: 'kyc_record',
      resourceId: result.id,
      sensitivity: 'pii',
      result: 'success',
      requestId,
    });

    return { kyc: result, codeReveal };
  },

  async reject(kycId: string, input: RejectKycInput, actor: ActorContext, requestId: string) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }

    const result = await withTenantContext(null, async (tx) => {
      await assertCanReviewKyc(tx, kycId, actor.userId);
      const rejected = await kycRepository.reject(tx, kycId, actor.userId, input.reason);
      if (!rejected) {
        throw new LoomisError('NOT_FOUND', 404, 'KYC record not found');
      }
      return rejected;
    });

    await writeAudit({
      tenantId: null,
      actorUserId: actor.userId,
      action: 'referral.kyc.rejected',
      resourceType: 'kyc_record',
      resourceId: result.id,
      sensitivity: 'pii',
      result: 'success',
      requestId,
    });

    return result;
  },

  async hasApprovedKyc(participantId: string): Promise<boolean> {
    return withTenantContext(null, async (tx) =>
      kycRepository.hasApprovedKyc(tx, participantId),
    );
  },
};
