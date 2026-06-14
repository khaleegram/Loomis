'use client';

import type { AttendanceRecordResponse, AttendanceTermSummary } from '@loomis/contracts';
import { cn, Skeleton } from '@loomis/ui-web';
import { CalendarDays, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

import { AttendanceStatusToggle } from '@/components/academic/ops/attendance-status-toggle';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import {
  ATTENDANCE_STATUS_META,
  attendanceRatePercent,
  groupAttendanceByMonth,
} from '@/lib/academic/attendance-labels';
import { shortDateLabel, weekdayLabel } from '@/lib/academic/ops-labels';
import { SURFACES } from '@/lib/design/surfaces';

interface AttendanceTermViewProps {
  title: string;
  subtitle: string;
  classArmLabel: string | null;
  termLabel?: string | null;
  records: AttendanceRecordResponse[];
  summary: AttendanceTermSummary;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function AttendanceTermView({
  title,
  subtitle,
  classArmLabel,
  termLabel,
  records,
  summary,
  isLoading,
  readOnly = true,
}: AttendanceTermViewProps) {
  const rate = attendanceRatePercent(summary);
  const monthGroups = useMemo(() => groupAttendanceByMonth(records), [records]);

  const stats = [
    { label: 'Rate', value: `${rate}%`, hint: 'Present + late', gradient: SURFACES.kpi.g1 },
    { label: 'Present', value: String(summary.present), hint: `${summary.late} late`, gradient: SURFACES.kpi.g2 },
    { label: 'Absent', value: String(summary.absent), hint: `${summary.excused} excused`, gradient: SURFACES.kpi.g4 },
    {
      label: 'Logged days',
      value: String(records.length),
      hint: termLabel ?? 'This term',
      gradient: SURFACES.kpi.g3,
    },
  ];

  if (isLoading) {
    return <Skeleton className="h-[480px] w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
        <div
          className="relative px-4 pb-14 pt-6 sm:px-6 sm:pb-16 sm:pt-8"
          style={{ background: SURFACES.hero }}
        >
          <p className={ACADEMIC_UI.sectionLabel}>Attendance record</p>
          <h2 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
            {title}
          </h2>
          <p className={ACADEMIC_UI.pageDesc}>{subtitle}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {classArmLabel ? (
              <span className="rounded-full border border-brand-200/60 bg-white/85 px-3 py-1 text-[11px] font-semibold text-brand-800">
                {classArmLabel}
              </span>
            ) : null}
            {termLabel ? (
              <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                {termLabel}
              </span>
            ) : null}
            {readOnly ? (
              <span className="rounded-full border border-neutral-200 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-500">
                Read only
              </span>
            ) : null}
          </div>

          <div className="relative z-10 -mb-20 mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">{stat.label}</p>
                <p
                  className="mt-1 tabular-nums text-neutral-900"
                  style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] text-neutral-500">{stat.hint}</p>
                <div className="mt-1 h-0.5 w-6 rounded-full opacity-30" style={{ background: stat.gradient }} />
              </div>
            ))}
          </div>
        </div>

        {records.length > 0 ? (
          <div className="border-t border-brand-50 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <TrendingUp aria-hidden className="size-4 text-brand-600" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={cn(
                    'h-full rounded-full',
                    rate >= 90 ? 'bg-accent-green-500' : rate >= 75 ? 'bg-brand-500' : 'bg-amber-500',
                  )}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="text-[13px] font-bold tabular-nums">{rate}% term rate</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-10 space-y-5">
        {records.length === 0 ? (
          <div className={`${ACADEMIC_UI.dataPanel} p-10 text-center`}>
            <CalendarDays className="mx-auto size-8 text-neutral-300" aria-hidden />
            <p className="mt-3 text-[15px] font-semibold text-neutral-800">No attendance logged yet</p>
            <p className="mt-1 text-[13px] text-neutral-500">
              Records appear here after the class teacher submits daily roll call.
            </p>
          </div>
        ) : (
          monthGroups.map((group) => (
            <section key={group.monthKey} className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
              <div className={`${ACADEMIC_UI.tableHeader} flex flex-wrap items-center justify-between gap-3 border-b border-brand-100/40 px-4 py-3 sm:px-6`}>
                <div>
                  <p className={ACADEMIC_UI.sectionLabel}>Month</p>
                  <h3 className="text-base font-extrabold text-neutral-900">{group.label}</h3>
                </div>
                <p className="text-[12px] font-medium text-neutral-500">
                  {group.summary.present}P · {group.summary.absent}A · {group.summary.late}L · {group.summary.excused}E
                </p>
              </div>
              <ul className="divide-y divide-neutral-100">
                {group.records.map((record) => {
                  const meta = ATTENDANCE_STATUS_META[record.status];
                  return (
                    <li
                      key={record.id}
                      className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div>
                        <p className="text-[14px] font-bold text-neutral-900">
                          {weekdayLabel(record.attendanceDate)} · {shortDateLabel(record.attendanceDate)}
                        </p>
                        <p className={`mt-0.5 text-[12px] font-semibold ${meta.textClass}`}>{meta.label}</p>
                      </div>
                      <AttendanceStatusToggle value={record.status} onChange={() => {}} disabled compact />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
