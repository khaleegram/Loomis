'use client';

import type { TimetableTermSummaryResponse } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, Clock, GraduationCap, Layers, Sparkles } from 'lucide-react';

import { TimetableClassRail } from '@/components/academic/ops/timetable-class-rail';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useSchoolAcademic } from '@/lib/academic/school-academic-context';
import { PERIOD_PRESETS } from '@/lib/timetable/timetable-utils';
import { SURFACES } from '@/lib/design/surfaces';

interface TimetableCommandStripProps {
  classArmId: string | null;
  classLabel: string | null;
  onSelectClassArm: (id: string) => void;
  summary: TimetableTermSummaryResponse | null;
  summaryLoading?: boolean;
  selectedLessonCount?: number;
  selectedDraftCount?: number;
  publishHref?: string;
  actions?: React.ReactNode;
}

function termStatusBadge(status: string): string {
  switch (status) {
    case 'open':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'census_locked':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    default:
      return 'border-neutral-200 bg-neutral-50 text-neutral-600';
  }
}

export function TimetableCommandStrip({
  classArmId,
  classLabel,
  onSelectClassArm,
  summary,
  summaryLoading,
  selectedLessonCount = 0,
  selectedDraftCount = 0,
  publishHref,
  actions,
}: TimetableCommandStripProps) {
  const { activeYear, activeTerm } = useSchoolAcademic();
  const termLabel = activeTerm?.name ?? null;

  const published = summary?.publishedClassArms ?? 0;
  const total = summary?.totalClassArms ?? 0;
  const progressPct = total > 0 ? Math.round((published / total) * 100) : 0;

  const kpis = [
    {
      label: 'Published',
      value: summaryLoading || !summary ? '—' : `${published}/${total}`,
      hint: 'classes live',
      icon: GraduationCap,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Bell periods',
      value: String(summary?.bellPeriodsPerDay ?? PERIOD_PRESETS.length),
      hint: 'tap to configure',
      icon: Clock,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Drafts',
      value: summaryLoading || !summary ? '—' : String(summary.totalDraftSlots),
      hint: (summary?.totalDraftSlots ?? 0) > 0 ? 'review pending' : 'none pending',
      icon: Layers,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Term',
      value:
        summaryLoading || !summary
          ? '—'
          : total > 0 && published === total
            ? 'Done'
            : published > 0
              ? 'Active'
              : 'New',
      hint: summary ? `${summary.totalPublishedSlots} lessons` : '…',
      icon: CheckCircle2,
      gradient: SURFACES.kpi.g4,
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      <div className="relative px-4 pb-14 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8" style={{ background: SURFACES.hero }}>
        <div
          className="pointer-events-none absolute -left-10 top-8 size-40 rounded-full bg-brand-300/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 -top-10 size-56 rounded-full bg-brand-400/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-600 shadow-sm">
                <Sparkles aria-hidden className="size-3.5 text-white" />
              </span>
              <p className={ACADEMIC_UI.sectionLabel}>Timetable officer</p>
            </div>
            <h1 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
              Term command centre
            </h1>
            <p className="max-w-xl text-[14px] leading-relaxed text-neutral-500">
              Pick a class, fill the week, then review and publish the whole term in one go.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <span className="inline-flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-brand-200/80 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-sm sm:min-h-0 sm:w-auto">
              <CalendarDays aria-hidden className="size-4 shrink-0 text-brand-600" />
              <span className="text-[13px] font-bold text-neutral-900">
                {activeYear?.label ?? 'Year'}
                {activeTerm ? ` · ${activeTerm.name}` : ''}
              </span>
              {activeTerm ? (
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase',
                    termStatusBadge(activeTerm.status),
                  )}
                >
                  {activeTerm.status.replace('_', ' ')}
                </span>
              ) : null}
            </span>
            {actions ? <div className="flex w-full flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
          </div>
        </div>

        <div className="relative z-10 -mb-20 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((kpi) => {
            const Inner = kpi.icon;
            const inner = (
              <div className="card overflow-hidden rounded-xl p-4 transition duration-200 hover:shadow-md sm:p-5">
                <span
                  className="mb-3 flex size-9 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ background: kpi.gradient }}
                >
                  <Inner aria-hidden className="size-4" />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">{kpi.label}</p>
                <p
                  className="mt-1 tabular-nums leading-none text-neutral-900"
                  style={{ fontSize: 'clamp(1.25rem, 2vw, 1.65rem)', fontWeight: 800, letterSpacing: '-0.02em' }}
                >
                  {kpi.value}
                </p>
                <p className="mt-1 text-[11px] font-medium text-neutral-500">{kpi.hint}</p>
              </div>
            );

            if (kpi.label === 'Bell periods') {
              return (
                <Link
                  key={kpi.label}
                  href="/school/timetable/bell-schedule"
                  className="block rounded-xl outline-none ring-brand-400 focus-visible:ring-2"
                >
                  {inner}
                </Link>
              );
            }

            if (kpi.label === 'Published' && publishHref) {
              return (
                <Link
                  key={kpi.label}
                  href={publishHref}
                  className="block rounded-xl outline-none ring-brand-400 focus-visible:ring-2"
                >
                  {inner}
                </Link>
              );
            }

            if (kpi.label === 'Drafts' && publishHref && (summary?.totalDraftSlots ?? 0) > 0) {
              return (
                <Link
                  key={kpi.label}
                  href={publishHref}
                  className="block rounded-xl outline-none ring-brand-400 focus-visible:ring-2"
                >
                  {inner}
                </Link>
              );
            }

            return <div key={kpi.label}>{inner}</div>;
          })}
        </div>

        {!summaryLoading && summary && total > 0 ? (
          <div className="relative mt-5 rounded-xl border border-white/60 bg-white/50 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-neutral-600">{termLabel} rollout</span>
              <span className="text-[11px] font-extrabold tabular-nums text-brand-800">{progressPct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 via-brand-400 to-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {summary && summary.classArms.length > 0 ? (
        <TimetableClassRail
          classArms={summary.classArms}
          selectedClassArmId={classArmId}
          onSelectClassArm={onSelectClassArm}
          classLabel={classLabel}
          lessonCount={selectedLessonCount}
          draftCount={selectedDraftCount}
        />
      ) : null}
    </section>
  );
}
