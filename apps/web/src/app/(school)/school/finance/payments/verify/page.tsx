'use client';

import { usePayments } from '@loomis/api-client';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { useMemo } from 'react';

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

export default function PaymentVerifyPage() {
  const tenantId = useTenantId();
  const canVerify = useCan('payment.verify');
  const { session } = useAuth();
  const currentUserId = session ? getUserIdFromAccessToken(session.accessToken) : null;
  const ctx = useAcademicOpsContext(tenantId ?? '');

  const paymentsQuery = usePayments(tenantId ?? '', {
    termId: ctx.termId ?? undefined,
    status: 'pending_verification',
    channel: 'offline',
  });

  const queueMetrics = useMemo(() => {
    const payments = paymentsQuery.data?.payments ?? [];
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
  }, [paymentsQuery.data, currentUserId]);

  if (!tenantId) {
    return (
      <PageBody className={pageClass}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canVerify) {
    return (
      <PageBody className={pageClass}>
        <Alert>
          <AlertDescription>Only accountants can verify offline payments.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-6">
        <PaymentVerifyHero
          termLabel={ctx.activeTerm?.name ?? null}
          yearLabel={ctx.activeYear?.label ?? null}
          pendingCount={queueMetrics.pendingCount}
          pendingAmountMinor={queueMetrics.pendingAmountMinor}
          actionableCount={queueMetrics.actionableCount}
          blockedBySelfCount={queueMetrics.blockedBySelfCount}
          isLoading={paymentsQuery.isLoading}
        />

        {!ctx.termId ? (
          <div className={`${ACADEMIC_UI.dataPanel} p-10 text-center`}>
            <p className="text-[15px] font-semibold text-neutral-800">No billing term selected</p>
            <p className="mt-2 text-[13px] text-neutral-500">
              Use the session bar to choose a term before opening the verification queue.
            </p>
          </div>
        ) : (
          <>
            <SodNotice compact highlight="Verify payment" />
            <PaymentVerifyQueue
              tenantId={tenantId}
              termId={ctx.termId}
              currentUserId={currentUserId}
            />
          </>
        )}
      </div>
    </PageBody>
  );
}
