'use client';

import {
  useAcademicTerms,
  useAcademicYears,
  useInitializeOnlinePayment,
  useMyProfile,
  useParentDashboard,
  useParentFees,
  useParentPayments,
} from '@loomis/api-client';
import type { OnlinePaymentMethod, ParentChildCardResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Badge,
  CurrencyInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@loomis/ui-web';
import { Banknote, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ParentFeesHero } from '@/components/parent/parent-fees-hero';
import { ParentVirtualAccountSection } from '@/components/parent/parent-virtual-account-section';
import { ParentPaymentHistory } from '@/components/finance/parent-payment-history';
import { PageBody } from '@/components/parent/parent-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useAuth } from '@/lib/auth/auth-context';
import { financeErrorMessage } from '@/lib/finance/finance-errors';
import { formatFeeCategory } from '@/lib/finance/finance-labels';
import { useActiveTenantStore } from '@/lib/tenant/active-tenant-store';
import { parentChildName, parentChildSelectorLabel } from '@/lib/student/parent-child-labels';
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

  const fees = feesQuery.data;
  const isLoading = dashboardQuery.isLoading || feesQuery.isLoading;
  const payerEmail = profileQuery.data?.email ?? '';
  const totalOwed = fees?.totalBalanceMinor ?? fees?.balanceMinor ?? 0;
  const creditBalanceMinor = fees?.creditBalanceMinor ?? 0;
  const hasTermInvoice = Boolean(fees?.invoiceId);
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
    <div className="space-y-6">
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
      />

      {creditBalanceMinor > 0 ? (
        <Alert>
          <AlertDescription>
            {formatKobo(creditBalanceMinor)} credit on account — it will apply automatically when the
            school issues the next invoice.
          </AlertDescription>
        </Alert>
      ) : null}

      {(fees?.arrearsBalanceMinor ?? 0) > 0 ? (
        <Alert>
          <AlertDescription>
            {formatKobo(fees!.arrearsBalanceMinor)} is from earlier terms. One payment clears oldest
            balances first, then this term.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className={`${ACADEMIC_UI.dataPanel} grid gap-4 p-4 sm:grid-cols-2`}>
        <div className="space-y-2">
          <Label className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">Child</Label>
          <Select
            value={activeCard?.studentId ?? ''}
            onValueChange={(studentId) => {
              const card = cards.find((item) => item.studentId === studentId) ?? null;
              setSelectedCard(card);
              setTermId(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {cards.map((card) => (
                <SelectItem key={card.studentId} value={card.studentId}>
                  {parentChildSelectorLabel(card)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {terms.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">Term</Label>
            <Select value={resolvedTermId ?? ''} onValueChange={setTermId}>
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <ParentVirtualAccountSection
        fees={fees}
        childName={activeCard ? parentChildName(activeCard) : 'your child'}
        isLoading={feesQuery.isLoading}
        isRetrying={feesQuery.isFetching && !feesQuery.isLoading}
        onRetry={() => void feesQuery.refetch()}
      />

      {feesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Failed to load fee status. Try again shortly.</AlertDescription>
        </Alert>
      ) : null}

      {feesQuery.isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : !hasTermInvoice && totalOwed <= 0 && !payAhead ? (
        <div className={`${ACADEMIC_UI.dataPanel} p-10 text-center`}>
          <p className="text-[15px] font-semibold text-neutral-800">No invoice for this term yet</p>
          <p className="mt-2 text-[13px] text-neutral-500">
            The school has not issued a fee invoice for {activeCard ? parentChildName(activeCard) : 'your child'} this term.
            {creditBalanceMinor > 0
              ? ` You have ${formatKobo(creditBalanceMinor)} pay-ahead credit ready for when fees are issued.`
              : ' Contact the bursar if you expected one.'}
          </p>
          {fees?.onlinePaymentEnabled ? (
            <button
              type="button"
              className={`${ACADEMIC_UI.btnSecondary} mt-6`}
              onClick={() => setPayAhead(true)}
            >
              Prepay for future terms
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          {(fees?.creditBalanceMinor ?? 0) > 0 ? (
            <Alert>
              <AlertDescription>
                Fee credit available: {formatKobo(fees?.creditBalanceMinor ?? 0)} — applies automatically to
                future invoices.
              </AlertDescription>
            </Alert>
          ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {fees && fees.invoiceId ? (
          <div className={ACADEMIC_UI.dataPanel}>
            <div className="border-b border-border bg-gradient-to-r from-neutral-50 to-brand-50/30 px-4 py-4 sm:px-5">
              <p className="flex items-center gap-2 text-[14px] font-bold text-neutral-900">
                <Banknote className="size-4 text-brand-600" aria-hidden />
                Fee breakdown
              </p>
              {fees.dueDate ? (
                <p className="mt-0.5 text-[12px] text-neutral-500">Due {fees.dueDate}</p>
              ) : null}
            </div>
            <div className="divide-y divide-neutral-100">
              {fees.lineItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div>
                    <p className="text-[13px] font-medium text-neutral-900">{item.name}</p>
                    <p className="text-[11px] text-neutral-500">{formatFeeCategory(item.category)}</p>
                    {item.balanceMinor > 0 ? (
                      <p className="text-[11px] font-medium text-amber-800">
                        Outstanding {formatKobo(item.balanceMinor)}
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium text-accent-green-700">Fully paid</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[13px] tabular-nums text-neutral-900">
                      {formatKobo(item.amountMinor)}
                    </p>
                    <Badge variant={item.balanceMinor > 0 ? 'warning' : 'success'}>
                      {item.balanceMinor > 0 ? 'Partial' : 'Paid'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
          ) : totalOwed > 0 ? (
            <div className={`${ACADEMIC_UI.dataPanel} p-8`}>
              <p className="text-[14px] font-bold text-neutral-900">Earlier term balances</p>
              <p className="mt-2 text-[13px] text-neutral-600">
                No invoice for {termLabel ?? 'this term'} yet, but you still owe{' '}
                <span className="font-semibold">{formatKobo(totalOwed)}</span> from previous terms.
              </p>
            </div>
          ) : payAhead ? (
            <div className={`${ACADEMIC_UI.dataPanel} p-8`}>
              <p className="text-[14px] font-bold text-neutral-900">Pay ahead</p>
              <p className="mt-2 text-[13px] text-neutral-600">
                Prepay school fees before the next invoice is issued. Surplus is saved as credit on{' '}
                {activeCard ? parentChildName(activeCard) : 'Your child'}&apos;s account.
              </p>
            </div>
          ) : null}

          <div className={ACADEMIC_UI.dataPanel}>
            <div className="border-b border-border bg-gradient-to-r from-neutral-50 to-brand-50/30 px-4 py-4 sm:px-5">
              <p className="flex items-center gap-2 text-[14px] font-bold text-neutral-900">
                <CreditCard className="size-4 text-brand-600" aria-hidden />
                Pay online
              </p>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
                <p className="text-[13px] font-medium text-neutral-900">Amount to pay</p>
                <div className="mt-2">
                  <CurrencyInput
                    valueKobo={payAmountMinor}
                    onChangeKobo={(kobo) =>
                      setPayAmountMinor(payAhead ? kobo : Math.min(kobo, totalOwed || kobo))
                    }
                    disabled={paying || initializePayment.isPending}
                  />
                </div>
                <p className="mt-2 text-[11px] text-neutral-500">
                  {totalOwed > 0 ? (
                    <>
                      Total owed {formatKobo(totalOwed)}
                      {(fees?.arrearsBalanceMinor ?? 0) > 0
                        ? ` · includes ${formatKobo(fees?.arrearsBalanceMinor ?? 0)} arrears`
                        : null}
                    </>
                  ) : (
                    'No balance due — enable pay ahead below to prepay for future terms.'
                  )}
                </p>
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px] text-neutral-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={payAhead}
                    onChange={(event) => setPayAhead(event.target.checked)}
                    disabled={paying || initializePayment.isPending}
                  />
                  <span>Pay extra for future terms (surplus is saved as credit on this child&apos;s account)</span>
                </label>
              </div>

              <div className="space-y-2">
                <Label className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">
                  Payment method
                </Label>
                <Select value={payMethod} onValueChange={(v) => setPayMethod(v as OnlinePaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Debit / credit card</SelectItem>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {payError ? (
                <Alert variant="destructive">
                  <AlertDescription>{payError}</AlertDescription>
                </Alert>
              ) : null}

              {!fees?.onlinePaymentEnabled ? (
                <Alert>
                  <AlertDescription>
                    Online payments are not enabled for this school yet. Contact the bursar to pay by bank transfer
                    or at the school office.
                  </AlertDescription>
                </Alert>
              ) : totalOwed <= 0 && !payAheadActive ? (
                <Alert>
                  <AlertDescription>All fees are paid. Enable pay ahead to prepay for future terms.</AlertDescription>
                </Alert>
              ) : !payerEmail ? (
                <Alert>
                  <AlertDescription>
                    Add an email address in your profile before paying online.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <p className="text-[12px] text-neutral-500">
                    You will be redirected to Paystack to complete payment. Receipt appears in the portal after
                    confirmation.
                  </p>
                  <button
                    type="button"
                    className={`${ACADEMIC_UI.btnPrimary} w-full`}
                    disabled={paying || initializePayment.isPending || payAmountMinor <= 0}
                    onClick={() => void handlePayOnline()}
                  >
                    {paying || initializePayment.isPending
                      ? 'Redirecting…'
                      : `Pay ${formatKobo(payAmountMinor)} now`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {resolvedTermId && activeCard?.studentId ? (
        <ParentPaymentHistory
          tenantId={activeCard.tenantId}
          payments={paymentsQuery.data?.payments ?? []}
          isLoading={paymentsQuery.isLoading}
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
