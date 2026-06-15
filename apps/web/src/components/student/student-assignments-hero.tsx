'use client';

import { CheckCircle2, ClipboardList, Clock, Sparkles } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

interface StudentAssignmentsHeroProps {
  termLabel: string | null;
  totalCount: number;
  submittedCount: number;
  pendingCount: number;
  isLoading?: boolean;
}

export function StudentAssignmentsHero({
  termLabel,
  totalCount,
  submittedCount,
  pendingCount,
  isLoading,
}: StudentAssignmentsHeroProps) {
  const stats = [
    {
      label: 'Published',
      value: isLoading ? '—' : String(totalCount),
      hint: 'Assignments this term',
      icon: ClipboardList,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Submitted',
      value: isLoading ? '—' : String(submittedCount),
      hint: 'Turned in on time',
      icon: CheckCircle2,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Pending',
      value: isLoading ? '—' : String(pendingCount),
      hint: pendingCount > 0 ? 'Still due' : 'All caught up',
      icon: Clock,
      gradient: pendingCount > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g2,
    },
    {
      label: 'Progress',
      value: isLoading ? '—' : totalCount > 0 ? `${Math.round((submittedCount / totalCount) * 100)}%` : '—',
      hint: 'Submission rate',
      icon: Sparkles,
      gradient: SURFACES.kpi.g1,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />

        <div className="relative min-w-0">
          <p className={ACADEMIC_UI.sectionLabel}>Student portal · homework</p>
          <h1 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
            My assignments
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Published homework from your teachers. Submit answers before the due date.
          </p>
          {termLabel ? (
            <div className="mt-3">
              <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                {termLabel}
              </span>
            </div>
          ) : null}
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
                    fontSize: 'clamp(1.375rem, 2vw, 1.75rem)',
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
