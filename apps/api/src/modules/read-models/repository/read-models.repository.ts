import { and, eq, sql } from 'drizzle-orm';
import {
  parentChildCards,
  readModelProcessedEvents,
  regionalTenantAnalytics,
} from '../../../../drizzle/schema/read-models.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const parentDashboardRepository = {
  async claimEvent(tx: Executor, eventId: string, eventType: string): Promise<boolean> {
    const [row] = await tx
      .insert(readModelProcessedEvents)
      .values({ eventId, eventType })
      .onConflictDoNothing()
      .returning({ id: readModelProcessedEvents.id });
    return Boolean(row);
  },

  async upsertCard(
    tx: Executor,
    input: {
      parentUserId: string;
      tenantId: string;
      studentId: string;
      schoolName: string;
      studentFirstName: string;
      classArmLabel?: string | null;
      linkStatus?: string;
      outstandingBalanceMinor?: number;
    },
  ) {
    const [row] = await tx
      .insert(parentChildCards)
      .values({
        parentUserId: input.parentUserId,
        tenantId: input.tenantId,
        studentId: input.studentId,
        schoolName: input.schoolName,
        studentFirstName: input.studentFirstName,
        classArmLabel: input.classArmLabel ?? null,
        linkStatus: input.linkStatus ?? 'active',
        outstandingBalanceMinor: input.outstandingBalanceMinor ?? 0,
        lastRefreshedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          parentChildCards.parentUserId,
          parentChildCards.tenantId,
          parentChildCards.studentId,
        ],
        set: {
          schoolName: input.schoolName,
          studentFirstName: input.studentFirstName,
          classArmLabel: input.classArmLabel ?? null,
          linkStatus: input.linkStatus ?? 'active',
          ...(input.outstandingBalanceMinor !== undefined
            ? { outstandingBalanceMinor: input.outstandingBalanceMinor }
            : {}),
          lastRefreshedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();
    return row ?? null;
  },

  async updateBalance(
    tx: Executor,
    tenantId: string,
    studentId: string,
    outstandingBalanceMinor: number,
  ) {
    await tx
      .update(parentChildCards)
      .set({ outstandingBalanceMinor, lastRefreshedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(parentChildCards.tenantId, tenantId),
          eq(parentChildCards.studentId, studentId),
        ),
      );
  },

  async updateAttendanceSummary(
    tx: Executor,
    tenantId: string,
    studentId: string,
    attendanceSummary: { presentCount: number; totalCount: number; lastStatus: string | null },
  ) {
    await tx
      .update(parentChildCards)
      .set({ attendanceSummary, lastRefreshedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(parentChildCards.tenantId, tenantId),
          eq(parentChildCards.studentId, studentId),
        ),
      );
  },

  async setLinkStatus(
    tx: Executor,
    parentUserId: string,
    tenantId: string,
    studentId: string,
    linkStatus: string,
  ) {
    await tx
      .update(parentChildCards)
      .set({ linkStatus, lastRefreshedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(parentChildCards.parentUserId, parentUserId),
          eq(parentChildCards.tenantId, tenantId),
          eq(parentChildCards.studentId, studentId),
        ),
      );
  },

  async listForParent(parentUserId: string) {
    return withTenantContext(null, async (tx) =>
      tx
        .select()
        .from(parentChildCards)
        .where(
          and(
            eq(parentChildCards.parentUserId, parentUserId),
            eq(parentChildCards.linkStatus, 'active'),
          ),
        )
        .orderBy(parentChildCards.schoolName, parentChildCards.studentFirstName),
    );
  },
};

export const regionalAnalyticsRepository = {
  async upsertSnapshot(
    tx: Executor,
    input: {
      tenantId: string;
      region: string;
      snapshotDate: string;
      totalStudents?: number;
      activeEnrollments?: number;
      feeCollectedMinor?: number;
      feeCollectionRateMilli?: number;
      psfCollectedMinor?: number;
    },
  ) {
    const [row] = await tx
      .insert(regionalTenantAnalytics)
      .values({
        tenantId: input.tenantId,
        region: input.region,
        snapshotDate: input.snapshotDate,
        totalStudents: input.totalStudents ?? 0,
        activeEnrollments: input.activeEnrollments ?? 0,
        feeCollectedMinor: input.feeCollectedMinor ?? 0,
        feeCollectionRateMilli: input.feeCollectionRateMilli ?? 0,
        psfCollectedMinor: input.psfCollectedMinor ?? 0,
      })
      .onConflictDoUpdate({
        target: [regionalTenantAnalytics.tenantId, regionalTenantAnalytics.snapshotDate],
        set: {
          ...(input.totalStudents !== undefined ? { totalStudents: input.totalStudents } : {}),
          ...(input.activeEnrollments !== undefined
            ? { activeEnrollments: input.activeEnrollments }
            : {}),
          ...(input.feeCollectedMinor !== undefined
            ? { feeCollectedMinor: input.feeCollectedMinor }
            : {}),
          ...(input.feeCollectionRateMilli !== undefined
            ? { feeCollectionRateMilli: input.feeCollectionRateMilli }
            : {}),
          ...(input.psfCollectedMinor !== undefined
            ? { psfCollectedMinor: input.psfCollectedMinor }
            : {}),
          updatedAt: new Date(),
        },
      })
      .returning();
    return row ?? null;
  },

  async incrementFeeCollected(tx: Executor, tenantId: string, snapshotDate: string, amountMinor: number) {
    await tx
      .update(regionalTenantAnalytics)
      .set({
        feeCollectedMinor: sql`${regionalTenantAnalytics.feeCollectedMinor} + ${amountMinor}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(regionalTenantAnalytics.tenantId, tenantId),
          eq(regionalTenantAnalytics.snapshotDate, snapshotDate),
        ),
      );
  },

  async listForSnapshot(snapshotDate: string) {
    return withTenantContext(null, async (tx) =>
      tx
        .select()
        .from(regionalTenantAnalytics)
        .where(eq(regionalTenantAnalytics.snapshotDate, snapshotDate))
        .orderBy(regionalTenantAnalytics.region, regionalTenantAnalytics.tenantId),
    );
  },

  async listByRegion(region: string, snapshotDate: string) {
    return withTenantContext(null, async (tx) =>
      tx
        .select()
        .from(regionalTenantAnalytics)
        .where(
          and(
            eq(regionalTenantAnalytics.region, region),
            eq(regionalTenantAnalytics.snapshotDate, snapshotDate),
          ),
        )
        .orderBy(regionalTenantAnalytics.tenantId),
    );
  },
};
