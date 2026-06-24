import { RISK_EVENT_TYPES } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';

import { caseRepository, riskOutboxRepository } from '../repository/index.js';
import type { ActorContext, RequestIvpRecountInput, UpdateIvpCaseInput } from '../types.js';
import { ACTIVE_IVP_STATUSES } from '../types.js';

function requirePlatform(actor: ActorContext): void {
  if (actor.tenantId !== null) {
    throw new LoomisError('FORBIDDEN', 403, 'Platform access required');
  }
}

function requireTenantActor(actor: ActorContext, tenantId: string): void {
  if (actor.tenantId !== null && actor.tenantId !== tenantId) {
    throw new LoomisError('FORBIDDEN', 403, 'Tenant mismatch');
  }
}

const TERMINAL_STATUSES = new Set([
  'RESOLVED_EXPLAINED',
  'RESOLVED_CORRECTED',
  'RESOLVED_ENFORCED',
  'DISMISSED',
]);

export const ivpCaseService = {
  async listPlatformCases(actor: ActorContext, status?: string) {
    requirePlatform(actor);
    return caseRepository.listPlatform(status as never);
  },

  async listTenantCases(tenantId: string, actor: ActorContext) {
    requireTenantActor(actor, tenantId);
    return caseRepository.listForTenant(tenantId);
  },

  async getCase(tenantId: string | null, caseId: string, actor: ActorContext) {
    const row = await caseRepository.findById(tenantId, caseId);
    if (!row) {
      throw new LoomisError('RISK_IVP_CASE_NOT_FOUND', 404, 'IVP anomaly case not found');
    }
    if (actor.tenantId !== null && actor.tenantId !== row.tenantId) {
      throw new LoomisError('FORBIDDEN', 403, 'Tenant mismatch');
    }
    return row;
  },

  async updateCase(
    tenantId: string | null,
    caseId: string,
    input: UpdateIvpCaseInput,
    actor: ActorContext,
  ) {
    requirePlatform(actor);
    const existing = await this.getCase(tenantId, caseId, actor);
    if (TERMINAL_STATUSES.has(existing.caseStatus)) {
      throw new LoomisError(
        'RISK_IVP_CASE_ALREADY_RESOLVED',
        409,
        'This IVP case has already been resolved',
      );
    }

    const patch: Parameters<typeof caseRepository.update>[2] = {};
    if (input.caseStatus !== undefined) patch.caseStatus = input.caseStatus;
    if (input.assignedToId !== undefined) patch.assignedToId = input.assignedToId;
    if (input.resolutionNotes !== undefined) patch.resolutionNotes = input.resolutionNotes;
    if (input.caseStatus && TERMINAL_STATUSES.has(input.caseStatus)) {
      patch.resolvedById = actor.userId;
      patch.resolvedAt = new Date();
    }

    const updated = await caseRepository.update(existing.tenantId, caseId, patch);
    if (!updated) {
      throw new LoomisError('RISK_IVP_CASE_NOT_FOUND', 404, 'IVP anomaly case not found');
    }

    if (input.caseStatus && TERMINAL_STATUSES.has(input.caseStatus)) {
      await riskOutboxRepository.publish({
        tenantId: updated.tenantId,
        aggregateType: 'ivp_anomaly_case',
        aggregateId: updated.id,
        eventType: RISK_EVENT_TYPES.ivpCaseClosed,
        payload: {
          caseId: updated.id,
          tenantId: updated.tenantId,
          termId: updated.termId,
          caseStatus: updated.caseStatus,
          resolvedById: actor.userId,
        },
      });
    }

    return updated;
  },

  async requestRecount(
    tenantId: string,
    caseId: string,
    input: RequestIvpRecountInput,
    actor: ActorContext,
  ) {
    requirePlatform(actor);
    const existing = await this.getCase(null, caseId, actor);
    if (!ACTIVE_IVP_STATUSES.includes(existing.caseStatus as never)) {
      throw new LoomisError(
        'RISK_IVP_CASE_ALREADY_RESOLVED',
        409,
        'Recount can only be requested for active IVP cases',
      );
    }

    const updated = await caseRepository.update(existing.tenantId, caseId, {
      caseStatus: 'INVESTIGATING',
      resolutionNotes: `Recount requested: ${input.reason}`,
    });
    if (!updated) {
      throw new LoomisError('RISK_IVP_CASE_NOT_FOUND', 404, 'IVP anomaly case not found');
    }

    await riskOutboxRepository.publish({
      tenantId: updated.tenantId,
      aggregateType: 'ivp_anomaly_case',
      aggregateId: updated.id,
      eventType: RISK_EVENT_TYPES.ivpCaseOpened,
      payload: {
        caseId: updated.id,
        tenantId: updated.tenantId,
        termId: updated.termId,
        action: 'recount_requested',
        reason: input.reason,
        requestedById: actor.userId,
      },
    });

    return updated;
  },

  /** Referral module calls this — earnings held while any IVP case is active (§8.2). */
  async isReferralEarningsHeld(tenantId: string): Promise<boolean> {
    return caseRepository.hasActiveCase(tenantId);
  },
};
