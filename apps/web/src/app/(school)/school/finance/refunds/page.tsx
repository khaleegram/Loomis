'use client';

import Link from 'next/link';
import { useAcademicTerms, useAcademicYears, useRefunds } from '@loomis/api-client';
import { Alert, AlertDescription, Button, Skeleton } from '@loomis/ui-web';
import { useState } from 'react';

import { FinanceTermContext, pickDefaultTerm, pickDefaultYear } from '@/components/finance/finance-term-context';
import { RefundApprovalTimeline } from '@/components/finance/refund-approval-timeline';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useCan, useRole } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function RefundsPage() {
  const tenantId = useTenantId();
  const role = useRole();
  const canInitiate = useCan('refund.initiate');
  const canApprove = useCan('refund.approve');
  const canView = canInitiate || canApprove || role === 'principal' || role === 'school_owner';

  const [yearId, setYearId] = useState<string | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const resolvedYearId = yearId ?? pickDefaultYear(years)?.id ?? null;

  const termsQuery = useAcademicTerms(tenantId ?? '', resolvedYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const resolvedTermId = termId ?? pickDefaultTerm(terms)?.id ?? null;

  const refundsQuery = useRefunds(tenantId ?? '', {
    ...(resolvedTermId ? { termId: resolvedTermId } : {}),
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
          <FinanceTermContext
            tenantId={tenantId}
            yearId={resolvedYearId}
            termId={resolvedTermId}
            onYearChange={(id) => {
              setYearId(id);
              setTermId(null);
            }}
            onTermChange={setTermId}
          />

          {refundsQuery.isLoading ? <Skeleton className="h-96 w-full" /> : null}
          {refundsQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>Failed to load refund requests.</AlertDescription>
            </Alert>
          ) : null}

          {!refundsQuery.isLoading ? (
            <RefundApprovalTimeline
              tenantId={tenantId}
              termId={resolvedTermId ?? ''}
              refunds={refunds}
              selectedId={selectedId ?? refunds[0]?.id ?? null}
              onSelect={setSelectedId}
              currentRole={role}
              canInitiate={canInitiate}
              canApprove={canApprove}
            />
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
