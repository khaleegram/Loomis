import { RISK_EVENT_TYPES } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { privilegedChangeRepository, riskOutboxRepository } from '../repository/index.js';
import type {
  ActorContext,
  CreatePrivilegedChangeInput,
  DecidePrivilegedChangeInput,
} from '../types.js';

const PLATFORM_ROLES = new Set(['platform_owner', 'platform_admin']);

export const privilegedChangeService = {
  async create(input: CreatePrivilegedChangeInput, actor: ActorContext) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }

    return privilegedChangeRepository.create({
      changeType: input.changeType,
      targetTenantId: input.targetTenantId ?? null,
      requestedByUserId: actor.userId,
      beforeJson: input.beforeJson,
      afterJson: input.afterJson,
      reason: input.reason,
      riskScore: input.riskScore,
    });
  },

  async list(actor: ActorContext) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }
    return privilegedChangeRepository.listRecent();
  },

  async getById(id: string, actor: ActorContext) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }
    const row = await privilegedChangeRepository.findById(id);
    if (!row) {
      throw new LoomisError('RISK_PRIVILEGED_CHANGE_NOT_FOUND', 404, 'Privileged change not found');
    }
    return row;
  },

  async decide(id: string, input: DecidePrivilegedChangeInput, actor: ActorContext) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }

    const existing = await privilegedChangeRepository.findById(id);
    if (!existing) {
      throw new LoomisError('RISK_PRIVILEGED_CHANGE_NOT_FOUND', 404, 'Privileged change not found');
    }
    if (existing.status !== 'requested') {
      throw new LoomisError(
        'RISK_PRIVILEGED_CHANGE_NOT_PENDING',
        409,
        'This privileged change is no longer pending approval',
      );
    }
    if (existing.requestedByUserId === actor.userId) {
      throw new LoomisError(
        'RISK_PRIVILEGED_CHANGE_APPROVER_IS_REQUESTER',
        403,
        'The approver cannot be the requester (CON-013)',
      );
    }

    if (input.decision === 'reject') {
      const rejected = await privilegedChangeRepository.decide(id, { status: 'rejected' });
      if (!rejected) {
        throw new LoomisError('RISK_PRIVILEGED_CHANGE_NOT_FOUND', 404, 'Privileged change not found');
      }
      return rejected;
    }

    const approved = await privilegedChangeRepository.decide(id, {
      status: 'approved',
      approvedByUserId: actor.userId,
      approvedAt: new Date(),
    });
    if (!approved) {
      throw new LoomisError('RISK_PRIVILEGED_CHANGE_NOT_FOUND', 404, 'Privileged change not found');
    }

    await riskOutboxRepository.publish({
      tenantId: approved.targetTenantId,
      aggregateType: 'privileged_change_request',
      aggregateId: approved.id,
      eventType: RISK_EVENT_TYPES.privilegedChangeApproved,
      payload: {
        changeId: approved.id,
        changeType: approved.changeType,
        targetTenantId: approved.targetTenantId,
        requestedByUserId: approved.requestedByUserId,
        approvedByUserId: actor.userId,
        afterJson: approved.afterJson,
      },
    });

    return approved;
  },

  async execute(id: string, actor: ActorContext) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }
    if (actor.userId) {
      const existing = await privilegedChangeRepository.findById(id);
      if (existing?.requestedByUserId === actor.userId) {
        throw new LoomisError(
          'RISK_PRIVILEGED_CHANGE_APPROVER_IS_REQUESTER',
          403,
          'The executor cannot be the original requester (CON-013)',
        );
      }
    }

    const executed = await privilegedChangeRepository.markExecuted(id);
    if (!executed) {
      throw new LoomisError(
        'RISK_PRIVILEGED_CHANGE_NOT_PENDING',
        409,
        'Change must be approved before execution',
      );
    }
    return executed;
  },
};
