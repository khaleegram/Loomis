'use client';

import type { OnlinePaymentMethod, ParentFeeStatusResponse } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import { Alert, AlertDescription, CurrencyInput, Skeleton } from '@loomis/ui-web';
import { CreditCard, Landmark, RefreshCw } from 'lucide-react';

import { ParentVirtualAccountCard } from '@/components/parent/parent-virtual-account-card';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface ParentFeesPaymentHubProps {
  fees: ParentFeeStatusResponse | undefined;
  childName: string;
  isLoading: boolean;
  isRetryingVa: boolean;
  onRetryVa: () => void;
  totalOwed: number;
  payAmountMinor: number;
  onPayAmountChange: (kobo: number) => void;
  payAhead: boolean;
  onPayAheadChange: (value: boolean) => void;
  payAheadActive: boolean;
  payMethod: OnlinePaymentMethod;
  onPayMethodChange: (method: OnlinePaymentMethod) => void;
  payerEmail: string;
  paying: boolean;
  payError: string | null;
  onPayOnline: () => void;
  isPayPending: boolean;
}

function BankTransferPanel({
  childName,
  showVa,
  va,
  isRetryingVa,
  onRetryVa,
  totalOwed,
  fullWidth,
}: {
  childName: string;
  showVa: boolean;
  va: ParentFeeStatusResponse['virtualAccount'];
  isRetryingVa: boolean;
  onRetryVa: () => void;
  totalOwed: number;
  fullWidth?: boolean;
}) {
  const wrapClass = fullWidth ? 'max-w-2xl' : '';

  if (showVa && va) {
    return (
      <div className={wrapClass}>
        <ParentVirtualAccountCard
          variant="featured"
          accountNumber={va.accountNumber}
          bankName={va.bankName}
          accountName={va.accountName}
          childName={childName}
        />
        {totalOwed > 0 ? (
          <p className="mt-3 px-1 text-[12px] font-medium text-neutral-600">
            Transfer at least <strong className="text-neutral-900">{formatKobo(totalOwed)}</strong> to clear the
            balance, or any amount — partial payments apply automatically.
          </p>
        ) : (
          <p className="mt-3 px-1 text-[12px] font-medium text-neutral-600">
            No balance due right now. You can still transfer to this account — extra is saved as fee credit.
          </p>
        )}
      </div>
    );
  }

  if (showVa) {
    return (
      <div className={`rounded-2xl bg-gradient-to-br from-[#1a2744] to-[#243352] p-5 text-white shadow-lg ${wrapClass}`}>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#c9a96e]">
          <Landmark className="size-3.5" aria-hidden />
          Your child&apos;s bank account
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-white/75">
          We could not load {childName}&apos;s dedicated account number yet.
        </p>
        <button
          type="button"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#c9a96e] px-4 text-[13px] font-bold text-[#0f1729]"
          disabled={isRetryingVa}
          onClick={onRetryVa}
        >
          <RefreshCw className={`size-4 ${isRetryingVa ? 'animate-spin' : ''}`} aria-hidden />
          {isRetryingVa ? 'Loading…' : 'Load account number'}
        </button>
      </div>
    );
  }

  return (
    <div className={`${ACADEMIC_UI.dataPanel} px-5 py-6 ${wrapClass}`}>
      <p className="flex items-center gap-2 text-[14px] font-bold text-neutral-900">
        <Landmark className="size-4 text-brand-600" aria-hidden />
        Bank transfer
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
        Dedicated Nomba accounts are not enabled on this server yet. Ask the school to enable bank-transfer fees, or use
        card payment if available.
      </p>
    </div>
  );
}

function PaystackPanel({
  onlineEnabled,
  totalOwed,
  payAmountMinor,
  onPayAmountChange,
  payAhead,
  onPayAheadChange,
  payAheadActive,
  payMethod,
  onPayMethodChange,
  payerEmail,
  paying,
  payError,
  onPayOnline,
  isPayPending,
}: Pick<
  ParentFeesPaymentHubProps,
  | 'totalOwed'
  | 'payAmountMinor'
  | 'onPayAmountChange'
  | 'payAhead'
  | 'onPayAheadChange'
  | 'payAheadActive'
  | 'payMethod'
  | 'onPayMethodChange'
  | 'payerEmail'
  | 'paying'
  | 'payError'
  | 'onPayOnline'
  | 'isPayPending'
> & { onlineEnabled: boolean }) {
  return (
    <div className={`${ACADEMIC_UI.dataPanel} lg:col-span-2`}>
      <div className={`${ACADEMIC_UI.tableHeader} px-4 py-4 sm:px-5`}>
        <p className="flex items-center gap-2 text-[14px] font-bold text-neutral-900">
          <CreditCard className="size-4 text-brand-600" aria-hidden />
          Pay with card
        </p>
        <p className="mt-0.5 text-[12px] text-neutral-500">Debit or credit card checkout</p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-xl bg-muted/35 p-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Amount</p>
          <div className="mt-2">
            <CurrencyInput
              valueKobo={payAmountMinor}
              onChangeKobo={(kobo) => onPayAmountChange(payAhead ? kobo : Math.min(kobo, totalOwed || kobo))}
              disabled={paying || isPayPending}
            />
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            {totalOwed > 0
              ? `Total owed ${formatKobo(totalOwed)}`
              : 'No balance due — enable pay ahead to prepay.'}
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-relaxed text-neutral-700">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-neutral-300"
            checked={payAhead}
            onChange={(e) => onPayAheadChange(e.target.checked)}
            disabled={paying || isPayPending}
          />
          Pay extra for future terms (saved as credit)
        </label>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">Method</p>
          <select
            value={payMethod}
            onChange={(e) => onPayMethodChange(e.target.value as OnlinePaymentMethod)}
            className="h-10 w-full rounded-xl bg-muted/40 px-3 text-[13px] font-medium shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
            disabled={paying || isPayPending}
          >
            <option value="card">Debit / credit card</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </div>

        {payError ? (
          <Alert variant="destructive">
            <AlertDescription>{payError}</AlertDescription>
          </Alert>
        ) : null}

        {!onlineEnabled ? (
          <p className="text-[12px] text-neutral-500">Card payments are not enabled for this school.</p>
        ) : totalOwed <= 0 && !payAheadActive ? (
          <p className="text-[12px] text-neutral-500">All fees paid — tick pay ahead to prepay.</p>
        ) : !payerEmail ? (
          <p className="text-[12px] text-neutral-500">Add an email in your profile before paying online.</p>
        ) : (
          <button
            type="button"
            className={`${ACADEMIC_UI.btnPrimary} w-full`}
            disabled={paying || isPayPending || payAmountMinor <= 0}
            onClick={onPayOnline}
          >
            {paying || isPayPending ? 'Redirecting…' : `Pay ${formatKobo(payAmountMinor)} now`}
          </button>
        )}
      </div>
    </div>
  );
}

export function ParentFeesPaymentHub(props: ParentFeesPaymentHubProps) {
  const {
    fees,
    childName,
    isLoading,
    isRetryingVa,
    onRetryVa,
    totalOwed,
    payAmountMinor,
    onPayAmountChange,
    payAhead,
    onPayAheadChange,
    payAheadActive,
    payMethod,
    onPayMethodChange,
    payerEmail,
    paying,
    payError,
    onPayOnline,
    isPayPending,
  } = props;

  if (isLoading) {
    return <Skeleton className="h-72 w-full max-w-2xl rounded-2xl" />;
  }

  const nombaMode = Boolean(fees?.virtualAccountEnabled);
  const va = fees?.virtualAccount;
  const showPaystack = !nombaMode && (fees?.onlinePaymentEnabled ?? false);

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">How to pay</p>
        <h2 className="mt-1 text-[17px] font-extrabold tracking-tight text-neutral-900">
          {nombaMode ? 'Transfer to your child\u2019s account' : 'Choose how to pay'}
        </h2>
        {nombaMode ? (
          <p className="mt-1 max-w-xl text-[13px] text-neutral-600">
            Use the account number below from any Nigerian bank app. No card checkout — we reconcile the transfer
            automatically.
          </p>
        ) : null}
      </div>

      {nombaMode ? (
        <BankTransferPanel
          childName={childName}
          showVa={nombaMode}
          va={va ?? null}
          isRetryingVa={isRetryingVa}
          onRetryVa={onRetryVa}
          totalOwed={totalOwed}
          fullWidth
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
          <div className="lg:col-span-3">
            <BankTransferPanel
              childName={childName}
              showVa={false}
              va={null}
              isRetryingVa={isRetryingVa}
              onRetryVa={onRetryVa}
              totalOwed={totalOwed}
            />
          </div>
          {showPaystack ? (
            <PaystackPanel
              onlineEnabled={fees?.onlinePaymentEnabled ?? false}
              totalOwed={totalOwed}
              payAmountMinor={payAmountMinor}
              onPayAmountChange={onPayAmountChange}
              payAhead={payAhead}
              onPayAheadChange={onPayAheadChange}
              payAheadActive={payAheadActive}
              payMethod={payMethod}
              onPayMethodChange={onPayMethodChange}
              payerEmail={payerEmail}
              paying={paying}
              payError={payError}
              onPayOnline={onPayOnline}
              isPayPending={isPayPending}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
