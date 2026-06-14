'use client';

import type { GradeBand, GradebookEntryResponse, StudentResponse } from '@loomis/contracts';
import { Button, Skeleton } from '@loomis/ui-web';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { ReportCardControlBar } from '@/components/academic/ops/report-card-control-bar';
import { ReportCardStudentRail } from '@/components/academic/ops/report-card-student-rail';
import { StudentReportCard } from '@/components/academic/ops/student-report-card';
import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';
import {
  DEFAULT_REPORT_CARD_FILTERS,
  buildClassReportCardStats,
  buildReportCardStudentRows,
  filterReportCardStudents,
  type ReportCardFilters,
} from '@/lib/academic/report-card-filters';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import { studentDisplayName } from '@/lib/student/student-labels';

interface ReportCardBrowserProps {
  students: StudentResponse[];
  subjectIds: string[];
  entries: GradebookEntryResponse[];
  rosterStudents: StudentResponse[];
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string) => void;
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
  isLoading?: boolean;
}

function printReportCard() {
  window.print();
}

export function ReportCardBrowser({
  students,
  subjectIds,
  entries,
  rosterStudents,
  selectedStudentId,
  onSelectStudent,
  termName,
  sessionName,
  classLabel,
  schoolName,
  logoStorageObjectId,
  schemeName,
  caWeight,
  examWeight,
  passMark = 40,
  gradeBands,
  isLoading,
}: ReportCardBrowserProps) {
  const [filters, setFilters] = useState<ReportCardFilters>(DEFAULT_REPORT_CARD_FILTERS);

  const displaySubjectIds = useMemo(
    () => (filters.subjectId ? [filters.subjectId] : subjectIds),
    [filters.subjectId, subjectIds],
  );

  const allRows = useMemo(
    () =>
      buildReportCardStudentRows({
        students,
        subjectIds,
        entries,
        rosterStudents,
        passMark,
      }),
    [students, subjectIds, entries, rosterStudents, passMark],
  );

  const filteredRows = useMemo(
    () => filterReportCardStudents({ rows: allRows, filters, passMark }),
    [allRows, filters, passMark],
  );

  const classStats = useMemo(() => buildClassReportCardStats(allRows), [allRows]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;
  const selectedIndex = filteredRows.findIndex((row) => row.student.id === selectedStudentId);
  const previousRow = selectedIndex > 0 ? filteredRows[selectedIndex - 1] : null;
  const nextRow =
    selectedIndex >= 0 && selectedIndex < filteredRows.length - 1
      ? filteredRows[selectedIndex + 1]
      : null;

  const selectedSummary = filteredRows.find((row) => row.student.id === selectedStudentId)?.summary ?? null;
  const selectedSubjectScore =
    filters.subjectId && selectedStudent
      ? selectedSummary?.rows.find((row) => row.subjectId === filters.subjectId)?.entry?.totalScore ?? null
      : null;

  useEffect(() => {
    if (filteredRows.length === 0) return;
    const selectedVisible = selectedStudentId
      ? filteredRows.some((row) => row.student.id === selectedStudentId)
      : false;
    if (selectedVisible) return;
    onSelectStudent(filteredRows[0]!.student.id);
  }, [filteredRows, selectedStudentId, onSelectStudent]);

  const studentSelectOptions = useMemo(
    () =>
      filteredRows.map(({ student }) => ({
        value: student.id,
        label: studentDisplayName(student.firstName, student.lastName),
        keywords: `${student.admissionNo} ${student.firstName} ${student.lastName}`,
      })),
    [filteredRows],
  );

  if (isLoading && students.length === 0) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <div className={`${GRADEBOOK_UI.reportCardFrame} overflow-visible`}>
      <ReportCardControlBar
        filters={filters}
        onFiltersChange={setFilters}
        subjectIds={subjectIds}
        studentSelectOptions={studentSelectOptions}
        selectedStudentId={selectedStudentId}
        onSelectStudent={onSelectStudent}
        filteredCount={filteredRows.length}
        totalCount={students.length}
        stats={classStats}
        classLabel={classLabel}
        termName={termName}
      />

      <div className="print:hidden">
        <ReportCardStudentRail
          rows={filteredRows}
          selectedStudentId={selectedStudentId}
          onSelectStudent={onSelectStudent}
          passMark={passMark}
          viewSubjectId={filters.subjectId}
        />
      </div>

      {/* Document — full width */}
      <div className="min-w-0 bg-neutral-200/60">
        <div className="print:hidden sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/90 bg-white/95 px-3 py-2 backdrop-blur-sm sm:px-4">
          <p className="min-w-0 truncate text-[12px] text-neutral-600">
            {selectedStudent && selectedSummary ? (
              <>
                <span className="font-semibold text-neutral-900">
                  {studentDisplayName(selectedStudent.firstName, selectedStudent.lastName)}
                </span>
                <span className="mx-1.5 text-neutral-300">·</span>
                {filters.subjectId ? (
                  <>
                    {formatSubjectLabel(filters.subjectId)} {selectedSubjectScore ?? '—'}
                  </>
                ) : (
                  <>avg {selectedSummary.average ?? '—'}</>
                )}
                <span className="mx-1.5 text-neutral-300">·</span>
                {selectedIndex + 1}/{filteredRows.length}
              </>
            ) : (
              'Select a student above'
            )}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={!previousRow}
              onClick={() => previousRow && onSelectStudent(previousRow.student.id)}
              aria-label="Previous student"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={!nextRow}
              onClick={() => nextRow && onSelectStudent(nextRow.student.id)}
              aria-label="Next student"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1.5 bg-brand-700 px-3 text-white hover:bg-brand-800"
              disabled={!selectedStudent}
              onClick={printReportCard}
            >
              <Printer className="size-3.5" />
              Print
            </Button>
          </div>
        </div>

        <div className="px-3 py-4 sm:px-5 sm:py-6 print:p-0">
          <StudentReportCard
            student={selectedStudent}
            subjectIds={displaySubjectIds}
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
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
