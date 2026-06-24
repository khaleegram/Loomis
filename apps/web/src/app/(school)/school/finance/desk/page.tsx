'use client';

import { useInvoices, usePayments } from '@loomis/api-client';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { useMemo } from 'react';

import { PaymentLogForm } from '@/components/finance/payment-log-form';
import { PaymentLogHero } from '@/components/finance/payment-log-hero';
import { PaymentVerifyHero } from '@/components/finance/payment-verify-hero';
import { PaymentVerifyQueue } from '@/components/finance/payment-verify-queue';
import { PageBody } from '@/components/school/school-shell';
import { SodNotice } from '@/components/school/sod-notice';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useAcademicOpsContext } from '@/lib/academic/use-academic-ops-context';
import { useAuth } from '@/lib/auth/auth-context';
import { getUserIdFromAccessToken } from '@/lib/auth/user-id';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

/** Combined finance desk — log (cashier) and verify (accountant) on one operational page. */
export default function FinanceDeskPage() {
  const tenantId = useTenantId();
  const canLog = useCan('payment.log');
  const canVerify = useCan('payment.verify');
  const { session } = useAuth();
  const currentUserId = session ? getUserIdFromAccessToken(session.accessToken) : null;
  const ctx = useAcademicOpsContext(tenantId ?? '');

  const invoicesQuery = useInvoices(tenantId ?? '', ctx.termId ?? '');
  const pendingQuery = usePayments(tenantId ?? '', {
    termId: ctx.termId ?? undefined,
    status: 'pending_verification',
    channel: 'offline',
  });
  const verifyQuery = usePayments(tenantId ?? '', {
    termId: ctx.termId ?? undefined,
    status: 'pending_verification',
    channel: 'offline',
  });

  const invoiceMetrics = useMemo(() => {
    const open = (invoicesQuery.data?.invoices ?? []).filter(
      (inv) => inv.status !== 'void' && inv.balanceMinor > 0,
    );
    const studentIds = new Set(open.map((inv) => inv.studentId));
    return {
      count: open.length,
      totalMinor: open.reduce((sum, inv) => sum + inv.balanceMinor, 0),
      studentsWithBalance: studentIds.size,
    };
  }, [invoicesQuery.data]);

  const queueMetrics = useMemo(() => {
    const payments = verifyQuery.data?.payments ?? [];
    let blockedBySelfCount = 0;
    let actionableCount = 0;
    let pendingAmountMinor = 0;
    for (const payment of payments) {
      pendingAmountMinor += payment.amountMinor;
      if (currentUserId !== null && payment.loggedById === currentUserId) {
        blockedBySelfCount += 1;
      } else {
        actionableCount += 1;
      }
    }
    return {
      pendingCount: payments.length,
      pendingAmountMinor,
      actionableCount,
      blockedBySelfCount,
    };
  }, [verifyQuery.data, currentUserId]);

  if (!tenantId) {
    return (
      <PageBody className={pageClass}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canLog && !canVerify) {
    return (
      <PageBody className={pageClass}>
        <Alert>
          <AlertDescription>You do not have permission to use the finance desk.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-8">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>School finance</p>
          <h1
            className="text-neutral-900"
            style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em' }}
          >
            Finance desk
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Log offline payments and verify the cashier queue — same term as the session bar.
          </p>
        </div>

        {!ctx.termId ? (
          <div className={`${ACADEMIC_UI.dataPanel} p-10 text-center`}>
            <p className="text-[15px] font-semibold text-neutral-800">No billing term selected</p>
            <p className="mt-2 text-[13px] text-neutral-500">
              Use the session bar to choose a term before working on payments.
            </p>
          </div>
        ) : (
          <>
            {canVerify ? (
              <section className="space-y-4">
                <PaymentVerifyHero
                  termLabel={ctx.activeTerm?.name ?? null}
                  yearLabel={ctx.activeYear?.label ?? null}
                  pendingCount={queueMetrics.pendingCount}
                  pendingAmountMinor={queueMetrics.pendingAmountMinor}
                  actionableCount={queueMetrics.actionableCount}
                  blockedBySelfCount={queueMetrics.blockedBySelfCount}
                  isLoading={verifyQuery.isLoading}
                />
                <SodNotice compact highlight="Verify payment" />
                <PaymentVerifyQueue
                  tenantId={tenantId}
                  termId={ctx.termId}
                  currentUserId={currentUserId}
                />
              </section>
            ) : null}

            {canLog ? (
              <section className="space-y-4">
                <PaymentLogHero
                  termLabel={ctx.activeTerm?.name ?? null}
                  yearLabel={ctx.activeYear?.label ?? null}
                  outstandingInvoiceCount={invoiceMetrics.count}
                  totalOutstandingMinor={invoiceMetrics.totalMinor}
                  studentsWithBalance={invoiceMetrics.studentsWithBalance}
                  pendingVerificationCount={pendingQuery.data?.payments.length ?? 0}
                  isLoading={invoicesQuery.isLoading || pendingQuery.isLoading}
                />
                <PaymentLogForm tenantId={tenantId} termId={ctx.termId} />
              </section>
            ) : null}
          </>
        )}
      </div>
    </PageBody>
  );
}
