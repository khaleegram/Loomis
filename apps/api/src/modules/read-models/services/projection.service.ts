import { and, desc, eq } from 'drizzle-orm';
import { invoices } from '../../../../drizzle/schema/finance.js';
import { tenants } from '../../../../drizzle/schema/tenant.js';
import {
  parentIdentities,
  parentLinks,
  students,
} from '../../../../drizzle/schema/student.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import {
  parentDashboardRepository,
  regionalAnalyticsRepository,
} from '../repository/index.js';

interface OutboxEnvelope {
  event_id: string;
  payload: Record<string, unknown>;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadParentUserId(
  tenantId: string,
  parentIdentityId: string,
): Promise<string | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select({ userId: parentIdentities.userId })
      .from(parentIdentities)
      .where(eq(parentIdentities.id, parentIdentityId))
      .limit(1);
    return row?.userId ?? null;
  });
}

async function loadTenantRegion(tenantId: string): Promise<{ name: string; region: string } | null> {
  return withTenantContext(null, async (tx) => {
    const [row] = await tx
      .select({ name: tenants.name, region: tenants.region })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    return row ?? null;
  });
}

export const readModelProjectionService = {
  async handleParentLinkVerified(event: OutboxEnvelope): Promise<void> {
    const payload = event.payload as {
      tenantId: string;
      parentIdentityId: string;
      studentId: string;
    };

    const parentUserId = await loadParentUserId(payload.tenantId, payload.parentIdentityId);
    if (!parentUserId) return;

    await withTenantContext(payload.tenantId, async (tx) => {
      const claimed = await parentDashboardRepository.claimEvent(
        tx,
        event.event_id,
        'parent.link.verified',
      );
      if (!claimed) return;

      const [student] = await tx
        .select({ firstName: students.firstName })
        .from(students)
        .where(eq(students.id, payload.studentId))
        .limit(1);
      if (!student) return;

      const tenant = await loadTenantRegion(payload.tenantId);
      if (!tenant) return;

      const [balanceRow] = await tx
        .select({ total: invoices.balanceMinor })
        .from(invoices)
        .where(
          and(eq(invoices.tenantId, payload.tenantId), eq(invoices.studentId, payload.studentId)),
        )
        .orderBy(desc(invoices.issuedAt))
        .limit(1);

      await parentDashboardRepository.upsertCard(tx, {
        parentUserId,
        tenantId: payload.tenantId,
        studentId: payload.studentId,
        schoolName: tenant.name,
        studentFirstName: student.firstName,
        linkStatus: 'active',
        outstandingBalanceMinor: balanceRow?.total ?? 0,
      });
    });
  },

  async handleStudentEnrolled(event: OutboxEnvelope): Promise<void> {
    const payload = event.payload as {
      tenantId: string;
      studentId: string;
      classArmId: string;
    };

    await withTenantContext(payload.tenantId, async (tx) => {
      const claimed = await parentDashboardRepository.claimEvent(
        tx,
        event.event_id,
        'student.enrolled',
      );
      if (!claimed) return;

      const links = await tx
        .select({ parentIdentityId: parentLinks.parentIdentityId })
        .from(parentLinks)
        .where(
          and(
            eq(parentLinks.tenantId, payload.tenantId),
            eq(parentLinks.studentId, payload.studentId),
            eq(parentLinks.status, 'active'),
          ),
        );

      for (const link of links) {
        const parentUserId = await loadParentUserId(payload.tenantId, link.parentIdentityId);
        if (!parentUserId) continue;

        const [student] = await tx
          .select({ firstName: students.firstName })
          .from(students)
          .where(eq(students.id, payload.studentId))
          .limit(1);
        if (!student) continue;

        const tenant = await loadTenantRegion(payload.tenantId);
        if (!tenant) continue;

        await parentDashboardRepository.upsertCard(tx, {
          parentUserId,
          tenantId: payload.tenantId,
          studentId: payload.studentId,
          schoolName: tenant.name,
          studentFirstName: student.firstName,
          classArmLabel: payload.classArmId.slice(0, 8),
        });
      }
    });
  },

  async handlePaymentVerified(event: OutboxEnvelope): Promise<void> {
    const payload = event.payload as {
      tenantId: string;
      studentId: string;
      amountMinor: number;
    };

    const snapshotDate = todayDate();

    await withTenantContext(payload.tenantId, async (tx) => {
      const claimed = await parentDashboardRepository.claimEvent(
        tx,
        event.event_id,
        'payment.verified',
      );
      if (!claimed) return;

      const [balanceRow] = await tx
        .select({ total: invoices.balanceMinor })
        .from(invoices)
        .where(
          and(eq(invoices.tenantId, payload.tenantId), eq(invoices.studentId, payload.studentId)),
        )
        .orderBy(desc(invoices.issuedAt))
        .limit(1);

      if (balanceRow) {
        await parentDashboardRepository.updateBalance(
          tx,
          payload.tenantId,
          payload.studentId,
          balanceRow.total,
        );
      }

      const tenant = await loadTenantRegion(payload.tenantId);
      if (!tenant) return;

      await regionalAnalyticsRepository.upsertSnapshot(tx, {
        tenantId: payload.tenantId,
        region: tenant.region,
        snapshotDate,
      });
      await regionalAnalyticsRepository.incrementFeeCollected(
        tx,
        payload.tenantId,
        snapshotDate,
        payload.amountMinor,
      );
    });
  },

  async handleTermCensusLocked(event: OutboxEnvelope): Promise<void> {
    const payload = event.payload as {
      tenantId: string;
      systemBillableCount: number;
    };

    const snapshotDate = todayDate();
    const tenant = await loadTenantRegion(payload.tenantId);
    if (!tenant) return;

    await withTenantContext(payload.tenantId, async (tx) => {
      const claimed = await parentDashboardRepository.claimEvent(
        tx,
        event.event_id,
        'academic.term.census_locked',
      );
      if (!claimed) return;

      await regionalAnalyticsRepository.upsertSnapshot(tx, {
        tenantId: payload.tenantId,
        region: tenant.region,
        snapshotDate,
        totalStudents: payload.systemBillableCount,
        activeEnrollments: payload.systemBillableCount,
      });
    });
  },
};
