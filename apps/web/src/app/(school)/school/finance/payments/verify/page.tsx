'use client';

import Link from 'next/link';
import { useAcademicTerms, useAcademicYears } from '@loomis/api-client';
import { Alert, AlertDescription, Button } from '@loomis/ui-web';
import { useState } from 'react';

import { FinanceTermContext, pickDefaultTerm, pickDefaultYear } from '@/components/finance/finance-term-context';
import { PaymentVerifyQueue } from '@/components/finance/payment-verify-queue';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useAuth } from '@/lib/auth/auth-context';
import { getUserIdFromAccessToken } from '@/lib/auth/user-id';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function PaymentVerifyPage() {
  const tenantId = useTenantId();
  const canVerify = useCan('payment.verify');
  const { session } = useAuth();
  const currentUserId = session ? getUserIdFromAccessToken(session.accessToken) : null;

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
        <PageHeader title="Verify payments" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>No tenant context.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  if (!canVerify) {
    return (
      <>
        <PageHeader title="Verify payments" />
        <PageBody>
          <Alert>
            <AlertDescription>Only accountants can verify offline payments.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Verify payments"
        description="Reconcile offline payments against bank records (US-FIN-003)."
        actions={
          <Button variant="outline" asChild size="sm">
            <Link href="/school/finance/payments/log">Log payment</Link>
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
            <PaymentVerifyQueue
              tenantId={tenantId}
              termId={resolvedTermId}
              currentUserId={currentUserId}
            />
          ) : (
            <Alert>
              <AlertDescription>Select a term to view the verification queue.</AlertDescription>
            </Alert>
          )}
        </div>
      </PageBody>
    </>
  );
}
