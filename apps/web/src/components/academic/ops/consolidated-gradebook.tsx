'use client';

import type { GradebookEntryResponse, StudentResponse } from '@loomis/contracts';
import { Fragment, useMemo } from 'react';
import { Skeleton } from '@loomis/ui-web';

import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import { studentDisplayName } from '@/lib/student/student-labels';

interface ConsolidatedGradebookProps {
  entries: GradebookEntryResponse[];
  students: StudentResponse[];
  /** All subject columns to show (e.g. from exam configs). Falls back to subjects present in entries. */
  subjectIds?: string[];
  isLoading?: boolean;
  onOpenReportCard?: (studentId: string) => void;
}

export function ConsolidatedGradebookSkeleton() {
  return <Skeleton className="h-full min-h-[420px] w-full" />;
}

/** Class-teacher master register — students × subjects, read-only spreadsheet. */
export function ConsolidatedGradebook({
  entries,
  students,
  subjectIds: subjectIdsProp,
  isLoading,
  onOpenReportCard,
}: ConsolidatedGradebookProps) {
  const subjects = useMemo(() => {
    const fromEntries = [...new Set(entries.map((e) => e.subjectId))];
    const merged = subjectIdsProp?.length
      ? [...new Set([...subjectIdsProp, ...fromEntries])]
      : fromEntries;
    return merged.sort();
  }, [entries, subjectIdsProp]);

  const studentRows = useMemo(() => {
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const ids = new Set<string>();
    for (const entry of entries) ids.add(entry.studentId);
    for (const student of students) ids.add(student.id);
    return [...ids]
      .map((id) => studentMap.get(id))
      .filter(Boolean)
      .sort((a, b) => a!.admissionNo.localeCompare(b!.admissionNo));
  }, [entries, students]);

  const cellMap = useMemo(() => {
    const map = new Map<string, GradebookEntryResponse>();
    for (const entry of entries) {
      map.set(`${entry.studentId}:${entry.subjectId}`, entry);
    }
    return map;
  }, [entries]);

  if (isLoading) return <ConsolidatedGradebookSkeleton />;

  const colsPerSubject = 4;
  const colSpan = 2 + subjects.length * colsPerSubject;

  return (
    <div className="min-w-full">
      <table className="w-full min-w-[960px] border-collapse">
        <thead className="sticky top-0 z-30">
          <tr className={GRADEBOOK_UI.colHeader}>
            <th className={`${GRADEBOOK_UI.cell} ${GRADEBOOK_UI.rowHeader} w-10 text-center`}>#</th>
            <th className={`${GRADEBOOK_UI.cell} ${GRADEBOOK_UI.rowHeader} min-w-[160px] px-3 py-2 text-left`}>
              Student
            </th>
            {subjects.map((subjectId) => (
              <th
                key={subjectId}
                colSpan={colsPerSubject}
                className={`${GRADEBOOK_UI.cell} border-l-2 border-l-neutral-300 px-1 py-2 text-center text-[10px]`}
              >
                {formatSubjectLabel(subjectId)}
              </th>
            ))}
          </tr>
          <tr className={GRADEBOOK_UI.colHeader}>
            <th className={`${GRADEBOOK_UI.cell} ${GRADEBOOK_UI.rowHeader}`} />
            <th className={`${GRADEBOOK_UI.cell} ${GRADEBOOK_UI.rowHeader}`} />
            {subjects.map((subjectId) => (
              <Fragment key={subjectId}>
                <th className={`${GRADEBOOK_UI.cell} border-l-2 border-l-neutral-300 py-1 text-center text-[9px]`}>
                  CA
                </th>
                <th className={`${GRADEBOOK_UI.cell} py-1 text-center text-[9px]`}>Exam</th>
                <th className={`${GRADEBOOK_UI.cell} bg-[#faf3e8]/80 py-1 text-center text-[9px]`}>Ttl</th>
                <th className={`${GRADEBOOK_UI.cell} bg-[#faf3e8]/80 py-1 text-center text-[9px]`}>Grd</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {studentRows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="py-16 text-center text-[13px] text-neutral-400">
                No gradebook data for this class yet.
              </td>
            </tr>
          ) : (
            studentRows.map((student, rowIndex) => (
              <tr key={student!.id} className={rowIndex % 2 === 1 ? 'bg-neutral-50/30' : 'bg-white'}>
                <td
                  className={`${GRADEBOOK_UI.cell} ${GRADEBOOK_UI.rowHeader} text-center font-mono text-[11px] text-neutral-400`}
                >
                  {rowIndex + 1}
                </td>
                <td className={`${GRADEBOOK_UI.cell} ${GRADEBOOK_UI.rowHeader} px-3 py-1.5`}>
                  {onOpenReportCard ? (
                    <button
                      type="button"
                      onClick={() => onOpenReportCard(student!.id)}
                      className="group w-full text-left"
                    >
                      <div className="text-[13px] font-medium text-neutral-900 group-hover:text-brand-800 group-hover:underline">
                        {studentDisplayName(student!.firstName, student!.lastName)}
                      </div>
                      <div className="font-mono text-[10px] text-neutral-400">{student!.admissionNo}</div>
                    </button>
                  ) : (
                    <>
                      <div className="text-[13px] font-medium text-neutral-900">
                        {studentDisplayName(student!.firstName, student!.lastName)}
                      </div>
                      <div className="font-mono text-[10px] text-neutral-400">{student!.admissionNo}</div>
                    </>
                  )}
                </td>
                {subjects.map((subjectId) => {
                  const entry = cellMap.get(`${student!.id}:${subjectId}`);
                  const incomplete = !entry || entry.status === 'draft';
                  const highlight = incomplete ? 'bg-amber-50/70' : '';
                  return (
                    <Fragment key={subjectId}>
                      <td
                        className={`${GRADEBOOK_UI.cell} border-l-2 border-l-neutral-300 ${highlight}`}
                      >
                        <div
                          className={`flex h-[32px] items-center justify-center font-mono text-[11px] tabular-nums ${GRADEBOOK_UI.scoreReadonly}`}
                        >
                          {entry?.continuousAssessmentScore ?? '—'}
                        </div>
                      </td>
                      <td className={`${GRADEBOOK_UI.cell} ${highlight}`}>
                        <div
                          className={`flex h-[32px] items-center justify-center font-mono text-[11px] tabular-nums ${GRADEBOOK_UI.scoreReadonly}`}
                        >
                          {entry?.examScore ?? '—'}
                        </div>
                      </td>
                      <td className={`${GRADEBOOK_UI.cell} bg-[#faf3e8]/50 ${highlight}`}>
                        <div
                          className={`flex h-[32px] items-center justify-center font-mono text-[12px] font-semibold tabular-nums ${GRADEBOOK_UI.scoreReadonly}`}
                        >
                          {entry?.totalScore ?? '—'}
                        </div>
                      </td>
                      <td className={`${GRADEBOOK_UI.cell} bg-[#faf3e8]/50 ${highlight}`}>
                        <div className="flex h-[32px] items-center justify-center font-mono text-[12px] font-bold tabular-nums text-brand-800">
                          {entry?.grade ?? '—'}
                        </div>
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
