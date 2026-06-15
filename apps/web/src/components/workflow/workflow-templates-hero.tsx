'use client';

import Link from 'next/link';
import { GitBranch, Layers, ShieldCheck, Timer } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

interface WorkflowTemplatesHeroProps {
  configuredCount: number;
  tenantTypeCount: number;
  mandatoryCount: number;
  isLoading?: boolean;
}

export function WorkflowTemplatesHero({
  configuredCount,
  tenantTypeCount,
  mandatoryCount,
  isLoading,
}: WorkflowTemplatesHeroProps) {
  const stats = [
    {
      label: 'Workflow types',
      value: isLoading ? '—' : String(tenantTypeCount),
      hint: 'Tenant-scoped',
      icon: Layers,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Customised',
      value: isLoading ? '—' : String(configuredCount),
      hint: 'Tenant overrides saved',
      icon: GitBranch,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Mandatory',
      value: isLoading ? '—' : String(mandatoryCount),
      hint: 'Cannot be disabled',
      icon: ShieldCheck,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Escalation',
      value: 'Per step',
      hint: 'Timeout hours configurable',
      icon: Timer,
      gradient: SURFACES.kpi.g4,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className={ACADEMIC_UI.sectionLabel}>Principal · approval chains</p>
            <h1 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
              Workflow templates
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              Configure approver roles and escalation timeouts for school workflows. Platform defaults
              apply until you save a tenant override.
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:justify-end">
            <Link href="/school/workflows" className={ACADEMIC_UI.btnSecondary}>
              Back to inbox
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
