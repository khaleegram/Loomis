'use client';

import Link from 'next/link';
import { Banknote, ClipboardList, Receipt, Users, Wallet } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatKobo } from '@loomis/core';
import { SURFACES } from '@/lib/design/surfaces';

interface PaymentLogHeroProps {
  termLabel: string | null;
  yearLabel: string | null;
  outstandingInvoiceCount: number;
  totalOutstandingMinor: number;
  studentsWithBalance: number;
  pendingVerificationCount: number;
  isLoading?: boolean;
}

export function PaymentLogHero({
  termLabel,
  yearLabel,
  outstandingInvoiceCount,
  totalOutstandingMinor,
  studentsWithBalance,
  pendingVerificationCount,
  isLoading,
}: PaymentLogHeroProps) {
  const stats = [
    {
      label: 'Outstanding',
      value: isLoading ? '—' : formatKobo(totalOutstandingMinor),
      hint: `${outstandingInvoiceCount} open invoice${outstandingInvoiceCount === 1 ? '' : 's'}`,
      icon: Wallet,
      gradient: SURFACES.kpi.g4,
    },
    {
      label: 'Students owing',
      value: isLoading ? '—' : String(studentsWithBalance),
      hint: 'With balance this term',
      icon: Users,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Awaiting verify',
      value: isLoading ? '—' : String(pendingVerificationCount),
      hint: 'Logged, not yet verified',
      icon: Receipt,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Your role',
      value: 'Cashier',
      hint: 'Log only — cannot verify',
      icon: Banknote,
      gradient: SURFACES.kpi.g2,
    },
  ];

  return (
    <div className="hero-panel rounded-2xl">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className={ACADEMIC_UI.sectionLabel}>Cashier · offline payments</p>
            <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
              Log payment
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              Record cash, bank, or POS payments against student invoices. A provisional receipt is issued;
              an accountant must verify before the ledger settles.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {yearLabel ? (
                <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
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
            <Link href="/school/finance/payments/history" className={ACADEMIC_UI.btnSecondary}>
              Payment register
            </Link>
            <Link href="/school/finance/payments/verify" className={ACADEMIC_UI.btnSecondary}>
              Verification queue
            </Link>
            <Link href="/school/finance" className={ACADEMIC_UI.btnSecondary}>
              Fee structures
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
