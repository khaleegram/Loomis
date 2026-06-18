'use client';

import type { GradeBand, GradebookEntryResponse, StudentResponse } from '@loomis/contracts';

import { ReportCardDocument } from '@/components/academic/ops/report-card-document';

interface ReportCardPrintBatchProps {
  students: StudentResponse[];
  subjectIds: string[];
  entries: GradebookEntryResponse[];
  rosterStudents: StudentResponse[];
  termName?: string | null;
  sessionName?: string | null;
  classLabel?: string | null;
  schoolName?: string | null;
  logoStorageObjectId?: string | null;
  schemeName?: string | null;
  caWeight?: number;
  examWeight?: number;
  passMark?: number;
  gradeBands?: GradeBand[];
}

/** Stacked report cards — one sheet per student for print preview / batch print. */
export function ReportCardPrintBatch({
  students,
  subjectIds,
  entries,
  rosterStudents,
  termName,
  sessionName,
  classLabel,
  schoolName,
  logoStorageObjectId,
  schemeName,
  caWeight,
  examWeight,
  passMark,
  gradeBands,
}: ReportCardPrintBatchProps) {
  if (students.length === 0) {
    return (
      <p className="py-16 text-center text-[13px] text-neutral-500">
        No students selected for printing.
      </p>
    );
  }

  return (
    <div className="report-card-print-batch mx-auto max-w-[820px] space-y-0 py-6 print:max-w-none print:py-0">
      {students.map((student, index) => (
        <div
          key={student.id}
          className={`report-card-print-sheet px-4 sm:px-0 ${
            index < students.length - 1 ? 'mb-8 print:mb-0' : ''
          }`}
        >
          <ReportCardDocument
            student={student}
            subjectIds={subjectIds}
            entries={entries}
            rosterStudents={rosterStudents}
            termName={termName}
            sessionName={sessionName}
            classLabel={classLabel}
            schoolName={schoolName}
            logoStorageObjectId={logoStorageObjectId}
            schemeName={schemeName}
            caWeight={caWeight}
            examWeight={examWeight}
            passMark={passMark}
            gradeBands={gradeBands}
          />
        </div>
      ))}
    </div>
  );
}
