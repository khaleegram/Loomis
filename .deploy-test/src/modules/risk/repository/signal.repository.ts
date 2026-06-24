import { and, desc, eq, gte, sql } from 'drizzle-orm';
import {
  attendanceRecords,
  gradebookEntries,
} from '../../../../drizzle/schema/academic.js';
import { payments } from '../../../../drizzle/schema/finance.js';
import { psfObligations } from '../../../../drizzle/schema/ledger.js';
import { enrollments, parentLinks } from '../../../../drizzle/schema/student.js';
import { userSessions, users } from '../../../../drizzle/schema/identity.js';
import type { IvpSignalType } from '@loomis/contracts';
import { ivpSignalSnapshots } from '../../../../drizzle/schema/risk.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { CollectedSignals } from '../types.js';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export const signalRepository = {
  async collectSignals(tenantId: string, termId: string): Promise<CollectedSignals> {
    return withTenantContext(tenantId, async (tx) => {
      const [attendanceRow] = await tx
        .select({
          total: sql<number>`count(distinct ${attendanceRecords.studentId})::int`,
        })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.tenantId, tenantId),
            eq(attendanceRecords.termId, termId),
            sql`NOT EXISTS (
              SELECT 1 FROM ${enrollments} e
              WHERE e.tenant_id = ${attendanceRecords.tenantId}
                AND e.term_id = ${attendanceRecords.termId}
                AND e.student_id = ${attendanceRecords.studentId}
                AND e.status = 'active_billable'
            )`,
          ),
        );

      const [gradebookRow] = await tx
        .select({
          total: sql<number>`count(distinct ${gradebookEntries.studentId})::int`,
        })
        .from(gradebookEntries)
        .where(
          and(
            eq(gradebookEntries.tenantId, tenantId),
            eq(gradebookEntries.termId, termId),
            sql`NOT EXISTS (
              SELECT 1 FROM ${enrollments} e
              WHERE e.tenant_id = ${gradebookEntries.tenantId}
                AND e.term_id = ${gradebookEntries.termId}
                AND e.student_id = ${gradebookEntries.studentId}
                AND e.status = 'active_billable'
            )`,
          ),
        );

      const [paymentRow] = await tx
        .select({
          totalMinor: sql<number>`coalesce(sum(${payments.amountMinor}), 0)::bigint`,
        })
        .from(payments)
        .where(
          and(eq(payments.tenantId, tenantId), eq(payments.termId, termId), eq(payments.status, 'verified')),
        );

      const [obligationRow] = await tx
        .select({
          totalMinor: sql<number>`coalesce(sum(${psfObligations.amountMinor}), 0)::bigint`,
        })
        .from(psfObligations)
        .where(and(eq(psfObligations.tenantId, tenantId), eq(psfObligations.termId, termId)));

      const paymentTotal = Number(paymentRow?.totalMinor ?? 0);
      const obligationTotal = Number(obligationRow?.totalMinor ?? 0);
      const paymentVolumeRatioMilli =
        obligationTotal === 0
          ? paymentTotal > 0
            ? 10_000
            : 0
          : Math.round((paymentTotal / obligationTotal) * 1000);

      const [deviceRow] = await tx
        .select({
          total: sql<number>`count(distinct ${userSessions.userId})::int`,
        })
        .from(userSessions)
        .innerJoin(users, eq(users.id, userSessions.userId))
        .where(
          and(
            eq(users.tenantId, tenantId),
            eq(users.role, 'student'),
            eq(userSessions.revoked, false),
            gte(userSessions.lastActiveAt, sql`now() - interval '30 days'`),
          ),
        );

      const [parentLinkRow] = await tx
        .select({
          total: sql<number>`count(distinct ${parentLinks.studentId})::int`,
        })
        .from(parentLinks)
        .where(
          and(
            eq(parentLinks.tenantId, tenantId),
            eq(parentLinks.status, 'active'),
            sql`NOT EXISTS (
              SELECT 1 FROM ${enrollments} e
              WHERE e.tenant_id = ${parentLinks.tenantId}
                AND e.term_id = ${termId}
                AND e.student_id = ${parentLinks.studentId}
                AND e.status = 'active_billable'
            )`,
          ),
        );

      const [billableRow] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.tenantId, tenantId),
            eq(enrollments.termId, termId),
            eq(enrollments.status, 'active_billable'),
          ),
        );

      const billable = Number(billableRow?.total ?? 0);
      const attendanceAnomaly = Number(attendanceRow?.total ?? 0);
      const gradebookAnomaly = Number(gradebookRow?.total ?? 0);
      const parentLinkAnomaly = Number(parentLinkRow?.total ?? 0);
      const deviceCount = Number(deviceRow?.total ?? 0);
      const activityEstimate = Math.max(
        billable,
        billable + attendanceAnomaly,
        billable + gradebookAnomaly,
        deviceCount,
        billable + parentLinkAnomaly,
      );

      return {
        attendanceAnomaly,
        gradebookAnomaly,
        paymentVolumeRatioMilli,
        deviceCount,
        parentLinkAnomaly,
        activityEstimate,
      };
    });
  },

  async upsertSnapshot(
    tx: Executor,
    input: {
      tenantId: string;
      termId: string;
      signalType: IvpSignalType;
      signalValue: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const snapshotDate = todayDateString();
    const [row] = await tx
      .insert(ivpSignalSnapshots)
      .values({
        tenantId: input.tenantId,
        termId: input.termId,
        snapshotDate,
        signalType: input.signalType,
        signalValue: input.signalValue,
        metadata: input.metadata ?? {},
      })
      .onConflictDoUpdate({
        target: [
          ivpSignalSnapshots.tenantId,
          ivpSignalSnapshots.termId,
          ivpSignalSnapshots.snapshotDate,
          ivpSignalSnapshots.signalType,
        ],
        set: {
          signalValue: input.signalValue,
          metadata: input.metadata ?? {},
        },
      })
      .returning();
    if (!row) throw new Error('Failed to upsert IVP signal snapshot');
    return row;
  },

  async listHistoricalValues(
    tenantId: string,
    termId: string,
    signalType: string,
    days = 90,
  ): Promise<number[]> {
    return withTenantContext(tenantId, async (tx) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const rows = await tx
        .select({ signalValue: ivpSignalSnapshots.signalValue })
        .from(ivpSignalSnapshots)
        .where(
          and(
            eq(ivpSignalSnapshots.tenantId, tenantId),
            eq(ivpSignalSnapshots.termId, termId),
            eq(ivpSignalSnapshots.signalType, signalType),
            gte(ivpSignalSnapshots.snapshotDate, cutoffStr),
          ),
        )
        .orderBy(desc(ivpSignalSnapshots.snapshotDate));
      return rows.map((r) => Number(r.signalValue));
    });
  },

  async listPlatformBaseline(signalType: string): Promise<number[]> {
    return withTenantContext(null, async (tx) => {
      const rows = await tx
        .select({ signalValue: ivpSignalSnapshots.signalValue })
        .from(ivpSignalSnapshots)
        .where(eq(ivpSignalSnapshots.signalType, signalType))
        .orderBy(desc(ivpSignalSnapshots.createdAt))
        .limit(500);
      return rows.map((r) => Number(r.signalValue));
    });
  },
};
