'use client';

import { useMyTimetable, useTeachingStaffContext } from '@loomis/api-client';
import type { TimetableEntryResponse } from '@loomis/contracts';
import { Alert, AlertDescription, cn } from '@loomis/ui-web';
import { BookOpen, CalendarDays, Clock, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';

import { TimetableWeekGrid } from '@/components/academic/ops/timetable-week-grid';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import { useAcademicOpsContext } from '@/lib/academic/use-academic-ops-context';
import { SURFACES } from '@/lib/design/surfaces';
import { useBellScheduleSlots } from '@/lib/timetable/use-bell-schedule-slots';

interface MyScheduleViewProps {
  tenantId: string;
}

function uniqueClasses(entries: TimetableEntryResponse[]): number {
  return new Set(entries.map((entry) => entry.classArmId)).size;
}

export function MyScheduleView({ tenantId }: MyScheduleViewProps) {
  const ctx = useAcademicOpsContext(tenantId);
  const teachingQuery = useTeachingStaffContext(tenantId, ctx.termId);
  const [subjectFilter, setSubjectFilter] = useState<string | 'all'>('all');

  const { scheduleSlots } = useBellScheduleSlots(tenantId, ctx.yearId);
  const scheduleQuery = useMyTimetable(tenantId, ctx.termId);
  const entries = scheduleQuery.data?.entries ?? [];

  const subjectOptions = useMemo(() => {
    const fromTeaching = teachingQuery.data?.subjectAssignments ?? [];

    const bySubject = new Map<string, { subjectId: string; label: string; periodCount: number }>();

    for (const assignment of fromTeaching) {
      if (!bySubject.has(assignment.subjectId)) {
        bySubject.set(assignment.subjectId, {
          subjectId: assignment.subjectId,
          label: formatSubjectLabel(assignment.subjectId),
          periodCount: 0,
        });
      }
    }

    for (const entry of entries) {
      const existing = bySubject.get(entry.subjectId);
      if (existing) {
        existing.periodCount += 1;
      } else {
        bySubject.set(entry.subjectId, {
          subjectId: entry.subjectId,
          label: formatSubjectLabel(entry.subjectId),
          periodCount: 1,
        });
      }
    }

    return [...bySubject.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [entries, teachingQuery.data?.subjectAssignments]);

  const filteredEntries = useMemo(() => {
    if (subjectFilter === 'all') return entries;
    return entries.filter((entry) => entry.subjectId === subjectFilter);
  }, [entries, subjectFilter]);

  const classCount = uniqueClasses(entries);

  const stats = [
    {
      label: 'Subjects',
      value: subjectOptions.length || '—',
      hint: 'Assigned this term',
      icon: BookOpen,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Periods',
      value: scheduleQuery.isLoading ? '—' : String(entries.length),
      hint: 'On your timetable',
      icon: Layers,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Classes',
      value: scheduleQuery.isLoading ? '—' : String(classCount),
      hint: 'You teach across',
      icon: CalendarDays,
      gradient: SURFACES.kpi.g3,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
        <div
          className="relative px-4 pb-14 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8"
          style={{ background: SURFACES.hero }}
        >
          <div className="pointer-events-none absolute -right-20 top-0 size-56 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />
          <p className={ACADEMIC_UI.sectionLabel}>Teaching</p>
          <h1 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
            My schedule
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Your published periods for {ctx.activeTerm?.name ?? 'this term'}. Pick a subject to focus the
            grid — same view for every teacher.
          </p>
          <span className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-brand-200/80 bg-white/90 px-3 py-2 shadow-xs sm:min-h-0">
            <CalendarDays aria-hidden className="size-4 shrink-0 text-brand-600" />
            <span className="text-[13px] font-bold text-neutral-900">
              {ctx.activeYear?.label ?? 'Academic year'} · {ctx.activeTerm?.name ?? 'Term'}
            </span>
          </span>

          <div className="relative z-10 -mb-20 mt-6 grid grid-cols-3 gap-3 sm:gap-4">
            {stats.map((stat) => {
              const StatIcon = stat.icon;
              return (
                <div key={stat.label} className="card rounded-xl p-4 sm:p-5">
                  <span
                    className="mb-3 flex size-8 items-center justify-center rounded-xl text-white shadow-sm sm:size-9"
                    style={{ background: stat.gradient }}
                  >
                    <StatIcon aria-hidden className="size-3.5 sm:size-4" />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    {stat.label}
                  </p>
                  <p
                    className="mt-1 tabular-nums leading-none text-neutral-900"
                    style={{
                      fontSize: 'clamp(1.25rem, 2vw, 1.625rem)',
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

      {!ctx.termId ? (
        <div className={`${ACADEMIC_UI.dataPanel} p-8 text-center`}>
          <p className="text-[13px] text-neutral-500">No term selected in the session bar.</p>
        </div>
      ) : scheduleQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{academicErrorMessage(scheduleQuery.error)}</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className={`${ACADEMIC_UI.dataPanel} p-4 sm:p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={ACADEMIC_UI.sectionLabel}>Your subjects</p>
                <p className="mt-1 text-[13px] text-neutral-500">
                  Tap a subject to filter your weekly grid.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400">
                <Clock aria-hidden className="size-3.5" />
                {filteredEntries.length} period{filteredEntries.length === 1 ? '' : 's'} shown
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSubjectFilter('all')}
                className={cn(
                  'rounded-xl px-3.5 py-2 text-[12px] font-bold transition min-h-[44px] sm:min-h-0',
                  subjectFilter === 'all' ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive,
                )}
              >
                All subjects
              </button>
              {subjectOptions.map((subject) => (
                <button
                  key={subject.subjectId}
                  type="button"
                  onClick={() => setSubjectFilter(subject.subjectId)}
                  className={cn(
                    'rounded-xl px-3.5 py-2 text-[12px] font-bold transition min-h-[44px] sm:min-h-0',
                    subjectFilter === subject.subjectId
                      ? ACADEMIC_UI.chipActive
                      : ACADEMIC_UI.chipInactive,
                  )}
                >
                  {subject.label}
                  {subject.periodCount > 0 ? (
                    <span className="ml-1.5 text-[10px] font-semibold opacity-70">
                      · {subject.periodCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className={`${ACADEMIC_UI.dataPanel} p-4 sm:p-5`}>
            <TimetableWeekGrid
              entries={filteredEntries}
              scheduleSlots={scheduleSlots}
              isLoading={scheduleQuery.isLoading}
              showTermStructure
              showClassLabel
              emptyMessage={
                subjectFilter === 'all'
                  ? 'No published periods assigned to you this term yet.'
                  : 'No periods for this subject on your timetable.'
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
