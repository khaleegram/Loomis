'use client';

import { usePayments } from '@loomis/api-client';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { useMemo } from 'react';

import { PaymentRegisterHero } from '@/components/finance/payment-register-hero';
import { PaymentRegisterPanel } from '@/components/finance/payment-register-panel';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useAcademicOpsContext } from '@/lib/academic/use-academic-ops-context';
import { useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

export default function PaymentRegisterPage() {
  const tenantId = useTenantId();
  const canView = useCanAny(['payment.log', 'payment.verify']);
  const ctx = useAcademicOpsContext(tenantId ?? '');

  const paymentsQuery = usePayments(tenantId ?? '', {
    termId: ctx.termId ?? undefined,
  });

  const metrics = useMemo(() => {
    const payments = paymentsQuery.data?.payments ?? [];
    let verifiedCount = 0;
    let pendingCount = 0;
    let totalAmountMinor = 0;
    for (const payment of payments) {
      totalAmountMinor += payment.amountMinor;
      if (payment.status === 'verified') verifiedCount += 1;
      if (payment.status === 'pending' || payment.status === 'pending_verification') {
        pendingCount += 1;
      }
    }
    return {
      totalCount: payments.length,
      verifiedCount,
      pendingCount,
      totalAmountMinor,
    };
  }, [paymentsQuery.data]);

  if (!tenantId) {
    return (
      <PageBody className={pageClass}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canView) {
    return (
      <PageBody className={pageClass}>
        <Alert>
          <AlertDescription>You do not have permission to view the payment register.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-6">
        <div className="pb-10 sm:pb-12">
          <PaymentRegisterHero
            termLabel={ctx.activeTerm?.name ?? null}
            yearLabel={ctx.activeYear?.label ?? null}
            totalCount={metrics.totalCount}
            verifiedCount={metrics.verifiedCount}
            pendingCount={metrics.pendingCount}
            totalAmountMinor={metrics.totalAmountMinor}
            isLoading={paymentsQuery.isLoading}
          />
        </div>

        {!ctx.termId ? (
          <div className={`${ACADEMIC_UI.dataPanel} p-10 text-center`}>
            <p className="text-[15px] font-semibold text-neutral-800">No billing term selected</p>
            <p className="mt-2 text-[13px] text-neutral-500">
              Use the session bar to choose a term before opening the register.
            </p>
          </div>
        ) : (
          <PaymentRegisterPanel tenantId={tenantId} termId={ctx.termId} />
        )}
      </div>
    </PageBody>
  );
}
