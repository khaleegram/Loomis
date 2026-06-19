'use client';

import type { TimetableTermSummaryResponse } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';
import { CalendarDays, CheckCircle2, Clock, GraduationCap, Layers } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { PERIOD_PRESETS } from '@/lib/timetable/timetable-utils';
import { SURFACES } from '@/lib/design/surfaces';

interface TimetableHeroProps {
  canManage: boolean;
  classLabel: string | null;
  termLabel: string | null;
  actions?: React.ReactNode;
  summary?: TimetableTermSummaryResponse | null;
  summaryLoading?: boolean;
  selectedClassArmId?: string | null;
  onSelectClassArm?: (classArmId: string) => void;
  /** Read-only viewers (teacher / parent). */
  lessonCount?: number;
  isLoading?: boolean;
  /** Teacher personal schedule vs class-by-class view. */
  viewerMode?: 'class' | 'personal';
}

function classStatusDot(status: 'empty' | 'draft' | 'published'): string {
  switch (status) {
    case 'published':
      return 'bg-accent-green-500';
    case 'draft':
      return 'bg-gold-500';
    default:
      return 'bg-neutral-300';
  }
}

export function TimetableHero({
  canManage,
  classLabel,
  termLabel,
  actions,
  summary,
  summaryLoading,
  selectedClassArmId,
  onSelectClassArm,
  lessonCount = 0,
  isLoading,
  viewerMode = 'class',
}: TimetableHeroProps) {
  const bellPeriods = summary?.bellPeriodsPerDay ?? PERIOD_PRESETS.length;

  const builderStats =
    canManage && (summary || summaryLoading)
      ? [
          {
            label: 'Classes published',
            value:
              summaryLoading || !summary ? '—' : `${summary.publishedClassArms}/${summary.totalClassArms}`,
            hint: termLabel ? `${termLabel} progress` : 'This term',
            icon: GraduationCap,
            gradient: SURFACES.kpi.g1,
          },
          {
            label: 'Bell periods',
            value: summaryLoading ? '—' : String(bellPeriods),
            hint: 'Same times every school day',
            icon: Clock,
            gradient: SURFACES.kpi.g2,
          },
          {
            label: 'Draft lessons',
            value: summaryLoading || !summary ? '—' : String(summary.totalDraftSlots),
            hint:
              summary && summary.draftClassArms > 0
                ? `${summary.draftClassArms} classes need publish`
                : 'All clear',
            icon: Layers,
            gradient: SURFACES.kpi.g3,
          },
          {
            label: 'Term status',
            value:
              summaryLoading || !summary
                ? '—'
                : summary.totalClassArms === 0
                  ? 'No classes'
                  : summary.publishedClassArms === summary.totalClassArms
                    ? 'Complete'
                    : summary.publishedClassArms === 0 && summary.draftClassArms === 0
                      ? 'Not started'
                      : 'In progress',
            hint: summary ? `${summary.totalPublishedSlots.toLocaleString()} lessons live` : 'Loading…',
            icon: CheckCircle2,
            gradient: SURFACES.kpi.g4,
          },
        ]
      : [];

  const viewerStats = [
    {
      label: 'Lessons',
      value: isLoading ? '—' : String(lessonCount),
      hint: viewerMode === 'personal' ? 'Your assigned periods' : classLabel ?? 'This class',
      icon: Layers,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Bell periods',
      value: String(PERIOD_PRESETS.length),
      hint: 'Mon–Fri school day',
      icon: Clock,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Status',
      value: isLoading ? '—' : lessonCount > 0 ? 'Live' : 'Empty',
      hint: termLabel ?? 'Current term',
      icon: CheckCircle2,
      gradient: SURFACES.kpi.g3,
    },
  ];

  const stats = canManage ? builderStats : viewerStats;

  return (
    <div className="hero-panel rounded-2xl">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className={ACADEMIC_UI.sectionLabel}>Academic operations</p>
            <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
              {canManage
                ? 'Timetable builder'
                : viewerMode === 'personal'
                  ? 'My teaching schedule'
                  : 'Class timetable'}
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              {canManage
                ? 'Your term command centre — see every class, fill the bell schedule, publish when ready (US-ACA-006).'
                : viewerMode === 'personal'
                  ? 'Published periods where you are assigned to teach. Updates when the timetable officer publishes changes.'
                  : 'Published schedule for the selected class. Updates when your school publishes changes.'}
            </p>
            {classLabel || termLabel ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {classLabel ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-white/80 px-3 py-1 text-[11px] font-semibold text-brand-800">
                    <CalendarDays aria-hidden className="size-3.5" />
                    Editing {classLabel}
                  </span>
                ) : null}
                {termLabel ? (
                  <span className="rounded-full border border-neutral-200/80 bg-white/70 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                    {termLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {actions ? (
            <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:justify-end">{actions}</div>
          ) : null}
        </div>

        {stats.length > 0 ? (
          <div
            className={cn(
              'relative z-10 -mb-24 mt-6 grid gap-3 sm:gap-4',
              canManage ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3',
            )}
          >
            {stats.map((stat) => {
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    {stat.label}
                  </p>
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
                  <div className="mt-1 h-0.5 w-6 rounded-full opacity-30" style={{ background: stat.gradient }} />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {canManage && summary && summary.classArms.length > 0 ? (
        <div className="border-t border-brand-50 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <p className={ACADEMIC_UI.sectionLabel}>All classes this term — tap to jump</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {summary.classArms.map((arm) => {
              const selected = arm.classArmId === selectedClassArmId;
              return (
                <button
                  key={arm.classArmId}
                  type="button"
                  onClick={() => onSelectClassArm?.(arm.classArmId)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition min-h-[44px] sm:min-h-0',
                    selected
                      ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-300'
                      : 'border-neutral-200 bg-white hover:border-brand-200 hover:bg-brand-50/40',
                  )}
                >
                  <span className={cn('size-2 shrink-0 rounded-full', classStatusDot(arm.status))} aria-hidden />
                  <span className="text-[12px] font-bold text-neutral-900">{arm.classArmLabel}</span>
                  <span className="text-[10px] font-medium text-neutral-400">
                    {arm.lessonCount > 0 ? `${arm.lessonCount} lessons` : 'Empty'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
