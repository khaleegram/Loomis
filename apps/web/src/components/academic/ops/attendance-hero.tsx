'use client';

import { cn } from '@loomis/ui-web';
import {
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Sparkles,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { attendanceRatePercent } from '@/lib/academic/attendance-labels';
import { SURFACES } from '@/lib/design/surfaces';

interface AttendanceHeroProps {
  classLabel: string | null;
  termLabel: string | null;
  selectedDateLabel: string;
  canMark: boolean;
  canMarkToday: boolean;
  summary: { present: number; absent: number; late: number; excused: number };
  rosterCount: number;
  submittedCount: number;
  pendingChanges: number;
  isLoading?: boolean;
  onMarkAllPresent?: () => void;
}

export function AttendanceHero({
  classLabel,
  termLabel,
  selectedDateLabel,
  canMark,
  canMarkToday,
  summary,
  rosterCount,
  submittedCount,
  pendingChanges,
  isLoading,
  onMarkAllPresent,
}: AttendanceHeroProps) {
  const rate = attendanceRatePercent(summary);
  const notMarked = Math.max(0, rosterCount - submittedCount);
  const isComplete = rosterCount > 0 && submittedCount >= rosterCount && pendingChanges === 0;

  const stats = [
    {
      label: 'Attendance rate',
      value: isLoading ? '—' : `${rate}%`,
      hint: 'Present + late ÷ enrolled',
      icon: Sparkles,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Present',
      value: isLoading ? '—' : String(summary.present),
      hint: `${summary.late} late today`,
      icon: CheckCircle2,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Absent',
      value: isLoading ? '—' : String(summary.absent),
      hint: `${summary.excused} excused`,
      icon: UserX,
      gradient: SURFACES.kpi.g4,
    },
    {
      label: 'Roster',
      value: isLoading ? '—' : String(rosterCount),
      hint: notMarked > 0 ? `${notMarked} not submitted` : 'All logged',
      icon: Users,
      gradient: SURFACES.kpi.g3,
    },
  ];

  return (
    <div className="hero-panel rounded-2xl">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 size-32 rounded-full bg-accent-green-400/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className={ACADEMIC_UI.sectionLabel}>Class teacher · daily roll call</p>
            <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
              Attendance register
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              {canMark
                ? 'Tap a status for each student, use keyboard 1–4 when a row is focused, then submit once for the whole class.'
                : 'Read-only attendance register for oversight roles.'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {classLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-white/85 px-3 py-1 text-[11px] font-semibold text-brand-800 shadow-sm">
                  <ClipboardCheck aria-hidden className="size-3.5" />
                  {classLabel}
                </span>
              ) : null}
              {termLabel ? (
                <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                  {termLabel}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                <CalendarCheck aria-hidden className="size-3.5 text-brand-600" />
                {selectedDateLabel}
              </span>
              {isComplete ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent-green-200 bg-accent-green-50 px-3 py-1 text-[11px] font-bold text-accent-green-700">
                  <CheckCircle2 aria-hidden className="size-3.5" />
                  Submitted
                </span>
              ) : pendingChanges > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
                  <Clock aria-hidden className="size-3.5" />
                  {pendingChanges} unsaved
                </span>
              ) : null}
            </div>
          </div>

          {canMark && canMarkToday && onMarkAllPresent && rosterCount > 0 ? (
            <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:justify-end">
              <button type="button" className={ACADEMIC_UI.btnSecondary} onClick={onMarkAllPresent}>
                <UserCheck aria-hidden className="size-4" />
                Mark all present
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
                <div className="mt-1 h-0.5 w-6 rounded-full opacity-30" style={{ background: stat.gradient }} />
              </div>
            );
          })}
        </div>
      </div>

      {rate > 0 && rosterCount > 0 ? (
        <div className="border-t border-brand-50 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={ACADEMIC_UI.sectionLabel}>Today at a glance</p>
            <div className="flex flex-1 items-center gap-3 sm:max-w-md">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    rate >= 90 ? 'bg-accent-green-500' : rate >= 75 ? 'bg-brand-500' : 'bg-amber-500',
                  )}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="text-[13px] font-bold tabular-nums text-neutral-800">{rate}%</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
