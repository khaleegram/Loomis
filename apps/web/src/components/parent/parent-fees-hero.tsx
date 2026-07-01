'use client';

import { CheckCircle2, TrendingUp, Wallet } from 'lucide-react';

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

  const statItems = [
    {
      label: 'Term invoice',
      value: isLoading ? '—' : formatKobo(amountChargedMinor),
      sub: 'Issued this term',
    },
    {
      label: 'Paid',
      value: isLoading ? '—' : formatKobo(amountPaidMinor),
      sub: amountChargedMinor > 0 ? `${paidPercent}% settled` : 'Verified',
    },
    {
      label: creditBalanceMinor > 0 ? 'Credit' : 'Balance',
      value: isLoading
        ? '—'
        : creditBalanceMinor > 0
          ? formatKobo(creditBalanceMinor)
          : formatKobo(balanceMinor),
      sub: creditBalanceMinor > 0 ? 'Pay-ahead credit' : 'Remaining this term',
    },
  ];

  return (
    <div className={ACADEMIC_UI.heroPanel}>
      <div
        className="relative overflow-hidden px-4 pt-7 pb-6 sm:px-6 sm:pt-9 lg:px-8"
        style={{ background: SURFACES.hero }}
      >
        {/* Decorative orbs */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #c9a96e 0%, transparent 65%)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 size-40 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #4f80e1 0%, transparent 65%)' }}
          aria-hidden
        />

        <div className="relative">
          {/* Top row: label + owed callout */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={ACADEMIC_UI.sectionLabel}>Family portal · school fees</p>
              <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
                {bankTransferMode ? 'Pay by bank transfer' : 'School fees'}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {childName ? <span className={ACADEMIC_UI.heroPillBrand}>{childName}</span> : null}
                {schoolName ? <span className={ACADEMIC_UI.heroPill}>{schoolName}</span> : null}
                {classLabel ? <span className={ACADEMIC_UI.heroPill}>{classLabel}</span> : null}
                {termLabel ? <span className={ACADEMIC_UI.heroPill}>{termLabel}</span> : null}
              </div>
            </div>

            {/* Owed amount callout */}
            <div
              className="shrink-0 rounded-2xl px-5 py-4 sm:min-w-[200px]"
              style={{
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                border: '1px solid rgba(201,169,110,0.2)',
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                {allClear ? 'You owe' : 'Total owed'}
              </p>
              <p
                className="mt-1 tabular-nums text-neutral-900"
                style={{ fontSize: 'clamp(1.7rem, 4vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.03em' }}
              >
                {isLoading ? '—' : formatKobo(owedMinor)}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
                {allClear ? (
                  <><CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden /><span className="text-emerald-700">All clear</span></>
                ) : arrearsBalanceMinor > 0 ? (
                  <><Wallet className="size-3.5 text-amber-600" aria-hidden /><span className="text-amber-800">Includes arrears</span></>
                ) : (
                  <><TrendingUp className="size-3.5 text-brand-600" aria-hidden /><span className="text-brand-700">Pay to settle</span></>
                )}
              </p>
            </div>
          </div>

          {/* Stat strip */}
          <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
            {statItems.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl px-3 py-3 sm:px-4 sm:py-3.5"
                style={{
                  background: 'rgba(255,255,255,0.72)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(255,255,255,0.8)',
                }}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-neutral-400">{stat.label}</p>
                <p
                  className="mt-0.5 font-extrabold tabular-nums tracking-tight text-neutral-900"
                  style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)' }}
                >
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-neutral-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
