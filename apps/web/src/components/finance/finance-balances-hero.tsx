'use client';

import Link from 'next/link';
import { formatKobo } from '@loomis/core';
import { AlertCircle, Receipt, Users, Wallet } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

interface FinanceBalancesHeroProps {
  termLabel: string | null;
  yearLabel: string | null;
  studentCount: number;
  totalBalanceMinor: number;
  totalChargedMinor: number;
  isLoading?: boolean;
}

export function FinanceBalancesHero({
  termLabel,
  yearLabel,
  studentCount,
  totalBalanceMinor,
  totalChargedMinor,
  isLoading,
}: FinanceBalancesHeroProps) {
  const stats = [
    {
      label: 'Outstanding',
      value: isLoading ? '—' : formatKobo(totalBalanceMinor),
      hint: 'Total balance due',
      icon: Wallet,
      gradient: totalBalanceMinor > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g2,
    },
    {
      label: 'Charged',
      value: isLoading ? '—' : formatKobo(totalChargedMinor),
      hint: 'Invoiced this term',
      icon: Receipt,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Students',
      value: isLoading ? '—' : String(studentCount),
      hint: 'With invoices',
      icon: Users,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Alerts',
      value: totalBalanceMinor > 0 ? 'Due' : 'Clear',
      hint: 'Collection status',
      icon: AlertCircle,
      gradient: SURFACES.kpi.g4,
    },
  ];

  return (
    <div className="hero-panel rounded-2xl">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className={ACADEMIC_UI.sectionLabel}>Finance · collections</p>
            <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
              Outstanding balances
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              Fee charged, paid, and balance per student for the selected term — US-FIN-005.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {yearLabel ? (
                <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                  {yearLabel}
                </span>
              ) : null}
              {termLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-white/85 px-3 py-1 text-[11px] font-semibold text-brand-800 shadow-sm">
                  {termLabel}
                </span>
              ) : null}
            </div>
          </div>
          <Link href="/school/finance" className={ACADEMIC_UI.btnSecondary}>
            Fee structures
          </Link>
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
                  style={{ fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', fontWeight: 800, letterSpacing: '-0.02em' }}
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
