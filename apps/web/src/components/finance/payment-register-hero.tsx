'use client';

import Link from 'next/link';
import { Banknote, ClipboardList, Receipt, Wallet } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatKobo } from '@loomis/core';
import { SURFACES } from '@/lib/design/surfaces';

interface PaymentRegisterHeroProps {
  termLabel: string | null;
  yearLabel: string | null;
  totalCount: number;
  verifiedCount: number;
  pendingCount: number;
  totalAmountMinor: number;
  isLoading?: boolean;
}

export function PaymentRegisterHero({
  termLabel,
  yearLabel,
  totalCount,
  verifiedCount,
  pendingCount,
  totalAmountMinor,
  isLoading,
}: PaymentRegisterHeroProps) {
  const stats = [
    {
      label: 'Recorded',
      value: isLoading ? '—' : String(totalCount),
      hint: 'This term',
      icon: Wallet,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Verified',
      value: isLoading ? '—' : String(verifiedCount),
      hint: 'Settled',
      icon: Receipt,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Pending',
      value: isLoading ? '—' : String(pendingCount),
      hint: 'Awaiting action',
      icon: Banknote,
      gradient: pendingCount > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g3,
    },
    {
      label: 'Volume',
      value: isLoading ? '—' : formatKobo(totalAmountMinor),
      hint: 'Gross logged',
      icon: ClipboardList,
      gradient: SURFACES.kpi.g3,
    },
  ];

  return (
    <section className={`${SURFACES.hero} relative overflow-hidden rounded-2xl px-5 py-6 sm:px-8 sm:py-8`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Finance · Payment register</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl" style={ACADEMIC_PAGE_TITLE_STYLE}>
            All payments
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {yearLabel ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-white/85 px-3 py-1 text-[11px] font-semibold text-brand-800 shadow-sm">
                {yearLabel}
              </span>
            ) : null}
            {termLabel ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-white/85 px-3 py-1 text-[11px] font-semibold text-brand-800 shadow-sm">
                <ClipboardList aria-hidden className="size-3.5" />
                {termLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:justify-end">
          <Link href="/school/finance/payments/log" className={ACADEMIC_UI.btnSecondary}>
            Log payment
          </Link>
          <Link href="/school/finance/payments/verify" className={ACADEMIC_UI.btnSecondary}>
            Verify queue
          </Link>
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
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                {stat.label}
              </p>
              <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-neutral-900 sm:text-xl">
                {stat.value}
              </p>
              <p className="mt-1 text-[11px] text-neutral-500">{stat.hint}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
