import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { breachRecords } from '../../../../drizzle/schema/compliance.js';
import type { BreachStatus } from '@loomis/contracts';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { OPEN_BREACH_STATUSES } from '../types.js';

export const breachRepository = {
  async create(
    tx: Executor,
    input: {
      tenantId: string | null;
      discoveredAt: Date;
      breachType: string;
      affectedDataCategories: string[];
      estimatedSubjectCount: number;
      likelyCause: string;
      containmentMeasures: string;
      ndpcNotificationDraft: Record<string, unknown>;
    },
  ) {
    const [row] = await tx
      .insert(breachRecords)
      .values({
        tenantId: input.tenantId,
        discoveredAt: input.discoveredAt,
        breachType: input.breachType,
        affectedDataCategories: input.affectedDataCategories,
        estimatedSubjectCount: input.estimatedSubjectCount,
        likelyCause: input.likelyCause,
        containmentMeasures: input.containmentMeasures,
        ndpcNotificationDraft: input.ndpcNotificationDraft,
        status: 'suspected',
      })
      .returning();
    if (!row) throw new Error('Failed to create breach record');
    return row;
  },

  async findById(tx: Executor, breachId: string) {
    const [row] = await tx
      .select()
      .from(breachRecords)
      .where(eq(breachRecords.id, breachId))
      .limit(1);
    return row ?? null;
  },

  async list(tx: Executor, status?: BreachStatus) {
    const conditions = status ? [eq(breachRecords.status, status)] : [];
    return tx
      .select()
      .from(breachRecords)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(breachRecords.discoveredAt));
  },

  async listOpenForEscalation(tx: Executor) {
    return tx
      .select()
      .from(breachRecords)
      .where(inArray(breachRecords.status, [...OPEN_BREACH_STATUSES]))
      .orderBy(breachRecords.discoveredAt);
  },

  async listPendingNdpc(tx: Executor) {
    return tx
      .select()
      .from(breachRecords)
      .where(
        and(
          eq(breachRecords.ndpcNotificationRequired, true),
          isNull(breachRecords.ndpcNotifiedAt),
          inArray(breachRecords.status, ['confirmed', 'contained']),
        ),
      );
  },

  async update(
    tx: Executor,
    breachId: string,
    patch: Partial<{
      status: BreachStatus;
      acknowledgedAt: Date;
      acknowledgedById: string;
      ndpcNotificationRequired: boolean;
      ndpcNotificationDraft: Record<string, unknown>;
      ndpcNotifiedAt: Date;
      ndpcNotificationOutcome: string;
      ndpcDeadlineAt: Date;
      assignedDpoId: string | null;
      escalation48hSentAt: Date;
    }>,
  ) {
    const [row] = await tx
      .update(breachRecords)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(breachRecords.id, breachId))
      .returning();
    return row ?? null;
  },

  async countOpen(tx: Executor) {
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(breachRecords)
      .where(inArray(breachRecords.status, [...OPEN_BREACH_STATUSES]));
    return row?.count ?? 0;
  },

  async countPendingNdpc(tx: Executor) {
    const now = new Date();
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(breachRecords)
      .where(
        and(
          eq(breachRecords.ndpcNotificationRequired, true),
          isNull(breachRecords.ndpcNotifiedAt),
          lt(breachRecords.ndpcDeadlineAt, now),
        ),
      );
    return row?.count ?? 0;
  },

  async findByIdGlobal(breachId: string) {
    return withTenantContext(null, async (tx) => this.findById(tx, breachId));
  },

  async listGlobal(status?: BreachStatus) {
    return withTenantContext(null, async (tx) => this.list(tx, status));
  },
};
