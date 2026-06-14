'use client';

import { useEffect, useRef } from 'react';

import type { ReportCardStudentRow } from '@/lib/academic/report-card-filters';
import { gradeTone } from '@/lib/academic/report-card-summary';
import { studentDisplayName } from '@/lib/student/student-labels';

interface ReportCardStudentRailProps {
  rows: ReportCardStudentRow[];
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string) => void;
  passMark: number;
  viewSubjectId?: string | null;
}

const AVG_CHIP: Record<ReturnType<typeof gradeTone>, string> = {
  excellent: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  pass: 'bg-brand-50 text-brand-900 ring-brand-200',
  fail: 'bg-red-50 text-red-800 ring-red-200',
  neutral: 'bg-neutral-50 text-neutral-500 ring-neutral-200',
};

/** Compact horizontal student picker — swipe on mobile, scroll on desktop. */
export function ReportCardStudentRail({
  rows,
  selectedStudentId,
  onSelectStudent,
  passMark,
  viewSubjectId = null,
}: ReportCardStudentRailProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedStudentId]);

  if (rows.length === 0) {
    return (
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-6 text-center">
        <p className="text-[12px] font-semibold text-neutral-700">No students match</p>
        <p className="mt-1 text-[11px] text-neutral-500">Adjust filters or search above.</p>
      </div>
    );
  }

  return (
    <div className="relative border-b border-neutral-200 bg-neutral-100/80">
      <div
        className="flex gap-2 overflow-x-auto overscroll-x-contain scroll-px-3 px-3 py-2.5 snap-x snap-mandatory scrollbar-none"
        role="listbox"
        aria-label="Students in class"
      >
        {rows.map(({ student, summary }) => {
          const active = student.id === selectedStudentId;
          const subjectRow = viewSubjectId
            ? summary.rows.find((row) => row.subjectId === viewSubjectId)
            : null;
          const displayScore =
            viewSubjectId != null ? (subjectRow?.entry?.totalScore ?? null) : summary.average;
          const tone = displayScore != null ? gradeTone(displayScore, passMark) : 'neutral';
          const lastName = student.lastName || studentDisplayName(student.firstName, student.lastName);

          return (
            <button
              key={student.id}
              ref={active ? activeRef : undefined}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelectStudent(student.id)}
              className={`w-[7.25rem] shrink-0 snap-start rounded-lg border px-2.5 py-2 text-left shadow-sm transition-all sm:w-[8.5rem] ${
                active
                  ? 'border-brand-600 bg-white ring-2 ring-brand-500/25'
                  : 'border-neutral-200/90 bg-white hover:border-neutral-300 hover:shadow-md'
              }`}
            >
              <p className="truncate text-[12px] font-bold leading-tight text-neutral-900">{lastName}</p>
              <p className="mt-0.5 truncate font-mono text-[9px] text-neutral-500">{student.admissionNo}</p>
              <div className="mt-2 flex items-center justify-between gap-1">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ring-1 ring-inset ${
                    active ? 'bg-brand-700 text-white ring-brand-700' : AVG_CHIP[tone]
                  }`}
                >
                  {displayScore ?? '—'}
                </span>
                {summary.classPosition != null ? (
                  <span className="text-[9px] font-bold tabular-nums text-neutral-500">
                    #{summary.classPosition}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-neutral-100/80 to-transparent"
      />
    </div>
  );
}
