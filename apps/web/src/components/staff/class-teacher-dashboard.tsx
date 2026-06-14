'use client';

import {
  useAttendance,
  useMyTimetable,
  useTermEnrollmentRoster,
  useTimetable,
} from '@loomis/api-client';
import type { TimetableEntryResponse } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  GraduationCap,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { TimetableWeekGrid } from '@/components/academic/ops/timetable-week-grid';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatSubjectLabel, todayCalendarDate } from '@/lib/academic/ops-labels';
import { useAcademicOpsContext } from '@/lib/academic/use-academic-ops-context';
import { SURFACES } from '@/lib/design/surfaces';
import { useTeachingStaffScope } from '@/lib/timetable/use-teaching-staff-scope';
import { useBellScheduleSlots } from '@/lib/timetable/use-bell-schedule-slots';

interface ClassTeacherDashboardProps {
  tenantId: string;
  displayName?: string | null;
}

const QUICK_ACTIONS = [
  {
    href: '/school/attendance',
    icon: UserCheck,
    label: 'Mark attendance',
    description: "Today's roll call for your class.",
  },
  {
    href: '/school/gradebook',
    icon: BookOpen,
    label: 'Class gradebook',
    description: 'Read-only view across all subjects.',
  },
  {
    href: '/school/assignments',
    icon: ClipboardList,
    label: 'Assignments',
    description: 'Homework for classes you teach.',
  },
  {
    href: '/school/timetable',
    icon: Calendar,
    label: 'My teaching schedule',
    description: 'Your personal periods — not the whole class grid.',
  },
] as const;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayEntries(entries: TimetableEntryResponse[]): TimetableEntryResponse[] {
  const day = new Date().getDay();
  const isoDay = day === 0 ? 7 : day;
  return entries
    .filter((entry) => entry.dayOfWeek === isoDay)
    .sort((a, b) => a.startMinute - b.startMinute);
}

export function ClassTeacherDashboard({ tenantId, displayName }: ClassTeacherDashboardProps) {
  const ctx = useAcademicOpsContext(tenantId);
  const scope = useTeachingStaffScope(tenantId, { mode: 'classTeacherClass' });
  const classArmId = scope.classTeacherClassArmId;
  const classLabel = scope.classTeacherClassArmLabel ?? 'Your class';
  const termLabel = ctx.activeTerm?.name ?? 'This term';
  const today = todayCalendarDate();

  const rosterQuery = useTermEnrollmentRoster(tenantId, ctx.termId ?? '');
  const attendanceQuery = useAttendance(
    tenantId,
    classArmId && ctx.termId
      ? { termId: ctx.termId, classArmId, attendanceDate: today }
      : null,
  );
  const myScheduleQuery = useMyTimetable(tenantId, ctx.termId);
  const classTimetableQuery = useTimetable(
    tenantId,
    classArmId && ctx.termId ? { termId: ctx.termId, classArmId } : null,
  );
  const { scheduleSlots } = useBellScheduleSlots(tenantId, ctx.yearId);

  const studentCount = useMemo(() => {
    if (!classArmId) return 0;
    return (rosterQuery.data?.entries ?? []).filter(
      (entry) =>
        entry.classArmId === classArmId &&
        (entry.status === 'active' ||
          entry.status === 'active_billable' ||
          entry.status === 'suspended'),
    ).length;
  }, [rosterQuery.data, classArmId]);

  const attendanceToday = useMemo(() => {
    const records = attendanceQuery.data?.records ?? [];
    const totals = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const record of records) {
      if (record.status === 'present') totals.present += 1;
      if (record.status === 'absent') totals.absent += 1;
      if (record.status === 'late') totals.late += 1;
      if (record.status === 'excused') totals.excused += 1;
    }
    const marked = totals.present + totals.absent + totals.late + totals.excused;
    const rate = marked > 0 ? Math.round((totals.present / marked) * 100) : null;
    return { ...totals, marked, rate };
  }, [attendanceQuery.data]);

  const teachingSubjects = useMemo(() => {
    const ids = new Set(
      (scope.teachingQuery.data?.subjectAssignments ?? []).map((a) => a.subjectId),
    );
    return ids.size;
  }, [scope.teachingQuery.data]);

  const myPeriods = myScheduleQuery.data?.entries.length ?? 0;
  const classPeriodsToday = todayEntries(classTimetableQuery.data?.entries ?? []);

  const stats = [
    {
      label: 'Students',
      value: rosterQuery.isLoading ? '—' : String(studentCount),
      hint: 'Enrolled in your class',
      icon: Users,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Attendance today',
      value:
        attendanceQuery.isLoading || attendanceToday.rate === null
          ? '—'
          : `${attendanceToday.rate}%`,
      hint:
        attendanceToday.marked > 0
          ? `${attendanceToday.present} present · ${attendanceToday.absent} absent`
          : 'Not marked yet',
      icon: TrendingUp,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Your subjects',
      value: String(teachingSubjects || '—'),
      hint: 'Assigned this term',
      icon: BookOpen,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Your periods',
      value: myScheduleQuery.isLoading ? '—' : String(myPeriods),
      hint: 'Personal teaching load',
      icon: Calendar,
      gradient: SURFACES.kpi.g4,
    },
  ];

  const firstName = displayName?.split(' ')[0];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
        <div
          className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8"
          style={{ background: SURFACES.hero }}
        >
          <div className="pointer-events-none absolute -left-10 top-8 size-40 rounded-full bg-brand-300/15 blur-3xl" aria-hidden />
          <p className={ACADEMIC_UI.sectionLabel}>Class teacher</p>
          <h1 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
            {firstName ? `${greeting()}, ${firstName}` : 'My class'}
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Everything for <span className="font-semibold text-neutral-700">{classLabel}</span> lives
            here — attendance, gradebook, and class insights. Your personal teaching schedule is under
            My Schedule.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-300/60 bg-white/90 px-3 py-1.5 text-[12px] font-bold text-brand-900">
              <GraduationCap aria-hidden className="size-4" />
              {classLabel}
            </span>
            <span className="rounded-full border border-neutral-200/80 bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-neutral-600">
              {termLabel}
            </span>
          </div>

          <div className="relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="card rounded-xl p-4 sm:p-5">
                  <span
                    className="mb-3 flex size-8 items-center justify-center rounded-xl text-white shadow-sm sm:size-9"
                    style={{ background: stat.gradient }}
                  >
                    <Icon aria-hidden className="size-3.5 sm:size-4" />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    {stat.label}
                  </p>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href + action.label}
              href={action.href}
              className={cn(ACADEMIC_UI.interactiveCard, 'block p-5')}
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-700">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[15px] font-bold text-neutral-900">{action.label}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">{action.description}</p>
            </Link>
          );
        })}
      </div>

      <div className={`${ACADEMIC_UI.dataPanel} p-4 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Class timetable</p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-neutral-900">
              {classLabel} · full week
            </h2>
            <p className="mt-1 text-[13px] text-neutral-500">
              What your class is doing across the week — manage attendance and gradebook from the cards
              above.
            </p>
          </div>
          {classPeriodsToday.length > 0 ? (
            <div className="rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-2 text-[12px] text-neutral-600">
              <span className="font-bold text-neutral-900">Today:</span>{' '}
              {classPeriodsToday
                .slice(0, 3)
                .map((entry) => formatSubjectLabel(entry.subjectId))
                .join(' · ')}
              {classPeriodsToday.length > 3 ? '…' : ''}
            </div>
          ) : null}
        </div>
        <div className="mt-5">
          {!classArmId || !ctx.termId ? (
            <p className="py-8 text-center text-[13px] text-neutral-500">
              Class assignment loading…
            </p>
          ) : (
            <TimetableWeekGrid
              entries={classTimetableQuery.data?.entries ?? []}
              scheduleSlots={scheduleSlots}
              isLoading={classTimetableQuery.isLoading}
              showTermStructure
              emptyMessage="No published timetable for your class yet."
            />
          )}
        </div>
      </div>
    </div>
  );
};
