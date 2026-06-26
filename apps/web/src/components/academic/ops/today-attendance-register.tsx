'use client';

import type { AttendanceStatus, StudentResponse } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';
import { Check, Clock, UserX } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { studentDisplayName } from '@/lib/student/student-labels';

export interface TodayRegisterRow {
  student: StudentResponse;
  status: AttendanceStatus;
  submitted: boolean;
}

interface TodayAttendanceRegisterProps {
  rows: TodayRegisterRow[];
  canMark: boolean;
  pending?: boolean;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onSubmit: () => void;
  submitLabel?: string;
  classLabel?: string | null;
  dateLabel?: string | null;
  errorMessage?: string | null;
}

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  icon: typeof Check;
  activeClass: string;
}[] = [
  {
    value: 'present',
    label: 'Present',
    icon: Check,
    activeClass: 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60',
  },
  {
    value: 'absent',
    label: 'Absent',
    icon: UserX,
    activeClass: 'border-red-300 bg-red-50 text-red-800 ring-1 ring-red-200/60',
  },
  {
    value: 'late',
    label: 'Late',
    icon: Clock,
    activeClass: 'border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-200/60',
  },
];

/**
 * Today's class register - everyone starts Present; teacher taps exceptions only.
 * Designed for Class Teachers on mobile: one screen, one submit.
 */
export function TodayAttendanceRegister({
  rows,
  canMark,
  pending,
  onStatusChange,
  onSubmit,
  submitLabel = 'Submit register',
  classLabel,
  dateLabel,
  errorMessage,
}: TodayAttendanceRegisterProps) {
  const summary = rows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<AttendanceStatus, number>,
  );

  return (
    <div className="space-y-4">
      <div className="card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Today&apos;s register</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900">
              {classLabel ?? 'Your class'}
            </h2>
            {dateLabel ? <p className="mt-0.5 text-[13px] text-neutral-500">{dateLabel}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
              {summary.present ?? 0} present
            </span>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-800">
              {summary.absent ?? 0} absent
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
              {summary.late ?? 0} late
            </span>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-neutral-500">
          Everyone starts as Present. Tap a student only if they&apos;re absent or late.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800">
          {errorMessage}
        </p>
      ) : null}

      <div className={ACADEMIC_UI.dataPanel}>
        <ul className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <li key={row.student.id} className="px-4 py-3">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-neutral-900">
                    {studentDisplayName(row.student.firstName, row.student.lastName)}
                  </p>
                  <p className="text-[11px] text-neutral-400">{row.student.admissionNo}</p>
                </div>
                <div className="flex gap-1.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = row.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={!canMark || pending}
                        onClick={() => onStatusChange(row.student.id, opt.value)}
                        aria-pressed={selected}
                        className={cn(
                          'inline-flex min-h-[44px] min-w-[72px] flex-1 items-center justify-center gap-1 rounded-xl border px-2.5 text-[11px] font-bold transition sm:min-w-[80px] sm:flex-none',
                          selected
                            ? opt.activeClass
                            : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300',
                        )}
                      >
                        <Icon aria-hidden className="size-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {canMark ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={pending || rows.length === 0}
            onClick={onSubmit}
            className={cn(ACADEMIC_UI.btnPrimary, 'min-h-[44px] justify-center px-6')}
          >
            {pending ? 'Saving…' : submitLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
