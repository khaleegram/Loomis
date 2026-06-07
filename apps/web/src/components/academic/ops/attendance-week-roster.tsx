'use client';

import type { AttendanceRecordResponse, AttendanceStatus, StudentResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  SegmentedControl,
  Skeleton,
} from '@loomis/ui-web';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  shortDateLabel,
  todayCalendarDate,
  weekDatesContaining,
  weekdayLabel,
} from '@/lib/academic/ops-labels';
import { studentDisplayName } from '@/lib/student/student-labels';

const ATTENDANCE_OPTIONS: Array<{
  value: AttendanceStatus;
  label: string;
  shortcut: string;
}> = [
  { value: 'present', label: 'Present', shortcut: '1' },
  { value: 'absent', label: 'Absent', shortcut: '2' },
  { value: 'late', label: 'Late', shortcut: '3' },
];

export interface AttendanceRosterRow {
  student: StudentResponse;
  record: AttendanceRecordResponse | null;
}

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
}

export function AttendanceWeekRosterSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-96 w-full" />
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
}: AttendanceWeekRosterProps) {
  const today = todayCalendarDate();
  const isToday = selectedDate === today;

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    for (const row of rows) {
      const status = draftStatuses[row.student.id] ?? row.record?.status ?? 'present';
      if (status === 'present') present += 1;
      if (status === 'absent') absent += 1;
      if (status === 'late') late += 1;
    }
    return { present, absent, late };
  }, [draftStatuses, rows]);

  const handleGlobalKey = useCallback(
    (event: KeyboardEvent) => {
      if (!focusedStudentId || !isToday || !canMarkToday) return;
      const map: Record<string, AttendanceStatus> = { '1': 'present', '2': 'absent', '3': 'late' };
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
    <div className="grid gap-4 lg:grid-cols-[minmax(160px,200px)_1fr]">
      {/* Week strip */}
      <Card className="h-fit shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">School week</CardTitle>
          <CardDescription>Mon – Fri roll call</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 p-2">
          {weekDates.map((date) => {
            const selected = date === selectedDate;
            const isDayToday = date === today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelectDate(date)}
                className={`rounded-sm border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected
                    ? 'border-gold bg-gold/10 dark:border-gold'
                    : 'border-transparent hover:bg-muted'
                } ${isDayToday ? 'ring-1 ring-brand-600/30 dark:ring-mint-500/30' : ''}`}
              >
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  {weekdayLabel(date)}
                </div>
                <div className="font-medium">{shortDateLabel(date)}</div>
                {isDayToday ? (
                  <Badge variant="secondary" className="mt-1">
                    Today
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Roster */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-serif text-lg">
              {weekdayLabel(selectedDate)} · {shortDateLabel(selectedDate)}
            </CardTitle>
            <CardDescription>
              Mark each student · shortcuts{' '}
              <kbd className="rounded border px-1 font-mono text-xs">1</kbd> Present ·{' '}
              <kbd className="rounded border px-1 font-mono text-xs">2</kbd> Absent ·{' '}
              <kbd className="rounded border px-1 font-mono text-xs">3</kbd> Late
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="default">{summary.present} P</Badge>
            <Badge variant="destructive">{summary.absent} A</Badge>
            <Badge variant="gold">{summary.late} L</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isToday ? (
            <Alert>
              <AlertDescription>
                Online marking is only available for today. Viewing historical records for{' '}
                {shortDateLabel(selectedDate)}.
              </AlertDescription>
            </Alert>
          ) : null}

          {rows.length === 0 ? (
            <Alert>
              <AlertDescription>
                No students found for this class. Enroll students or mark attendance once to build the roster.
              </AlertDescription>
            </Alert>
          ) : (
            <ul className="divide-y rounded-sm border">
              {rows.map((row) => {
                const status =
                  draftStatuses[row.student.id] ?? row.record?.status ?? ('present' as AttendanceStatus);
                const focused = focusedStudentId === row.student.id;
                return (
                  <li
                    key={row.student.id}
                    className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                      focused ? 'bg-muted/40' : ''
                    }`}
                    onFocus={() => onFocusStudent?.(row.student.id)}
                    onMouseEnter={() => onFocusStudent?.(row.student.id)}
                  >
                    <div>
                      <p className="font-medium">
                        {studentDisplayName(row.student.firstName, row.student.lastName)}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.student.admissionNo}</p>
                      {row.record?.amendmentCount ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Amended {row.record.amendmentCount}×
                        </p>
                      ) : null}
                    </div>
                    <SegmentedControl
                      value={status === 'excused' ? 'absent' : status}
                      onValueChange={(v) => onDraftChange(row.student.id, v)}
                      options={ATTENDANCE_OPTIONS}
                      disabled={!isToday || !canMarkToday}
                      aria-label={`Attendance for ${row.student.admissionNo}`}
                    />
                  </li>
                );
              })}
            </ul>
          )}

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {isToday && canMarkToday && rows.length > 0 ? (
            <div className="flex justify-end border-t pt-4">
              <Button onClick={() => void onSubmit()} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit attendance'}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function buildWeekDates(anchor?: string): string[] {
  return weekDatesContaining(anchor ?? todayCalendarDate());
}
