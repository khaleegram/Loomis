'use client';

import type { AttendanceRecordResponse, AttendanceStatus, StudentResponse } from '@loomis/contracts';
import { cn, Skeleton } from '@loomis/ui-web';
import { AlertCircle, ChevronRight, Loader2, Search, Send, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AttendanceStatusToggle } from '@/components/academic/ops/attendance-status-toggle';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import {
  ATTENDANCE_STATUS_META,
  ATTENDANCE_STATUSES,
  studentInitials,
} from '@/lib/academic/attendance-labels';
import {
  shortDateLabel,
  todayCalendarDate,
  weekDatesContaining,
  weekdayLabel,
} from '@/lib/academic/ops-labels';
import { SEMANTIC } from '@/lib/design/surfaces';
import { studentDisplayName } from '@/lib/student/student-labels';

export interface AttendanceRosterRow {
  student: StudentResponse;
  record: AttendanceRecordResponse | null;
}

type RosterFilter = 'all' | 'absent' | 'late' | 'unmarked';

interface AttendanceWeekRosterProps {
  weekDates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  rows: AttendanceRosterRow[];
  draftStatuses: Record<string, AttendanceStatus>;
  onDraftChange: (studentId: string, status: AttendanceStatus) => void;
  onSubmit: () => Promise<void>;
  isSubmitting?: boolean;
  isLoading?: boolean;
  canMarkToday: boolean;
  errorMessage?: string | null;
  focusedStudentId?: string | null;
  onFocusStudent?: (studentId: string) => void;
  onAmendRecord?: (row: AttendanceRosterRow) => void;
}

export function AttendanceWeekRosterSkeleton() {
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[220px_1fr]">
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-[520px] rounded-2xl" />
    </div>
  );
}

export function AttendanceWeekRoster({
  weekDates,
  selectedDate,
  onSelectDate,
  rows,
  draftStatuses,
  onDraftChange,
  onSubmit,
  isSubmitting,
  isLoading,
  canMarkToday,
  errorMessage,
  focusedStudentId,
  onFocusStudent,
  onAmendRecord,
}: AttendanceWeekRosterProps) {
  const today = todayCalendarDate();
  const isToday = selectedDate === today;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RosterFilter>('all');

  const resolveStatus = useCallback(
    (row: AttendanceRosterRow): AttendanceStatus =>
      draftStatuses[row.student.id] ?? row.record?.status ?? 'present',
    [draftStatuses],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const status = resolveStatus(row);
      if (filter === 'absent' && status !== 'absent') return false;
      if (filter === 'late' && status !== 'late') return false;
      if (filter === 'unmarked' && row.record) return false;
      if (!query) return true;
      const name = studentDisplayName(row.student.firstName, row.student.lastName).toLowerCase();
      return name.includes(query) || row.student.admissionNo.toLowerCase().includes(query);
    });
  }, [filter, resolveStatus, rows, search]);

  const pendingChanges = useMemo(
    () =>
      rows.filter((row) => {
        const draft = draftStatuses[row.student.id];
        return draft !== undefined && draft !== (row.record?.status ?? 'present');
      }).length,
    [draftStatuses, rows],
  );

  const handleGlobalKey = useCallback(
    (event: KeyboardEvent) => {
      if (!focusedStudentId || !isToday || !canMarkToday) return;
      const map = Object.fromEntries(
        ATTENDANCE_STATUSES.map((status) => [ATTENDANCE_STATUS_META[status].shortcut, status]),
      ) as Record<string, AttendanceStatus>;
      const next = map[event.key];
      if (next) {
        event.preventDefault();
        onDraftChange(focusedStudentId, next);
      }
    },
    [canMarkToday, focusedStudentId, isToday, onDraftChange],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleGlobalKey]);

  if (isLoading) {
    return <AttendanceWeekRosterSkeleton />;
  }

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(200px,240px)_1fr]">
      {/* Week navigator */}
      <aside className={`${ACADEMIC_UI.dataPanel} h-fit p-3 sm:p-4`}>
        <p className={ACADEMIC_UI.sectionLabel}>School week</p>
        <p className="mt-1 text-[13px] font-semibold text-neutral-800">Mon – Fri roll call</p>
        <div className="mt-3 flex flex-col gap-1.5">
          {weekDates.map((date) => {
            const selected = date === selectedDate;
            const isDayToday = date === today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelectDate(date)}
                className={cn(
                  'group flex min-h-[52px] items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all',
                  selected
                    ? 'border-brand-400 bg-brand-50 shadow-sm ring-1 ring-brand-300/60'
                    : 'border-transparent bg-neutral-50/80 hover:border-brand-100 hover:bg-brand-50/40',
                  isDayToday && !selected && 'ring-1 ring-brand-200/50',
                )}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    {weekdayLabel(date)}
                  </p>
                  <p className="text-[14px] font-bold text-neutral-900">{shortDateLabel(date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isDayToday ? (
                    <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-neutral-900">
                      Today
                    </span>
                  ) : null}
                  <ChevronRight
                    aria-hidden
                    className={cn(
                      'size-4 text-neutral-300 transition group-hover:text-brand-500',
                      selected && 'text-brand-600',
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Roster panel */}
      <section className={`${ACADEMIC_UI.dataPanel} flex flex-col overflow-hidden`}>
        <div className={`${ACADEMIC_UI.tableHeader} border-b border-brand-100/40 px-4 py-4 sm:px-6`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={ACADEMIC_UI.sectionLabel}>Class roster</p>
              <h2 className="text-lg font-extrabold tracking-tight text-neutral-900 sm:text-xl">
                {weekdayLabel(selectedDate)} · {shortDateLabel(selectedDate)}
              </h2>
              <p className="mt-1 text-[12px] text-neutral-500">
                {filteredRows.length} of {rows.length} students
                {isToday && canMarkToday ? ' · focus a row, press 1–4 to mark fast' : ''}
              </p>
            </div>

            <div className="relative w-full lg:max-w-xs">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or admission no."
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-9 text-[13px] outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                ['all', 'All'],
                ['unmarked', 'Not submitted'],
                ['absent', 'Absent'],
                ['late', 'Late'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  'shrink-0 rounded-xl px-3.5 py-2 text-[12px] font-semibold transition min-h-[44px] sm:min-h-0',
                  filter === key ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive,
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!isToday ? (
          <div className={`mx-4 mt-4 rounded-xl border px-4 py-3 sm:mx-6 ${SEMANTIC.warning.surfaceSubtle}`}>
            <p className={`text-[13px] font-medium ${SEMANTIC.warning.textStrong}`}>
              Viewing history — online marking is only available for today ({shortDateLabel(today)}).
            </p>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <AlertCircle className="size-8 text-neutral-300" aria-hidden />
              <p className="text-[14px] font-semibold text-neutral-700">No students in this class</p>
              <p className="max-w-sm text-[13px] text-neutral-500">
                Enroll students for this term or pick another class from the scope bar above.
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="px-6 py-12 text-center text-[13px] text-neutral-500">
              No students match your search or filter.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {filteredRows.map((row, index) => {
                const status = resolveStatus(row);
                const focused = focusedStudentId === row.student.id;
                const meta = ATTENDANCE_STATUS_META[status];
                const amended = (row.record?.amendmentCount ?? 0) > 0;

                return (
                  <li
                    key={row.student.id}
                    className={cn(
                      'flex flex-col gap-3 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between sm:px-6',
                      focused && 'bg-brand-50/40',
                    )}
                    tabIndex={0}
                    onFocus={() => onFocusStudent?.(row.student.id)}
                    onMouseEnter={() => onFocusStudent?.(row.student.id)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'flex size-11 shrink-0 items-center justify-center rounded-2xl text-[13px] font-bold text-white shadow-sm',
                        )}
                        style={{ background: meta.gradient }}
                        aria-hidden
                      >
                        {studentInitials(row.student.firstName, row.student.lastName)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[15px] font-bold text-neutral-900">
                            {studentDisplayName(row.student.firstName, row.student.lastName)}
                          </p>
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-neutral-500">
                            #{String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <p className="text-[12px] font-medium text-neutral-500">{row.student.admissionNo}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                              meta.activeClass,
                            )}
                          >
                            <span className={cn('size-1.5 rounded-full', meta.dotClass)} aria-hidden />
                            {meta.label}
                          </span>
                          {row.record ? (
                            <span className="text-[11px] font-medium text-accent-green-600">Logged</span>
                          ) : isToday ? (
                            <span className="text-[11px] font-medium text-neutral-400">Draft</span>
                          ) : null}
                          {amended ? (
                            <span className="text-[11px] text-neutral-400">
                              Amended {row.record?.amendmentCount}×
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end">
                      <AttendanceStatusToggle
                        value={status}
                        onChange={(next) => onDraftChange(row.student.id, next)}
                        disabled={!isToday || !canMarkToday}
                        compact
                        aria-label={`Attendance for ${row.student.admissionNo}`}
                      />
                      {isToday && canMarkToday && row.record && onAmendRecord ? (
                        <button
                          type="button"
                          onClick={() => onAmendRecord(row)}
                          className="self-start text-[12px] font-semibold text-brand-700 underline-offset-2 hover:underline sm:self-end"
                        >
                          Amend with reason
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {errorMessage ? (
          <div className={`mx-4 mb-2 rounded-xl border px-4 py-3 sm:mx-6 ${SEMANTIC.danger.surface}`}>
            <p className={`text-[13px] font-medium ${SEMANTIC.danger.text}`}>{errorMessage}</p>
          </div>
        ) : null}

        {isToday && canMarkToday && rows.length > 0 ? (
          <div className="sticky bottom-0 border-t border-brand-100/50 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] font-medium text-neutral-500">
                {pendingChanges > 0
                  ? `${pendingChanges} unsaved change${pendingChanges === 1 ? '' : 's'} · submit once for the whole class`
                  : 'Ready to submit today’s register'}
              </p>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void onSubmit()}
                className={cn(ACADEMIC_UI.btnPrimary, 'w-full justify-center sm:w-auto')}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send aria-hidden className="size-4" />
                    Submit attendance
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function buildWeekDates(anchor?: string): string[] {
  return weekDatesContaining(anchor ?? todayCalendarDate());
}
