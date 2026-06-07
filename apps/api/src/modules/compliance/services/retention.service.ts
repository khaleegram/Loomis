import { and, eq, lt } from 'drizzle-orm';
import { retentionEvents } from '../../../../drizzle/schema/compliance.js';
import { COMPLIANCE_EVENT_TYPES } from '@loomis/contracts';
import type { UpdateRetentionScheduleRequest } from '@loomis/contracts';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import {
  complianceOutboxRepository,
  retentionRepository,
  tenantScopeRepository,
} from '../repository/index.js';
import type { ActorContext } from '../types.js';
import { RETENTION_HARD_DELETE_DAYS } from '../types.js';
import { retentionHandlers } from './_retention-handlers.js';

function requireDpo(actor: ActorContext): void {
  if (actor.role !== 'dpo') {
    throw new LoomisError('FORBIDDEN', 403, 'DPO role required');
  }
}

const TENANT_CATEGORIES = ['staff_pii', 'student_records', 'admission_records'] as const;

async function appendAnonymisedEvents(
  tx: Parameters<typeof retentionRepository.appendEvent>[0],
  schedule: { id: string; dataCategory: string },
  target: { schema: string; table: string },
  rows: Array<{ id: string; tenantId: string | null }>,
): Promise<number> {
  let count = 0;
  for (const row of rows) {
    await retentionRepository.appendEvent(tx, {
      scheduleId: schedule.id,
      dataCategory: schedule.dataCategory,
      tenantId: row.tenantId,
      targetSchema: target.schema,
      targetTable: target.table,
      targetRecordId: row.id,
      action: 'anonymised',
    });
    count += 1;
  }
  return count;
}

export const retentionService = {
  async listSchedules(actor: ActorContext) {
    requireDpo(actor);
    return retentionRepository.listSchedulesGlobal();
  },

  async updateSchedule(
    scheduleId: string,
    input: UpdateRetentionScheduleRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireDpo(actor);

    return withTenantContext(null, async (tx) => {
      const existing = await retentionRepository.findScheduleById(tx, scheduleId);
      if (!existing) {
        throw new LoomisError(
          'COMPLIANCE_RETENTION_SCHEDULE_NOT_FOUND',
          404,
          'Retention schedule not found',
        );
      }

      const patch: {
        retentionDays?: number;
        anonymiseOnly?: boolean;
        description?: string;
        updatedById: string;
      } = { updatedById: actor.userId };
      if (input.retentionDays !== undefined) patch.retentionDays = input.retentionDays;
      if (input.anonymiseOnly !== undefined) patch.anonymiseOnly = input.anonymiseOnly;
      if (input.description !== undefined) patch.description = input.description;

      const record = await retentionRepository.updateSchedule(tx, scheduleId, patch);
      if (!record) {
        throw new LoomisError(
          'COMPLIANCE_RETENTION_SCHEDULE_NOT_FOUND',
          404,
          'Retention schedule not found',
        );
      }

      await writeAudit({
        tenantId: null,
        actorUserId: actor.userId,
        action: 'compliance.retention_schedule.updated',
        resourceType: 'retention_schedule',
        resourceId: record.id,
        sensitivity: 'standard',
        result: 'success',
        requestId,
      });

      return record;
    });
  },

  async runNightlyProcessor(): Promise<{ anonymised: number; hardDeleted: number }> {
    let anonymised = 0;
    let hardDeleted = 0;

    const tenantIds = await tenantScopeRepository.listActiveTenantIdsGlobal();

    await withTenantContext(null, async (platformTx) => {
      const schedules = await retentionRepository.listSchedules(platformTx);

      for (const schedule of schedules) {
        if (schedule.dataCategory === 'parent_pii') {
          const rows = await retentionHandlers.anonymiseParentPii(
            platformTx,
            schedule.retentionDays,
          );
          anonymised += await appendAnonymisedEvents(
            platformTx,
            schedule,
            { schema: 'student', table: 'parent_identities' },
            rows,
          );
          continue;
        }

        if (!TENANT_CATEGORIES.includes(schedule.dataCategory as (typeof TENANT_CATEGORIES)[number])) {
          continue;
        }

        for (const tenantId of tenantIds) {
          await withTenantContext(tenantId, async (tenantTx) => {
            if (schedule.dataCategory === 'staff_pii') {
              const rows = await retentionHandlers.anonymiseStaffPii(
                tenantTx,
                schedule.retentionDays,
              );
              anonymised += await appendAnonymisedEvents(
                tenantTx,
                schedule,
                { schema: 'hrm', table: 'staff_profiles' },
                rows,
              );
            }

            if (schedule.dataCategory === 'student_records') {
              const rows = await retentionHandlers.anonymiseStudentRecords(
                tenantTx,
                schedule.retentionDays,
                schedule.anonymiseOnly,
              );
              anonymised += await appendAnonymisedEvents(
                tenantTx,
                schedule,
                { schema: 'student', table: 'students' },
                rows,
              );
            }

            if (schedule.dataCategory === 'admission_records') {
              const rows = await retentionHandlers.anonymiseAdmissionRecords(
                tenantTx,
                schedule.retentionDays,
              );
              anonymised += await appendAnonymisedEvents(
                tenantTx,
                schedule,
                { schema: 'student', table: 'admissions' },
                rows,
              );
            }
          });
        }
      }

      const hardDeleteCutoff = new Date();
      hardDeleteCutoff.setDate(hardDeleteCutoff.getDate() - RETENTION_HARD_DELETE_DAYS);

      const eligible = await platformTx
        .select()
        .from(retentionEvents)
        .where(
          and(
            eq(retentionEvents.action, 'anonymised'),
            lt(retentionEvents.performedAt, hardDeleteCutoff),
          ),
        )
        .limit(500);

      for (const event of eligible) {
        const tenantId = event.tenantId;
        const deleted = tenantId
          ? await withTenantContext(tenantId, (tenantTx) =>
              retentionHandlers.hardDeleteEligible(
                tenantTx,
                event.targetSchema,
                event.targetTable,
                event.targetRecordId,
              ),
            )
          : await retentionHandlers.hardDeleteEligible(
              platformTx,
              event.targetSchema,
              event.targetTable,
              event.targetRecordId,
            );

        if (!deleted) continue;

        await retentionRepository.appendEvent(platformTx, {
          scheduleId: event.scheduleId,
          dataCategory: event.dataCategory,
          tenantId: event.tenantId,
          targetSchema: event.targetSchema,
          targetTable: event.targetTable,
          targetRecordId: event.targetRecordId,
          action: 'hard_deleted',
          metadata: { priorEventId: event.id },
        });
        hardDeleted += 1;
      }

      if (anonymised > 0 || hardDeleted > 0) {
        await complianceOutboxRepository.append(platformTx, {
          tenantId: null,
          aggregateType: 'retention_processor',
          aggregateId: 'nightly',
          eventType: COMPLIANCE_EVENT_TYPES.retentionProcessed,
          payload: { anonymised, hardDeleted },
        });
      }
    });

    return { anonymised, hardDeleted };
  },
};
