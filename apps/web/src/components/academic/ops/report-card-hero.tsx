'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Lock,
  Sparkles,
  Users,
} from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import type { ClassReportCardStats } from '@/lib/academic/report-card-filters';
import { SURFACES } from '@/lib/design/surfaces';

interface ReportCardHeroProps {
  classLabel: string | null;
  termLabel: string | null;
  sessionLabel: string | null;
  stats: ClassReportCardStats;
  passMark: number;
  isLoading?: boolean;
}

export function ReportCardHero({
  classLabel,
  termLabel,
  sessionLabel,
  stats,
  passMark,
  isLoading,
}: ReportCardHeroProps) {
  const completionPercent =
    stats.totalStudents > 0 ? Math.round((stats.completeCount / stats.totalStudents) * 100) : 0;

  const kpiStats = [
    {
      label: 'Students',
      value: isLoading ? '—' : String(stats.totalStudents),
      hint: 'On class roster',
      icon: Users,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Complete',
      value: isLoading ? '—' : `${stats.completeCount}/${stats.totalStudents}`,
      hint: isLoading ? '' : `${completionPercent}% ready to print`,
      icon: ClipboardList,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Class average',
      value: isLoading ? '—' : stats.classAverage != null ? `${stats.classAverage}%` : '—',
      hint: `Pass mark ${passMark}%`,
      icon: Sparkles,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'At risk',
      value: isLoading ? '—' : String(stats.failingCount),
      hint: stats.failingCount > 0 ? 'Below pass mark' : 'All passing',
      icon: AlertTriangle,
      gradient: stats.failingCount > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g2,
    },
  ];

  return (
    <div className="hero-panel rounded-2xl print:hidden">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className={ACADEMIC_UI.sectionLabel}>Term reports · printable</p>
            <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
              Report cards
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              Official student reports with subject breakdown, class position, and grading scale. Live from
              the gradebook until results are published.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {classLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-white/85 px-3 py-1 text-[11px] font-semibold text-brand-800 shadow-sm">
                  <GraduationCap aria-hidden className="size-3.5" />
                  {classLabel}
                </span>
              ) : null}
              {termLabel ? (
                <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                  {termLabel}
                </span>
              ) : null}
              {sessionLabel ? (
                <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                  {sessionLabel}
                </span>
              ) : null}
              {!isLoading && stats.lockedCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent-green-200 bg-accent-green-50 px-3 py-1 text-[11px] font-bold text-accent-green-700">
                  <Lock aria-hidden className="size-3.5" />
                  {stats.lockedCount} locked
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:justify-end">
            <Link href="/school/gradebook" className={ACADEMIC_UI.btnSecondary}>
              <BookOpen aria-hidden className="size-4" />
              Score entry
            </Link>
          </div>
        </div>

        <div className="relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {kpiStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card overflow-hidden rounded-xl p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
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
