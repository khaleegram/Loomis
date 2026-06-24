import {
  COMPLIANCE_EVENT_TYPES,
  type CreateDsarRequest,
  type RespondDsarRequest,
  type UpdateDsarRequest,
} from '@loomis/contracts';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import {
  complianceOutboxRepository,
  dsarRepository,
  platformUserRepository,
} from '../repository/index.js';
import type { ActorContext } from '../types.js';
import { collectDsarDataPackage } from './_retention-handlers.js';

function requireDpo(actor: ActorContext): void {
  if (actor.role !== 'dpo') {
    throw new LoomisError('FORBIDDEN', 403, 'DPO role required');
  }
}

export const dsarService = {
  async list(actor: ActorContext, status?: string) {
    requireDpo(actor);
    return dsarRepository.listGlobal(status as never);
  },

  async get(dsarId: string, actor: ActorContext) {
    requireDpo(actor);
    const row = await dsarRepository.findByIdGlobal(dsarId);
    if (!row) {
      throw new LoomisError('COMPLIANCE_DSAR_NOT_FOUND', 404, 'DSAR not found');
    }
    return row;
  },

  async create(input: CreateDsarRequest, actor: ActorContext, requestId: string) {
    requireDpo(actor);

    return withTenantContext(null, async (tx) => {
      const record = await dsarRepository.create(tx, {
        tenantId: input.tenantId ?? null,
        requesterType: input.requesterType,
        requesterUserId: input.requesterUserId ?? null,
        subjectUserId: input.subjectUserId ?? null,
        subjectIdentifiers: input.subjectIdentifiers,
        dataCategories: input.dataCategories,
        notes: input.notes ?? null,
      });

      await complianceOutboxRepository.append(tx, {
        tenantId: input.tenantId ?? null,
        aggregateType: 'dsar',
        aggregateId: record.id,
        eventType: COMPLIANCE_EVENT_TYPES.dsarCreated,
        payload: { dsarId: record.id, tenantId: input.tenantId ?? null },
      });

      await writeAudit({
        tenantId: input.tenantId ?? null,
        actorUserId: actor.userId,
        action: 'compliance.dsar.created',
        resourceType: 'dsar',
        resourceId: record.id,
        sensitivity: 'pii',
        result: 'success',
        requestId,
      });

      return record;
    });
  },

  async update(dsarId: string, input: UpdateDsarRequest, actor: ActorContext, requestId: string) {
    requireDpo(actor);

    return withTenantContext(null, async (tx) => {
      const existing = await dsarRepository.findById(tx, dsarId);
      if (!existing) {
        throw new LoomisError('COMPLIANCE_DSAR_NOT_FOUND', 404, 'DSAR not found');
      }
      if (existing.status === 'responded' || existing.status === 'rejected') {
        throw new LoomisError(
          'COMPLIANCE_DSAR_ALREADY_RESPONDED',
          409,
          'DSAR is already closed',
        );
      }

      const patch: Parameters<typeof dsarRepository.update>[2] = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.redactionNotes !== undefined) patch.redactionNotes = input.redactionNotes;
      if (input.notes !== undefined) patch.notes = input.notes;

      const record = await dsarRepository.update(tx, dsarId, patch);
      if (!record) {
        throw new LoomisError('COMPLIANCE_DSAR_NOT_FOUND', 404, 'DSAR not found');
      }

      await writeAudit({
        tenantId: record.tenantId,
        actorUserId: actor.userId,
        action: 'compliance.dsar.updated',
        resourceType: 'dsar',
        resourceId: record.id,
        sensitivity: 'pii',
        result: 'success',
        requestId,
      });

      return record;
    });
  },

  async collectData(dsarId: string, actor: ActorContext, requestId: string) {
    requireDpo(actor);

    return withTenantContext(null, async (tx) => {
      const existing = await dsarRepository.findById(tx, dsarId);
      if (!existing) {
        throw new LoomisError('COMPLIANCE_DSAR_NOT_FOUND', 404, 'DSAR not found');
      }

      const tenantScope = existing.tenantId;
      const dataPackage = tenantScope
        ? await withTenantContext(tenantScope, (tenantTx) =>
            collectDsarDataPackage(tenantTx, {
              tenantId: tenantScope,
              subjectUserId: existing.subjectUserId,
              subjectIdentifiers: existing.subjectIdentifiers,
            }),
          )
        : await collectDsarDataPackage(tx, {
            tenantId: null,
            subjectUserId: existing.subjectUserId,
            subjectIdentifiers: existing.subjectIdentifiers,
          });

      const record = await dsarRepository.update(tx, dsarId, {
        status: 'in_progress',
        dataPackageJson: dataPackage,
      });
      if (!record) {
        throw new LoomisError('COMPLIANCE_DSAR_NOT_FOUND', 404, 'DSAR not found');
      }

      await writeAudit({
        tenantId: record.tenantId,
        actorUserId: actor.userId,
        action: 'compliance.dsar.collected',
        resourceType: 'dsar',
        resourceId: record.id,
        sensitivity: 'pii',
        result: 'success',
        requestId,
      });

      return record;
    });
  },

  async respond(dsarId: string, input: RespondDsarRequest, actor: ActorContext, requestId: string) {
    requireDpo(actor);

    return withTenantContext(null, async (tx) => {
      const existing = await dsarRepository.findById(tx, dsarId);
      if (!existing) {
        throw new LoomisError('COMPLIANCE_DSAR_NOT_FOUND', 404, 'DSAR not found');
      }
      if (existing.status === 'responded' || existing.status === 'rejected') {
        throw new LoomisError(
          'COMPLIANCE_DSAR_ALREADY_RESPONDED',
          409,
          'DSAR is already closed',
        );
      }
      if (!existing.dataPackageJson) {
        throw new LoomisError(
          'COMPLIANCE_DSAR_INVALID_TRANSITION',
          422,
          'Collect DSAR data before marking as responded',
        );
      }

      const record = await dsarRepository.update(tx, dsarId, {
        status: 'responded',
        respondedAt: new Date(),
        respondedById: actor.userId,
        redactionNotes: input.redactionNotes ?? null,
      });
      if (!record) {
        throw new LoomisError('COMPLIANCE_DSAR_NOT_FOUND', 404, 'DSAR not found');
      }

      await complianceOutboxRepository.append(tx, {
        tenantId: record.tenantId,
        aggregateType: 'dsar',
        aggregateId: record.id,
        eventType: COMPLIANCE_EVENT_TYPES.dsarFulfilled,
        payload: { dsarId: record.id },
      });

      await writeAudit({
        tenantId: record.tenantId,
        actorUserId: actor.userId,
        action: 'compliance.dsar.responded',
        resourceType: 'dsar',
        resourceId: record.id,
        sensitivity: 'pii',
        result: 'success',
        requestId,
      });

      return record;
    });
  },

  async processEscalations(): Promise<{ day21: number; day28: number }> {
    const now = new Date();
    let day21 = 0;
    let day28 = 0;

    await withTenantContext(null, async (tx) => {
      const open = await dsarRepository.listOpenForEscalation(tx);
      const dpoIds = await platformUserRepository.findDpoUserIds(tx);

      for (const dsar of open) {
        const daysElapsed = Math.floor(
          (now.getTime() - dsar.receivedAt.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysElapsed >= 21 && !dsar.escalationDay21SentAt) {
          await dsarRepository.update(tx, dsar.id, { escalationDay21SentAt: now });
          await complianceOutboxRepository.append(tx, {
            tenantId: dsar.tenantId,
            aggregateType: 'dsar',
            aggregateId: dsar.id,
            eventType: COMPLIANCE_EVENT_TYPES.dsarEscalated,
            payload: {
              dsarId: dsar.id,
              escalationLevel: 21,
              notifyUserIds: dpoIds,
            },
          });
          day21 += 1;
        }

        if (daysElapsed >= 28 && !dsar.escalationDay28SentAt) {
          const ownerIds = await platformUserRepository.findPlatformOwnerUserIds(tx);
          await dsarRepository.update(tx, dsar.id, { escalationDay28SentAt: now });
          await complianceOutboxRepository.append(tx, {
            tenantId: dsar.tenantId,
            aggregateType: 'dsar',
            aggregateId: dsar.id,
            eventType: COMPLIANCE_EVENT_TYPES.dsarEscalated,
            payload: {
              dsarId: dsar.id,
              escalationLevel: 28,
              notifyUserIds: [...dpoIds, ...ownerIds],
            },
          });
          day28 += 1;
        }
      }
    });

    return { day21, day28 };
  },
};
