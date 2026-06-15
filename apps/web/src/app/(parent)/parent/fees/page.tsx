'use client';

import {
  useAcademicTerms,
  useAcademicYears,
  useInitializeOnlinePayment,
  useMyProfile,
  useParentDashboard,
  useParentFees,
} from '@loomis/api-client';
import type { ParentChildCardResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Badge,
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
import { PageBody } from '@/components/parent/parent-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useAuth } from '@/lib/auth/auth-context';
import { financeErrorMessage } from '@/lib/finance/finance-errors';
import { formatFeeCategory } from '@/lib/finance/finance-labels';
import { useActiveTenantStore } from '@/lib/tenant/active-tenant-store';
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
  const initializePayment = useInitializeOnlinePayment(
    activeCard?.tenantId ?? '',
    resolvedTermId ?? '',
    activeCard?.studentId ?? '',
  );

  const fees = feesQuery.data;
  const isLoading = dashboardQuery.isLoading || feesQuery.isLoading;

  const payerEmail = profileQuery.data?.email ?? '';

  async function handlePayOnline() {
    if (!fees?.invoiceId || fees.balanceMinor <= 0 || !payerEmail) return;
    setPayError(null);
    setPaying(true);
    try {
      const result = await initializePayment.mutateAsync({
        invoiceId: fees.invoiceId,
        amountMinor: fees.balanceMinor,
        payerEmail,
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
        childName={activeCard?.studentFirstName ?? null}
        schoolName={activeCard?.schoolName ?? null}
        termLabel={termLabel}
        classLabel={fees?.classArmLabel ?? activeCard?.classArmLabel ?? null}
        amountChargedMinor={fees?.amountChargedMinor ?? 0}
        amountPaidMinor={fees?.amountPaidMinor ?? 0}
        balanceMinor={fees?.balanceMinor ?? activeCard?.outstandingBalanceMinor ?? 0}
        isLoading={isLoading}
      />

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
                  {card.studentFirstName} · {card.schoolName}
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

      {feesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Failed to load fee status. Try again shortly.</AlertDescription>
        </Alert>
      ) : null}

      {feesQuery.isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : !fees?.invoiceId ? (
        <div className={`${ACADEMIC_UI.dataPanel} p-10 text-center`}>
          <p className="text-[15px] font-semibold text-neutral-800">No invoice for this term yet</p>
          <p className="mt-2 text-[13px] text-neutral-500">
            The school has not issued a fee invoice for {activeCard?.studentFirstName ?? 'your child'} this term.
            Contact the bursar if you expected one.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={ACADEMIC_UI.dataPanel}>
            <div className="border-b border-brand-50 bg-gradient-to-r from-neutral-50 to-brand-50/30 px-4 py-4 sm:px-5">
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

          <div className={ACADEMIC_UI.dataPanel}>
            <div className="border-b border-brand-50 bg-gradient-to-r from-neutral-50 to-brand-50/30 px-4 py-4 sm:px-5">
              <p className="flex items-center gap-2 text-[14px] font-bold text-neutral-900">
                <CreditCard className="size-4 text-brand-600" aria-hidden />
                Pay online
              </p>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
                <p className="text-[13px] font-medium text-neutral-900">Outstanding balance</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-neutral-900">
                  {formatKobo(fees.balanceMinor)}
                </p>
              </div>

              {payError ? (
                <Alert variant="destructive">
                  <AlertDescription>{payError}</AlertDescription>
                </Alert>
              ) : null}

              {!fees.onlinePaymentEnabled ? (
                <Alert>
                  <AlertDescription>
                    Online payments are not enabled for this school yet. Contact the bursar to pay by bank transfer
                    or at the school office.
                  </AlertDescription>
                </Alert>
              ) : fees.balanceMinor <= 0 ? (
                <Alert>
                  <AlertDescription>All fees for this term are paid. No payment required.</AlertDescription>
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
                    disabled={paying || initializePayment.isPending}
                    onClick={() => void handlePayOnline()}
                  >
                    {paying || initializePayment.isPending
                      ? 'Redirecting…'
                      : `Pay ${formatKobo(fees.balanceMinor)} now`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
