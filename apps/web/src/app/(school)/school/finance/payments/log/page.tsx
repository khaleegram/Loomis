'use client';

import Link from 'next/link';
import { useAcademicTerms, useAcademicYears } from '@loomis/api-client';
import { Alert, AlertDescription, Button } from '@loomis/ui-web';
import { useState } from 'react';

import { FinanceTermContext, pickDefaultTerm, pickDefaultYear } from '@/components/finance/finance-term-context';
import { PaymentLogForm } from '@/components/finance/payment-log-form';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function PaymentLogPage() {
  const tenantId = useTenantId();
  const canLog = useCan('payment.log');

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
        <PageHeader title="Log payment" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>No tenant context.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  if (!canLog) {
    return (
      <>
        <PageHeader title="Log payment" />
        <PageBody>
          <Alert>
            <AlertDescription>Only cashiers can log offline payments.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Log offline payment"
        description="Record cash or bank payments and issue a provisional receipt (US-FIN-002)."
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
            <PaymentLogForm tenantId={tenantId} termId={resolvedTermId} />
          ) : (
            <Alert>
              <AlertDescription>Select a term to log payments against.</AlertDescription>
            </Alert>
          )}
        </div>
      </PageBody>
    </>
  );
}
