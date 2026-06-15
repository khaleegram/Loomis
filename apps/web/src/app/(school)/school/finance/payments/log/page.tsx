'use client';

import { useInvoices, usePayments } from '@loomis/api-client';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { useMemo } from 'react';

import { PaymentLogForm } from '@/components/finance/payment-log-form';
import { PaymentLogHero } from '@/components/finance/payment-log-hero';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useAcademicOpsContext } from '@/lib/academic/use-academic-ops-context';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

export default function PaymentLogPage() {
  const tenantId = useTenantId();
  const canLog = useCan('payment.log');
  const ctx = useAcademicOpsContext(tenantId ?? '');

  const invoicesQuery = useInvoices(tenantId ?? '', ctx.termId ?? '');
  const pendingQuery = usePayments(tenantId ?? '', {
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

  const pendingCount = pendingQuery.data?.payments.length ?? 0;
  const isMetricsLoading = invoicesQuery.isLoading || pendingQuery.isLoading;

  if (!tenantId) {
    return (
      <PageBody className={pageClass}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canLog) {
    return (
      <PageBody className={pageClass}>
        <Alert>
          <AlertDescription>Only cashiers can log offline payments.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-6">
        <PaymentLogHero
          termLabel={ctx.activeTerm?.name ?? null}
          yearLabel={ctx.activeYear?.label ?? null}
          outstandingInvoiceCount={invoiceMetrics.count}
          totalOutstandingMinor={invoiceMetrics.totalMinor}
          studentsWithBalance={invoiceMetrics.studentsWithBalance}
          pendingVerificationCount={pendingCount}
          isLoading={isMetricsLoading}
        />

        {!ctx.termId ? (
          <div className={`${ACADEMIC_UI.dataPanel} p-10 text-center`}>
            <p className="text-[15px] font-semibold text-neutral-800">No billing term selected</p>
            <p className="mt-2 text-[13px] text-neutral-500">
              Use the session bar to choose a term before logging payments.
            </p>
          </div>
        ) : (
          <PaymentLogForm tenantId={tenantId} termId={ctx.termId} />
        )}
      </div>
    </PageBody>
  );
}
