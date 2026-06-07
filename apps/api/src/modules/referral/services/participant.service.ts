import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { participantRepository } from '../repository/index.js';
import type { ActorContext, CreateSubordinateInput } from '../types.js';
import { PLATFORM_ROLES, REGIONAL_ROLES } from '../types.js';

function requireRegional(actor: ActorContext): void {
  if (actor.tenantId !== null || !REGIONAL_ROLES.has(actor.role)) {
    throw new LoomisError('FORBIDDEN', 403, 'Regional role required');
  }
}

export const participantService = {
  async getOrCreateForUser(actor: ActorContext) {
    requireRegional(actor);
    return withTenantContext(null, async (tx) => {
      const existing = await participantRepository.findByUserId(tx, actor.userId);
      if (existing) return existing;

      const participantType =
        actor.role === 'regional_manager' ? 'regional_manager' : 'regional_subordinate';

      return participantRepository.create(tx, {
        userId: actor.userId,
        participantType,
        status: 'pending_kyc',
      });
    });
  },

  async getMe(actor: ActorContext) {
    requireRegional(actor);
    const participant = await participantRepository.findByUserIdGlobal(actor.userId);
    if (!participant) {
      throw new LoomisError('REFERRAL_PARTICIPANT_NOT_FOUND', 404, 'Referral participant not found');
    }
    return participant;
  },

  async createSubordinate(input: CreateSubordinateInput, actor: ActorContext) {
    if (actor.role !== 'regional_manager') {
      throw new LoomisError('FORBIDDEN', 403, 'Only Regional Managers can create subordinates');
    }

    return withTenantContext(null, async (tx) => {
      const manager = await participantRepository.findByUserId(tx, actor.userId);
      if (!manager) {
        throw new LoomisError('REFERRAL_PARTICIPANT_NOT_FOUND', 404, 'Manager participant not found');
      }

      const existing = await participantRepository.findByUserId(tx, input.userId);
      if (existing) {
        throw new LoomisError('VALIDATION_ERROR', 409, 'User is already a referral participant');
      }

      return participantRepository.create(tx, {
        userId: input.userId,
        participantType: 'regional_subordinate',
        managerParticipantId: manager.id,
        region: input.region ?? manager.region,
        status: 'pending_kyc',
      });
    });
  },

  async listSubordinates(actor: ActorContext) {
    if (actor.role !== 'regional_manager') {
      throw new LoomisError('FORBIDDEN', 403, 'Only Regional Managers can list subordinates');
    }
    const manager = await participantRepository.findByUserIdGlobal(actor.userId);
    if (!manager) {
      throw new LoomisError('REFERRAL_PARTICIPANT_NOT_FOUND', 404, 'Manager participant not found');
    }
    return withTenantContext(null, async (tx) =>
      participantRepository.listSubordinates(tx, manager.id),
    );
  },

  async deactivate(participantId: string, reason: string, actor: ActorContext) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }

    return withTenantContext(null, async (tx) => {
      const participant = await participantRepository.findById(tx, participantId);
      if (!participant) {
        throw new LoomisError('REFERRAL_PARTICIPANT_NOT_FOUND', 404, 'Participant not found');
      }
      const deactivated = await participantRepository.deactivate(tx, participantId, reason);
      if (!deactivated) {
        throw new LoomisError('REFERRAL_PARTICIPANT_NOT_FOUND', 404, 'Participant not found');
      }
      return deactivated;
    });
  },
};
