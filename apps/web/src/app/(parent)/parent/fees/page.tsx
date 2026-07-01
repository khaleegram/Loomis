'use client';

import {
  useAcademicTerms,
  useAcademicYears,
  useHackathonResetDemoFees,
  useInitializeOnlinePayment,
  useMyProfile,
  useParentDashboard,
  useParentFees,
  useParentPayments,
} from '@loomis/api-client';
import type { OnlinePaymentMethod, ParentChildCardResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';
import { useEffect, useState } from 'react';

import { ParentPaymentHistory } from '@/components/finance/parent-payment-history';
import { ParentFeesHero } from '@/components/parent/parent-fees-hero';
import { ParentFeesInvoicePanel } from '@/components/parent/parent-fees-invoice-panel';
import { ParentFeesPaymentHub } from '@/components/parent/parent-fees-payment-hub';
import { ParentFeesScopeBar } from '@/components/parent/parent-fees-scope-bar';
import { ParentHackathonResetPanel } from '@/components/parent/parent-hackathon-reset-panel';
import { PageBody } from '@/components/parent/parent-shell';
import { useAuth } from '@/lib/auth/auth-context';
import { financeErrorMessage } from '@/lib/finance/finance-errors';
import { useActiveTenantStore } from '@/lib/tenant/active-tenant-store';
import { parentChildName } from '@/lib/student/parent-child-labels';
import { formatKobo } from '@loomis/core';

function pickOpenTermId(terms: { id: string; status: string }[]): string | null {
  return (
    terms.find((term) => term.status === 'open')?.id ??
    terms.find((term) => term.status === 'census_locked')?.id ??
    terms[0]?.id ??
    null
  );
}

function ParentFeesView() {
  const { session } = useAuth();
  const setActiveTenantId = useActiveTenantStore((s) => s.setActiveTenantId);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payAmountMinor, setPayAmountMinor] = useState(0);
  const [payAhead, setPayAhead] = useState(false);
  const [payMethod, setPayMethod] = useState<OnlinePaymentMethod>('card');

  const dashboardQuery = useParentDashboard();
  const profileQuery = useMyProfile();
  const cards = dashboardQuery.data?.cards ?? [];
  const [selectedCard, setSelectedCard] = useState<ParentChildCardResponse | null>(null);
  const activeCard = selectedCard ?? cards[0] ?? null;
  const childName = activeCard ? parentChildName(activeCard) : 'your child';

  useEffect(() => {
    if (activeCard?.tenantId) {
      setActiveTenantId(activeCard.tenantId);
    }
  }, [activeCard?.tenantId, setActiveTenantId]);

  const yearsQuery = useAcademicYears(activeCard?.tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(activeCard?.tenantId ?? '', activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const resolvedTermId = termId ?? pickOpenTermId(terms);
  const termLabel = terms.find((t) => t.id === resolvedTermId)?.name ?? null;

  const feesQuery = useParentFees(
    activeCard?.tenantId ?? '',
    activeCard?.studentId ?? null,
    resolvedTermId,
  );
  const paymentsQuery = useParentPayments(
    activeCard?.tenantId ?? '',
    activeCard?.studentId ?? null,
    resolvedTermId,
  );
  const initializePayment = useInitializeOnlinePayment(
    activeCard?.tenantId ?? '',
    resolvedTermId ?? '',
    activeCard?.studentId ?? '',
  );
  const hackathonReset = useHackathonResetDemoFees(activeCard?.tenantId ?? '');

  const fees = feesQuery.data;
  const isLoading = dashboardQuery.isLoading || feesQuery.isLoading;
  const payerEmail = profileQuery.data?.email ?? '';
  const totalOwed = fees?.totalBalanceMinor ?? fees?.balanceMinor ?? 0;
  const creditBalanceMinor = fees?.creditBalanceMinor ?? 0;
  const payAheadActive = payAhead || payAmountMinor > totalOwed;

  useEffect(() => {
    if (fees && totalOwed > 0) {
      setPayAmountMinor(totalOwed);
    } else {
      setPayAmountMinor(0);
    }
  }, [fees?.invoiceId, fees?.balanceMinor, fees?.totalBalanceMinor, totalOwed]);

  async function handlePayOnline() {
    if (!activeCard?.studentId || !payerEmail || payAmountMinor <= 0) return;
    if (totalOwed <= 0 && !payAheadActive) return;
    if (!payAheadActive && payAmountMinor > totalOwed) return;
    setPayError(null);
    setPaying(true);
    try {
      const result = await initializePayment.mutateAsync({
        studentId: activeCard.studentId,
        payAllOwed: true,
        payAhead: payAheadActive,
        amountMinor: payAmountMinor,
        payerEmail,
        provider: 'paystack',
        method: payMethod,
        clientPlatform: 'web',
      });
      window.location.assign(result.authorizationUrl);
    } catch (err) {
      setPayError(financeErrorMessage(err));
      setPaying(false);
    }
  }

  if (session?.role !== 'parent') {
    return (
      <Alert>
        <AlertDescription>This page is for parent accounts linked to children.</AlertDescription>
      </Alert>
    );
  }

  if (dashboardQuery.isLoading) {
    return <Skeleton className="h-80 w-full rounded-2xl" />;
  }

  if (cards.length === 0) {
    return (
      <Alert>
        <AlertDescription>No linked children found. Accept a school invitation to view fees.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <ParentFeesHero
        childName={activeCard ? parentChildName(activeCard) : null}
        schoolName={activeCard?.schoolName ?? null}
        termLabel={termLabel}
        classLabel={fees?.classArmLabel ?? activeCard?.classArmLabel ?? null}
        amountChargedMinor={fees?.amountChargedMinor ?? 0}
        amountPaidMinor={fees?.amountPaidMinor ?? 0}
        balanceMinor={fees?.balanceMinor ?? 0}
        arrearsBalanceMinor={fees?.arrearsBalanceMinor ?? 0}
        totalBalanceMinor={fees?.totalBalanceMinor ?? fees?.balanceMinor ?? activeCard?.outstandingBalanceMinor ?? 0}
        creditBalanceMinor={creditBalanceMinor}
        isLoading={isLoading}
        bankTransferMode={fees?.virtualAccountEnabled ?? false}
      />

      <ParentFeesScopeBar
        cards={cards}
        activeStudentId={activeCard?.studentId ?? null}
        onSelectChild={(studentId) => {
          const card = cards.find((item) => item.studentId === studentId) ?? null;
          setSelectedCard(card);
          setTermId(null);
        }}
        terms={terms}
        termId={resolvedTermId}
        onSelectTerm={setTermId}
      />

      {creditBalanceMinor > 0 ? (
        <Alert className="border-accent-green-200/80 bg-accent-green-50/50">
          <AlertDescription className="text-[13px] text-neutral-700">
            <strong className="font-semibold text-neutral-900">{formatKobo(creditBalanceMinor)}</strong> pay-ahead
            credit on {childName}&apos;s account — applies automatically to the next invoice.
          </AlertDescription>
        </Alert>
      ) : null}

      {feesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Failed to load fee status. Try again shortly.</AlertDescription>
        </Alert>
      ) : null}

      <ParentFeesPaymentHub
        fees={fees}
        childName={childName}
        isLoading={feesQuery.isLoading}
        isRetryingVa={feesQuery.isFetching && !feesQuery.isLoading}
        onRetryVa={() => void feesQuery.refetch()}
        totalOwed={totalOwed}
        payAmountMinor={payAmountMinor}
        onPayAmountChange={setPayAmountMinor}
        payAhead={payAhead}
        onPayAheadChange={setPayAhead}
        payAheadActive={payAheadActive}
        payMethod={payMethod}
        onPayMethodChange={setPayMethod}
        payerEmail={payerEmail}
        paying={paying}
        payError={payError}
        onPayOnline={() => void handlePayOnline()}
        isPayPending={initializePayment.isPending}
      />

      <ParentFeesInvoicePanel
        fees={fees}
        termLabel={termLabel}
        totalOwed={totalOwed}
        isLoading={feesQuery.isLoading}
        onStartPayAhead={() => setPayAhead(true)}
        onlinePaymentEnabled={fees?.onlinePaymentEnabled ?? false}
        bankTransferMode={fees?.virtualAccountEnabled ?? false}
      />

      {resolvedTermId && activeCard?.studentId ? (
        <ParentPaymentHistory
          tenantId={activeCard.tenantId}
          payments={paymentsQuery.data?.payments ?? []}
          isLoading={paymentsQuery.isLoading}
        />
      ) : null}

      {fees?.hackathonDemoResetEnabled && activeCard?.studentId && resolvedTermId ? (
        <ParentHackathonResetPanel
          childName={childName}
          demoFeeMinor={15_000}
          isResetting={hackathonReset.isPending}
          onReset={async () => {
            await hackathonReset.mutateAsync({
              studentId: activeCard.studentId,
              termId: resolvedTermId,
            });
          }}
        />
      ) : null}
    </div>
  );
}

export default function FeesPage() {
  return (
    <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
      <ParentFeesView />
    </PageBody>
  );
}
