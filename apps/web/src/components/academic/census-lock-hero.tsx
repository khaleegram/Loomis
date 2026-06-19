'use client';

import Link from 'next/link';
import { ClipboardList, Lock, ShieldCheck, Users, Wallet } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatKobo } from '@loomis/core';
import { SURFACES } from '@/lib/design/surfaces';

interface CensusLockHeroProps {
  termLabel: string | null;
  yearLabel: string | null;
  systemCount: number;
  declaredCount: number | null;
  minimumTermCommitment: number | null;
  psfRateMinor: number | null;
  psfTotalMinor: number | null;
  varianceWarning: boolean;
  belowMtc: boolean;
  isLoading?: boolean;
}

export function CensusLockHero({
  termLabel,
  yearLabel,
  systemCount,
  declaredCount,
  minimumTermCommitment,
  psfRateMinor,
  psfTotalMinor,
  varianceWarning,
  belowMtc,
  isLoading,
}: CensusLockHeroProps) {
  const stats = [
    {
      label: 'System count',
      value: isLoading ? '—' : String(systemCount),
      hint: 'Auto billable enrollments',
      icon: Users,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Declared count',
      value: isLoading ? '—' : declaredCount === null ? '—' : String(declaredCount),
      hint: varianceWarning ? 'Variance — reason required' : 'Your legal attestation',
      icon: ClipboardList,
      gradient: varianceWarning ? SURFACES.kpi.g4 : SURFACES.kpi.g1,
    },
    {
      label: 'MTC floor',
      value: isLoading ? '—' : minimumTermCommitment ?? 'Not set',
      hint: belowMtc ? 'Below commitment' : 'Contractual minimum',
      icon: ShieldCheck,
      gradient: belowMtc ? SURFACES.kpi.g4 : SURFACES.kpi.g2,
    },
    {
      label: 'PSF exposure',
      value:
        isLoading || psfTotalMinor === null
          ? '—'
          : formatKobo(psfTotalMinor),
      hint:
        psfRateMinor !== null
          ? `${formatKobo(psfRateMinor)} per student`
          : 'Rate not configured',
      icon: Wallet,
      gradient: psfRateMinor === null ? SURFACES.kpi.g4 : SURFACES.kpi.g2,
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
            <p className={ACADEMIC_UI.sectionLabel}>Principal · irreversible attestation</p>
            <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
              Lock enrollment census
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              Attest the billable student count for this term. Census lock creates PSF obligations
              immediately — not when fees are paid. Requires step-up MFA.
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
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
                <Lock aria-hidden className="size-3.5" />
                Cannot be undone
              </span>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:justify-end">
            <Link href="/school/academic/sessions" className={ACADEMIC_UI.btnSecondary}>
              Back to sessions
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
