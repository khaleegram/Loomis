import {
  COMPLIANCE_EVENT_TYPES,
  type AcknowledgeBreachRequest,
  type CreateBreachRecordRequest,
  type RecordNdpcNotificationRequest,
  type UpdateBreachRecordRequest,
} from '@loomis/contracts';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import {
  breachRepository,
  complianceOutboxRepository,
  platformUserRepository,
} from '../repository/index.js';
import type { ActorContext } from '../types.js';
import { BREACH_DPO_ESCALATION_HOURS, BREACH_NDPC_HOURS } from '../types.js';

function requireDpo(actor: ActorContext): void {
  if (actor.role !== 'dpo') {
    throw new LoomisError('FORBIDDEN', 403, 'DPO role required');
  }
}

function buildNdpcDraft(input: {
  breachType: string;
  affectedDataCategories: string[];
  estimatedSubjectCount: number;
  likelyCause: string;
  containmentMeasures: string;
  discoveredAt: Date;
  ndpcDeadlineAt: Date | null;
}): Record<string, unknown> {
  return {
    incidentSummary: `A ${input.breachType} incident was discovered affecting approximately ${input.estimatedSubjectCount} data subjects. Likely cause: ${input.likelyCause}`,
    affectedDataCategories: input.affectedDataCategories,
    estimatedSubjectCount: input.estimatedSubjectCount,
    containmentMeasures: input.containmentMeasures,
    discoveryDate: input.discoveredAt.toISOString(),
    breachType: input.breachType,
    notificationDeadline: input.ndpcDeadlineAt?.toISOString() ?? null,
    regulatoryBody: 'NDPC',
    draftGeneratedAt: new Date().toISOString(),
  };
}

export const breachService = {
  async list(actor: ActorContext, status?: string) {
    requireDpo(actor);
    return breachRepository.listGlobal(status as never);
  },

  async get(breachId: string, actor: ActorContext) {
    requireDpo(actor);
    const row = await breachRepository.findByIdGlobal(breachId);
    if (!row) {
      throw new LoomisError('COMPLIANCE_BREACH_NOT_FOUND', 404, 'Breach record not found');
    }
    return row;
  },

  async create(input: CreateBreachRecordRequest, actor: ActorContext, requestId: string) {
    requireDpo(actor);

    const discoveredAt = new Date(input.discoveredAt);
    const draft = buildNdpcDraft({
      breachType: input.breachType,
      affectedDataCategories: input.affectedDataCategories,
      estimatedSubjectCount: input.estimatedSubjectCount,
      likelyCause: input.likelyCause,
      containmentMeasures: input.containmentMeasures,
      discoveredAt,
      ndpcDeadlineAt: null,
    });

    return withTenantContext(null, async (tx) => {
      const record = await breachRepository.create(tx, {
        tenantId: input.tenantId ?? null,
        discoveredAt,
        breachType: input.breachType,
        affectedDataCategories: input.affectedDataCategories,
        estimatedSubjectCount: input.estimatedSubjectCount,
        likelyCause: input.likelyCause,
        containmentMeasures: input.containmentMeasures,
        ndpcNotificationDraft: draft,
      });

      const dpoIds = await platformUserRepository.findDpoUserIds(tx);
      const ownerIds = await platformUserRepository.findPlatformOwnerUserIds(tx);

      await complianceOutboxRepository.append(tx, {
        tenantId: input.tenantId ?? null,
        aggregateType: 'breach_record',
        aggregateId: record.id,
        eventType: COMPLIANCE_EVENT_TYPES.breachCreated,
        payload: {
          breachId: record.id,
          notifyUserIds: [...dpoIds, ...ownerIds],
          priority: 'P1',
        },
      });

      await writeAudit({
        tenantId: input.tenantId ?? null,
        actorUserId: actor.userId,
        action: 'compliance.breach.created',
        resourceType: 'breach_record',
        resourceId: record.id,
        sensitivity: 'security',
        result: 'success',
        requestId,
      });

      return record;
    });
  },

  async acknowledge(
    breachId: string,
    input: AcknowledgeBreachRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireDpo(actor);

    return withTenantContext(null, async (tx) => {
      const existing = await breachRepository.findById(tx, breachId);
      if (!existing) {
        throw new LoomisError('COMPLIANCE_BREACH_NOT_FOUND', 404, 'Breach record not found');
      }
      if (existing.acknowledgedAt) {
        throw new LoomisError(
          'COMPLIANCE_BREACH_ALREADY_ACKNOWLEDGED',
          409,
          'Breach already acknowledged',
        );
      }

      const acknowledgedAt = new Date();
      const ndpcDeadlineAt = input.ndpcNotificationRequired
        ? new Date(acknowledgedAt.getTime() + BREACH_NDPC_HOURS * 60 * 60 * 1000)
        : null;

      const draft = buildNdpcDraft({
        breachType: existing.breachType,
        affectedDataCategories: existing.affectedDataCategories,
        estimatedSubjectCount: existing.estimatedSubjectCount,
        likelyCause: existing.likelyCause,
        containmentMeasures: existing.containmentMeasures,
        discoveredAt: existing.discoveredAt,
        ndpcDeadlineAt,
      });

      const patch: Parameters<typeof breachRepository.update>[2] = {
        acknowledgedAt,
        acknowledgedById: actor.userId,
        ndpcNotificationRequired: input.ndpcNotificationRequired,
        ndpcNotificationDraft: draft,
        status: 'confirmed',
        assignedDpoId: actor.userId,
      };
      if (ndpcDeadlineAt) {
        patch.ndpcDeadlineAt = ndpcDeadlineAt;
      }

      const record = await breachRepository.update(tx, breachId, patch);
      if (!record) {
        throw new LoomisError('COMPLIANCE_BREACH_NOT_FOUND', 404, 'Breach record not found');
      }

      await complianceOutboxRepository.append(tx, {
        tenantId: record.tenantId,
        aggregateType: 'breach_record',
        aggregateId: record.id,
        eventType: COMPLIANCE_EVENT_TYPES.breachAcknowledged,
        payload: {
          breachId: record.id,
          ndpcDeadlineAt: ndpcDeadlineAt?.toISOString() ?? null,
        },
      });

      await writeAudit({
        tenantId: record.tenantId,
        actorUserId: actor.userId,
        action: 'compliance.breach.acknowledged',
        resourceType: 'breach_record',
        resourceId: record.id,
        sensitivity: 'security',
        result: 'success',
        requestId,
      });

      return record;
    });
  },

  async update(
    breachId: string,
    input: UpdateBreachRecordRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireDpo(actor);

    return withTenantContext(null, async (tx) => {
      const existing = await breachRepository.findById(tx, breachId);
      if (!existing) {
        throw new LoomisError('COMPLIANCE_BREACH_NOT_FOUND', 404, 'Breach record not found');
      }

      const patch: Parameters<typeof breachRepository.update>[2] = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.ndpcNotificationRequired !== undefined) {
        patch.ndpcNotificationRequired = input.ndpcNotificationRequired;
      }
      if (input.ndpcNotificationOutcome !== undefined) {
        patch.ndpcNotificationOutcome = input.ndpcNotificationOutcome;
      }
      if (input.assignedDpoId !== undefined) patch.assignedDpoId = input.assignedDpoId;

      const record = await breachRepository.update(tx, breachId, patch);
      if (!record) {
        throw new LoomisError('COMPLIANCE_BREACH_NOT_FOUND', 404, 'Breach record not found');
      }

      await writeAudit({
        tenantId: record.tenantId,
        actorUserId: actor.userId,
        action: 'compliance.breach.updated',
        resourceType: 'breach_record',
        resourceId: record.id,
        sensitivity: 'security',
        result: 'success',
        requestId,
      });

      return record;
    });
  },

  async getNdpcDraft(breachId: string, actor: ActorContext) {
    requireDpo(actor);
    const row = await breachRepository.findByIdGlobal(breachId);
    if (!row) {
      throw new LoomisError('COMPLIANCE_BREACH_NOT_FOUND', 404, 'Breach record not found');
    }
    return row.ndpcNotificationDraft ?? buildNdpcDraft({
      breachType: row.breachType,
      affectedDataCategories: row.affectedDataCategories,
      estimatedSubjectCount: row.estimatedSubjectCount,
      likelyCause: row.likelyCause,
      containmentMeasures: row.containmentMeasures,
      discoveredAt: row.discoveredAt,
      ndpcDeadlineAt: row.ndpcDeadlineAt,
    });
  },

  async recordNdpcNotification(
    breachId: string,
    input: RecordNdpcNotificationRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireDpo(actor);

    return withTenantContext(null, async (tx) => {
      const existing = await breachRepository.findById(tx, breachId);
      if (!existing) {
        throw new LoomisError('COMPLIANCE_BREACH_NOT_FOUND', 404, 'Breach record not found');
      }
      if (!existing.acknowledgedAt) {
        throw new LoomisError(
          'COMPLIANCE_BREACH_NOT_ACKNOWLEDGED',
          422,
          'Acknowledge breach before recording NDPC notification',
        );
      }
      if (existing.ndpcNotifiedAt) {
        throw new LoomisError(
          'COMPLIANCE_BREACH_ALREADY_NOTIFIED',
          409,
          'NDPC notification already recorded',
        );
      }

      const record = await breachRepository.update(tx, breachId, {
        ndpcNotifiedAt: new Date(),
        ndpcNotificationOutcome: input.outcome,
        status: 'ndpc_notified',
      });
      if (!record) {
        throw new LoomisError('COMPLIANCE_BREACH_NOT_FOUND', 404, 'Breach record not found');
      }

      await complianceOutboxRepository.append(tx, {
        tenantId: record.tenantId,
        aggregateType: 'breach_record',
        aggregateId: record.id,
        eventType: COMPLIANCE_EVENT_TYPES.breachNotified,
        payload: { breachId: record.id },
      });

      await writeAudit({
        tenantId: record.tenantId,
        actorUserId: actor.userId,
        action: 'compliance.breach.ndpc_notified',
        resourceType: 'breach_record',
        resourceId: record.id,
        sensitivity: 'security',
        result: 'success',
        requestId,
      });

      return record;
    });
  },

  async processEscalations(): Promise<number> {
    const now = new Date();
    let escalated = 0;

    await withTenantContext(null, async (tx) => {
      const open = await breachRepository.listOpenForEscalation(tx);
      const ownerIds = await platformUserRepository.findPlatformOwnerUserIds(tx);

      for (const breach of open) {
        if (breach.acknowledgedAt) continue;

        const hoursSinceDiscovery =
          (now.getTime() - breach.discoveredAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceDiscovery >= BREACH_DPO_ESCALATION_HOURS && !breach.escalation48hSentAt) {
          await breachRepository.update(tx, breach.id, { escalation48hSentAt: now });
          await complianceOutboxRepository.append(tx, {
            tenantId: breach.tenantId,
            aggregateType: 'breach_record',
            aggregateId: breach.id,
            eventType: COMPLIANCE_EVENT_TYPES.breachEscalated,
            payload: {
              breachId: breach.id,
              notifyUserIds: ownerIds,
              priority: 'P1',
              reason: 'dpo_inaction_48h',
            },
          });
          escalated += 1;
        }
      }
    });

    return escalated;
  },
};
