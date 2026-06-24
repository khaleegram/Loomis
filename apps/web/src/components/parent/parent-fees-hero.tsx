'use client';

import { CheckCircle2, CreditCard, Receipt, Wallet } from 'lucide-react';

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
  isLoading?: boolean;
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
  isLoading,
}: ParentFeesHeroProps) {
  const owedMinor = totalBalanceMinor ?? balanceMinor + arrearsBalanceMinor;
  const stats = [
    {
      label: 'Total charged',
      value: isLoading ? '—' : formatKobo(amountChargedMinor),
      hint: 'This term invoice',
      icon: Receipt,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Paid',
      value: isLoading ? '—' : formatKobo(amountPaidMinor),
      hint: 'Verified payments',
      icon: CheckCircle2,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Total owed',
      value: isLoading ? '—' : formatKobo(owedMinor),
      hint:
        arrearsBalanceMinor > 0
          ? `${formatKobo(balanceMinor)} this term · ${formatKobo(arrearsBalanceMinor)} arrears`
          : owedMinor > 0
            ? 'Tap Pay below'
            : 'All clear',
      icon: Wallet,
      gradient: owedMinor > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g2,
    },
    {
      label: 'Portal',
      value: 'Fees',
      hint: 'Track and pay online',
      icon: CreditCard,
      gradient: SURFACES.kpi.g1,
    },
  ];

  return (
    <div className="hero-panel rounded-2xl">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />

        <div className="relative min-w-0">
          <p className={ACADEMIC_UI.sectionLabel}>Family portal · school fees</p>
          <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
            Fee status
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            What you owe this term and from earlier terms — pay in one tap when you are ready.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {childName ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-white/85 px-3 py-1 text-[11px] font-semibold text-brand-800 shadow-sm">
                {childName}
              </span>
            ) : null}
            {schoolName ? (
              <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                {schoolName}
              </span>
            ) : null}
            {classLabel ? (
              <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                {classLabel}
              </span>
            ) : null}
            {termLabel ? (
              <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                {termLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card overflow-hidden rounded-xl p-4 sm:p-5">
                <div className="mb-3">
                  <span
                    className="flex size-8 items-center justify-center rounded-xl text-white shadow-sm sm:size-9"
                    style={{ background: stat.gradient }}
                  >
                    <Icon aria-hidden className="size-3.5 sm:size-4" />
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">{stat.label}</p>
                <p
                  className="mt-1 tabular-nums leading-none text-neutral-900"
                  style={{
                    fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] font-medium text-neutral-500">{stat.hint}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
