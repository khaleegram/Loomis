'use client';

import { CheckCircle2, Sparkles, Wallet } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatKobo } from '@loomis/core';
import { SURFACES } from '@/lib/design/surfaces';

interface ParentFeesHeroProps {
  childName: string | null;
  schoolName: string | null;
  termLabel: string | null;
  classLabel: string | null;
  amountChargedMinor: number;
  amountPaidMinor: number;
  balanceMinor: number;
  arrearsBalanceMinor?: number;
  totalBalanceMinor?: number;
  creditBalanceMinor?: number;
  isLoading?: boolean;
  bankTransferMode?: boolean;
}

export function ParentFeesHero({
  childName,
  schoolName,
  termLabel,
  classLabel,
  amountChargedMinor,
  amountPaidMinor,
  balanceMinor,
  arrearsBalanceMinor = 0,
  totalBalanceMinor,
  creditBalanceMinor = 0,
  isLoading,
  bankTransferMode = false,
}: ParentFeesHeroProps) {
  const owedMinor = totalBalanceMinor ?? balanceMinor + arrearsBalanceMinor;
  const allClear = !isLoading && owedMinor <= 0;
  const paidPercent =
    amountChargedMinor > 0 ? Math.min(100, Math.round((amountPaidMinor / amountChargedMinor) * 100)) : 0;

  return (
    <div className={ACADEMIC_UI.heroPanel}>
      <div
        className="relative overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        style={{ background: SURFACES.hero }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-brand-400/15 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className={ACADEMIC_UI.sectionLabel}>Family portal · school fees</p>
            <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
              Pay school fees
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              {bankTransferMode
                ? 'Each child has a dedicated bank account — transfer from any app and your balance updates automatically.'
                : 'View invoices and pay school fees for your linked children.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {childName ? <span className={ACADEMIC_UI.heroPillBrand}>{childName}</span> : null}
              {schoolName ? <span className={ACADEMIC_UI.heroPill}>{schoolName}</span> : null}
              {classLabel ? <span className={ACADEMIC_UI.heroPill}>{classLabel}</span> : null}
              {termLabel ? <span className={ACADEMIC_UI.heroPill}>{termLabel}</span> : null}
            </div>
          </div>

          <div className="shrink-0 rounded-2xl bg-card/90 px-5 py-4 shadow-lg ring-1 ring-brand-100/30 backdrop-blur-sm sm:min-w-[220px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              {allClear ? 'Balance' : 'Amount owed'}
            </p>
            <p
              className="mt-1 tabular-nums text-neutral-900"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 800, letterSpacing: '-0.03em' }}
            >
              {isLoading ? '—' : formatKobo(owedMinor)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-neutral-600">
              {allClear ? (
                <>
                  <CheckCircle2 className="size-3.5 text-accent-green-600" aria-hidden />
                  All fees cleared for this view
                </>
              ) : arrearsBalanceMinor > 0 ? (
                <>
                  <Wallet className="size-3.5 text-amber-600" aria-hidden />
                  Includes {formatKobo(arrearsBalanceMinor)} from earlier terms
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5 text-brand-600" aria-hidden />
                  Pay below to settle
                </>
              )}
            </p>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: 'Term invoice', value: isLoading ? '—' : formatKobo(amountChargedMinor) },
            {
              label: 'Paid',
              value: isLoading ? '—' : formatKobo(amountPaidMinor),
              sub: !isLoading && amountChargedMinor > 0 ? `${paidPercent}% of invoice` : undefined,
            },
            {
              label: creditBalanceMinor > 0 ? 'Credit' : 'This term',
              value:
                isLoading ? '—' : creditBalanceMinor > 0 ? formatKobo(creditBalanceMinor) : formatKobo(balanceMinor),
              sub: creditBalanceMinor > 0 ? 'Pay-ahead balance' : 'Remaining this term',
            },
          ].map((row) => (
            <div
              key={row.label}
              className="rounded-xl bg-card/75 px-3 py-3 shadow-sm ring-1 ring-white/60 sm:px-4 sm:py-3.5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">{row.label}</p>
              <p className="mt-0.5 text-[15px] font-extrabold tabular-nums tracking-tight text-neutral-900 sm:text-base">
                {row.value}
              </p>
              {row.sub ? <p className="mt-0.5 text-[10px] font-medium text-neutral-500">{row.sub}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
