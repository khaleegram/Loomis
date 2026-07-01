'use client';

import type { ParentFeeStatusResponse } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import { Skeleton } from '@loomis/ui-web';
import { Receipt } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatFeeCategory } from '@/lib/finance/finance-labels';

interface ParentFeesInvoicePanelProps {
  fees: ParentFeeStatusResponse | undefined;
  termLabel: string | null;
  totalOwed: number;
  isLoading: boolean;
  onStartPayAhead: () => void;
  onlinePaymentEnabled: boolean;
  bankTransferMode?: boolean;
}

function LineProgress({ paidMinor, totalMinor }: { paidMinor: number; totalMinor: number }) {
  const pct = totalMinor > 0 ? Math.min(100, Math.round((paidMinor / totalMinor) * 100)) : 0;
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ParentFeesInvoicePanel({
  fees,
  termLabel,
  totalOwed,
  isLoading,
  onStartPayAhead,
  onlinePaymentEnabled,
  bankTransferMode = false,
}: ParentFeesInvoicePanelProps) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  const hasInvoice = Boolean(fees?.invoiceId);
  const lineItems = fees?.lineItems ?? [];

  if (!hasInvoice && totalOwed <= 0) {
    return (
      <div className={`${ACADEMIC_UI.dataPanel} px-6 py-10 text-center`}>
        <Receipt className="mx-auto size-8 text-brand-500/70" aria-hidden />
        <p className="mt-3 text-[15px] font-bold text-neutral-900">No invoice for {termLabel ?? 'this term'} yet</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-neutral-500">
          The school has not issued fees for this term.
          {bankTransferMode
            ? ' You can still transfer to your child\u2019s dedicated account — extra is saved as credit.'
            : ' Contact the bursar if you expected an invoice.'}
        </p>
        {!bankTransferMode && onlinePaymentEnabled ? (
          <button type="button" className={`${ACADEMIC_UI.btnPrimary} mt-6`} onClick={onStartPayAhead}>
            Prepay for future terms
          </button>
        ) : null}
      </div>
    );
  }

  if (!hasInvoice && totalOwed > 0) {
    return (
      <div className={`${ACADEMIC_UI.dataPanel} px-6 py-8`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Earlier terms</p>
        <p className="mt-2 text-[18px] font-extrabold tracking-tight text-neutral-900">
          {formatKobo(totalOwed)} outstanding
        </p>
        <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-neutral-600">
          No invoice for {termLabel ?? 'this term'} yet, but previous term balances are still open. Bank transfers and
          online payments clear oldest balances first.
        </p>
      </div>
    );
  }

  return (
    <div className={ACADEMIC_UI.dataPanel}>
      <div className={`${ACADEMIC_UI.tableHeader} flex flex-wrap items-end justify-between gap-3 px-5 py-4`}>
        <div>
          <p className="flex items-center gap-2 text-[14px] font-bold text-neutral-900">
            <Receipt className="size-4 text-brand-600" aria-hidden />
            {termLabel ?? 'Term'} invoice
          </p>
          {fees?.dueDate ? (
            <p className="mt-0.5 text-[12px] text-neutral-500">Due {fees.dueDate}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Invoice total</p>
          <p className="font-mono text-[18px] font-extrabold tabular-nums text-neutral-900">
            {formatKobo(fees?.amountChargedMinor ?? 0)}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-neutral-100/80">
        {lineItems.map((item) => {
          const paidMinor = item.amountMinor - item.balanceMinor;
          const isPaid = item.balanceMinor <= 0;
          return (
            <li key={item.id} className="px-5 py-4 transition-colors hover:bg-brand-50/20">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-neutral-900">{item.name}</p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                    {formatFeeCategory(item.category)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[14px] font-bold tabular-nums text-neutral-900">
                    {formatKobo(item.amountMinor)}
                  </p>
                  <span
                    className={
                      isPaid
                        ? 'mt-1 inline-flex rounded-full bg-accent-green-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-green-700'
                        : 'mt-1 inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800'
                    }
                  >
                    {isPaid ? 'Paid' : `Owes ${formatKobo(item.balanceMinor)}`}
                  </span>
                </div>
              </div>
              <LineProgress paidMinor={paidMinor} totalMinor={item.amountMinor} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
