'use client';

import Link from 'next/link';
import { useAcademicTerms, useAcademicYears } from '@loomis/api-client';
import { Alert, AlertDescription, Button } from '@loomis/ui-web';
import { useState } from 'react';

import { FinanceTermContext, pickDefaultTerm, pickDefaultYear } from '@/components/finance/finance-term-context';
import { OutstandingBalancesPanel } from '@/components/finance/outstanding-balances-panel';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useCan, useRole } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function OutstandingBalancesPage() {
  const tenantId = useTenantId();
  const role = useRole();
  const canConfigure = useCan('fee.configure');
  const canView =
    canConfigure || role === 'principal' || role === 'school_owner';

  const [yearId, setYearId] = useState<string | null>(null);
  const [termId, setTermId] = useState<string | null>(null);

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const resolvedYearId = yearId ?? pickDefaultYear(years)?.id ?? null;

  const termsQuery = useAcademicTerms(tenantId ?? '', resolvedYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const resolvedTermId = termId ?? pickDefaultTerm(terms)?.id ?? null;

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Outstanding balances" />
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
        <PageHeader title="Outstanding balances" />
        <PageBody>
          <Alert>
            <AlertDescription>
              Outstanding balances are restricted to accountants and principals.
            </AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Outstanding balances"
        description="Fee charged, paid, and balance per student for the current term (US-FIN-005)."
        actions={
          <Button variant="outline" asChild size="sm">
            <Link href="/school/finance">Fee structures</Link>
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
          {resolvedTermId ? (
            <OutstandingBalancesPanel tenantId={tenantId} termId={resolvedTermId} />
          ) : (
            <Alert>
              <AlertDescription>Select a term to view outstanding balances.</AlertDescription>
            </Alert>
          )}
        </div>
      </PageBody>
    </>
  );
}
