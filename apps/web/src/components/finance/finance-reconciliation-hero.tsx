'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CreditCard, Scale } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

interface FinanceReconciliationHeroProps {
  openCount: number;
  resolvedCount: number;
  isLoading?: boolean;
}

export function FinanceReconciliationHero({
  openCount,
  resolvedCount,
  isLoading,
}: FinanceReconciliationHeroProps) {
  const stats = [
    {
      label: 'Open',
      value: isLoading ? '—' : String(openCount),
      hint: 'Needs resolution',
      icon: AlertTriangle,
      gradient: openCount > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g3,
    },
    {
      label: 'Resolved',
      value: isLoading ? '—' : String(resolvedCount),
      hint: 'Closed exceptions',
      icon: CheckCircle2,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Gateway',
      value: 'Paystack',
      hint: 'Settlement sync',
      icon: CreditCard,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Workflow',
      value: 'Verify',
      hint: 'Accountant resolves',
      icon: Scale,
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
            <p className={ACADEMIC_UI.sectionLabel}>Finance · gateway sync</p>
            <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
              Payment reconciliation
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              Review and resolve gateway reconciliation exceptions — US-FIN-007.
            </p>
          </div>
          <Link href="/school/finance/payments/verify" className={ACADEMIC_UI.btnSecondary}>
            Verification queue
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
