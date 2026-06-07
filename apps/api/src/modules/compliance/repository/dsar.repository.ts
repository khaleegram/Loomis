import { and, desc, eq, inArray, isNull, lt, notInArray, sql } from 'drizzle-orm';
import { dsars } from '../../../../drizzle/schema/compliance.js';
import type { DsarStatus } from '@loomis/contracts';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { DSAR_DEADLINE_DAYS, OPEN_DSAR_STATUSES } from '../types.js';

export const dsarRepository = {
  async create(
    tx: Executor,
    input: {
      tenantId: string | null;
      requesterType: string;
      requesterUserId: string | null;
      subjectUserId: string | null;
      subjectIdentifiers: Record<string, string>;
      dataCategories: string[];
      notes: string | null;
    },
  ) {
    const receivedAt = new Date();
    const responseDeadlineAt = new Date(receivedAt);
    responseDeadlineAt.setDate(responseDeadlineAt.getDate() + DSAR_DEADLINE_DAYS);

    const [row] = await tx
      .insert(dsars)
      .values({
        tenantId: input.tenantId,
        requesterType: input.requesterType,
        requesterUserId: input.requesterUserId,
        subjectUserId: input.subjectUserId,
        subjectIdentifiers: input.subjectIdentifiers,
        dataCategories: input.dataCategories,
        notes: input.notes,
        receivedAt,
        responseDeadlineAt,
        status: 'received',
      })
      .returning();
    if (!row) throw new Error('Failed to create DSAR');
    return row;
  },

  async findById(tx: Executor, dsarId: string) {
    const [row] = await tx.select().from(dsars).where(eq(dsars.id, dsarId)).limit(1);
    return row ?? null;
  },

  async list(tx: Executor, status?: DsarStatus) {
    const conditions = status ? [eq(dsars.status, status)] : [];
    return tx
      .select()
      .from(dsars)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(dsars.receivedAt));
  },

  async listOpenForEscalation(tx: Executor) {
    return tx
      .select()
      .from(dsars)
      .where(inArray(dsars.status, [...OPEN_DSAR_STATUSES]))
      .orderBy(dsars.responseDeadlineAt);
  },

  async update(
    tx: Executor,
    dsarId: string,
    patch: Partial<{
      status: DsarStatus;
      respondedAt: Date;
      respondedById: string;
      dataPackageJson: Record<string, unknown>;
      redactionNotes: string | null;
      notes: string | null;
      escalationDay21SentAt: Date;
      escalationDay28SentAt: Date;
    }>,
  ) {
    const [row] = await tx
      .update(dsars)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(dsars.id, dsarId))
      .returning();
    return row ?? null;
  },

  async countActive(tx: Executor) {
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(dsars)
      .where(inArray(dsars.status, [...OPEN_DSAR_STATUSES]));
    return row?.count ?? 0;
  },

  async countOverdue(tx: Executor) {
    const now = new Date();
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(dsars)
      .where(
        and(inArray(dsars.status, [...OPEN_DSAR_STATUSES]), lt(dsars.responseDeadlineAt, now)),
      );
    return row?.count ?? 0;
  },

  async findByIdGlobal(dsarId: string) {
    return withTenantContext(null, async (tx) => this.findById(tx, dsarId));
  },

  async listGlobal(status?: DsarStatus) {
    return withTenantContext(null, async (tx) => this.list(tx, status));
  },
};
