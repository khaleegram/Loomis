'use client';

import Link from 'next/link';
import { useRefunds } from '@loomis/api-client';
import { Alert, AlertDescription, Button, Skeleton } from '@loomis/ui-web';
import { useState } from 'react';

import { RefundApprovalTimeline } from '@/components/finance/refund-approval-timeline';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { SodNotice } from '@/components/school/sod-notice';
import { useSchoolAcademic } from '@/lib/academic/school-academic-context';
import { useCan, useRole } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function RefundsPage() {
  const tenantId = useTenantId();
  const role = useRole();
  const canInitiate = useCan('refund.initiate');
  const canApprove = useCan('refund.approve');
  const canView = canInitiate || canApprove || role === 'principal' || role === 'school_owner';
  const { termId } = useSchoolAcademic();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refundsQuery = useRefunds(tenantId ?? '', {
    ...(termId ? { termId } : {}),
  });
  const refunds = refundsQuery.data?.refunds ?? [];

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Refunds" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>No tenant context.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  if (!canView) {
    return (
      <>
        <PageHeader title="Refunds" />
        <PageBody>
          <Alert>
            <AlertDescription>You do not have permission to view refund requests.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Refund approvals"
        description="Timeline-first refund workflow with embedded ledger vouchers (US-FIN-006)."
        actions={
          <Button variant="outline" asChild size="sm">
            <Link href="/school/finance">Finance hub</Link>
          </Button>
        }
      />
      <PageBody>
        <div className="space-y-6">
          {!termId ? (
            <Alert>
              <AlertDescription>
                No billing term selected. Use the session bar to choose a term.
              </AlertDescription>
            </Alert>
          ) : null}

          {refundsQuery.isLoading ? <Skeleton className="h-96 w-full" /> : null}
          {refundsQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>Failed to load refund requests.</AlertDescription>
            </Alert>
          ) : null}

          {!refundsQuery.isLoading && termId ? (
            <>
              <SodNotice compact highlight="Approve refund" />
              <RefundApprovalTimeline
                tenantId={tenantId}
                termId={termId}
                refunds={refunds}
                selectedId={selectedId ?? refunds[0]?.id ?? null}
                onSelect={setSelectedId}
                currentRole={role}
                canInitiate={canInitiate}
                canApprove={canApprove}
              />
            </>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
