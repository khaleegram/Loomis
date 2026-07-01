import { and, eq, inArray } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import {
  invoiceItems,
  invoices,
  payments,
  receipts,
  reconciliationExceptions,
  refundRequests,
  studentFeeCredits,
  webhookEvents,
} from '../../../../drizzle/schema/finance.js';
import { psfSettlements } from '../../../../drizzle/schema/ledger.js';
import { getEnv } from '../../../config/env.js';
import type { DbTransaction } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { LoomisError } from '../../../shared/errors.js';
import { parentDashboardRepository } from '../../read-models/repository/index.js';
import { assertParentPortalAccess } from '../../student/services/parent-portal-access.js';
import type { ActorContext } from '../../student/types.js';

/** Nomba sandbox max per transfer — hackathon demo fee (₦150). */
export const HACKATHON_DEMO_FEE_MINOR = 15_000;

export function isHackathonDemoResetEnabled(): boolean {
  return getEnv().HACKATHON_DEMO_RESET_ENABLED === true;
}

async function resetStudentFeesInTx(
  tx: DbTransaction,
  tenantId: string,
  studentId: string,
  termId: string,
): Promise<{ invoiceId: string; balanceMinor: number }> {
  const [found] = await tx
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.termId, termId),
        eq(invoices.studentId, studentId),
      ),
    )
    .limit(1);
  if (!found) {
    throw new LoomisError(
      'FINANCE_INVOICE_NOT_FOUND',
      404,
      'No invoice for this student and term — issue one before resetting demo fees',
    );
  }

  const invoiceId = found.id;
  const paymentRows = await tx
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.invoiceId, invoiceId)));
  const paymentIds = paymentRows.map((row) => row.id);

  if (paymentIds.length > 0) {
    await tx.delete(refundRequests).where(inArray(refundRequests.paymentId, paymentIds));
    await tx
      .update(reconciliationExceptions)
      .set({ paymentId: null, updatedAt: new Date() })
      .where(inArray(reconciliationExceptions.paymentId, paymentIds));
    await tx.delete(receipts).where(inArray(receipts.paymentId, paymentIds));
    await tx
      .update(webhookEvents)
      .set({ paymentId: null })
      .where(inArray(webhookEvents.paymentId, paymentIds));
    await tx.delete(psfSettlements).where(inArray(psfSettlements.paymentId, paymentIds));
    await tx.delete(payments).where(inArray(payments.id, paymentIds));
  }

  await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  await tx.insert(invoiceItems).values({
    id: uuidv7(),
    tenantId,
    invoiceId,
    name: 'Hackathon demo fee',
    category: 'tuition',
    amountMinor: HACKATHON_DEMO_FEE_MINOR,
    sortOrder: 0,
  });

  await tx
    .update(invoices)
    .set({
      amountChargedMinor: HACKATHON_DEMO_FEE_MINOR,
      amountPaidMinor: 0,
      balanceMinor: HACKATHON_DEMO_FEE_MINOR,
      status: 'issued',
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId)));

  await tx
    .insert(studentFeeCredits)
    .values({
      tenantId,
      studentId,
      balanceMinor: 0,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [studentFeeCredits.tenantId, studentFeeCredits.studentId],
      set: { balanceMinor: 0, updatedAt: new Date() },
    });

  await parentDashboardRepository.updateBalance(tx, tenantId, studentId, HACKATHON_DEMO_FEE_MINOR);

  return { invoiceId, balanceMinor: HACKATHON_DEMO_FEE_MINOR };
}

export const hackathonDemoService = {
  HACKATHON_DEMO_FEE_MINOR,

  isEnabled: isHackathonDemoResetEnabled,

  /** Script / seed entry — no parent auth. */
  async resetStudentFeesInternal(tenantId: string, studentId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) =>
      resetStudentFeesInTx(tx, tenantId, studentId, termId),
    );
  },

  /** Parent hackathon button — clears payments and sets ₦150 owed for the selected term. */
  async resetLinkedChildFees(
    tenantId: string,
    studentId: string,
    termId: string,
    actor: ActorContext,
  ) {
    if (!isHackathonDemoResetEnabled()) {
      throw new LoomisError(
        'FORBIDDEN',
        403,
        'Hackathon demo reset is not enabled on this environment',
      );
    }

    await assertParentPortalAccess(tenantId, studentId, actor, { termId });

    const result = await withTenantContext(tenantId, async (tx) =>
      resetStudentFeesInTx(tx, tenantId, studentId, termId),
    );

    return {
      studentId,
      termId,
      invoiceId: result.invoiceId,
      amountChargedMinor: HACKATHON_DEMO_FEE_MINOR,
      amountPaidMinor: 0,
      balanceMinor: result.balanceMinor,
      creditBalanceMinor: 0,
    };
  },
};
