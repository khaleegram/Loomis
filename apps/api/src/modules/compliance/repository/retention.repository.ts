import { eq } from 'drizzle-orm';
import { retentionEvents, retentionSchedules } from '../../../../drizzle/schema/compliance.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const retentionRepository = {
  async listSchedules(tx: Executor) {
    return tx.select().from(retentionSchedules).orderBy(retentionSchedules.dataCategory);
  },

  async findScheduleById(tx: Executor, scheduleId: string) {
    const [row] = await tx
      .select()
      .from(retentionSchedules)
      .where(eq(retentionSchedules.id, scheduleId))
      .limit(1);
    return row ?? null;
  },

  async findScheduleByCategory(tx: Executor, dataCategory: string) {
    const [row] = await tx
      .select()
      .from(retentionSchedules)
      .where(eq(retentionSchedules.dataCategory, dataCategory))
      .limit(1);
    return row ?? null;
  },

  async updateSchedule(
    tx: Executor,
    scheduleId: string,
    patch: {
      retentionDays?: number;
      anonymiseOnly?: boolean;
      description?: string;
      updatedById: string;
    },
  ) {
    const [row] = await tx
      .update(retentionSchedules)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(retentionSchedules.id, scheduleId))
      .returning();
    return row ?? null;
  },

  async appendEvent(
    tx: Executor,
    input: {
      scheduleId: string;
      dataCategory: string;
      tenantId: string | null;
      targetSchema: string;
      targetTable: string;
      targetRecordId: string;
      action: 'anonymised' | 'hard_deleted';
      metadata?: Record<string, unknown>;
    },
  ) {
    const [row] = await tx
      .insert(retentionEvents)
      .values({
        scheduleId: input.scheduleId,
        dataCategory: input.dataCategory,
        tenantId: input.tenantId,
        targetSchema: input.targetSchema,
        targetTable: input.targetTable,
        targetRecordId: input.targetRecordId,
        action: input.action,
        metadata: input.metadata ?? {},
      })
      .returning();
    if (!row) throw new Error('Failed to append retention event');
    return row;
  },

  async hasAnonymisedEvent(tx: Executor, targetSchema: string, targetTable: string, recordId: string) {
    const [row] = await tx
      .select({ id: retentionEvents.id })
      .from(retentionEvents)
      .where(
        eq(retentionEvents.targetRecordId, recordId),
      )
      .limit(1);
    return Boolean(row);
  },

  async listSchedulesGlobal() {
    return withTenantContext(null, async (tx) => this.listSchedules(tx));
  },

  async findScheduleByIdGlobal(scheduleId: string) {
    return withTenantContext(null, async (tx) => this.findScheduleById(tx, scheduleId));
  },
};
