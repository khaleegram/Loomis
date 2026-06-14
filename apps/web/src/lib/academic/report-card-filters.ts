import type { GradebookEntryResponse, StudentResponse } from '@loomis/contracts';

import { buildReportCardSummary, type ReportCardSummary } from '@/lib/academic/report-card-summary';
import { studentDisplayName } from '@/lib/student/student-labels';

export type ReportCardPerformanceFilter = 'all' | 'at_risk';
export type ReportCardGenderFilter = 'all' | 'male' | 'female';
export type ReportCardSortBy = 'position' | 'admission' | 'name';

export interface ReportCardFilters {
  query: string;
  gender: ReportCardGenderFilter;
  performance: ReportCardPerformanceFilter;
  /** When set, report card (and rail avg) focus on this subject only. */
  subjectId: string | null;
  sortBy: ReportCardSortBy;
}

export const DEFAULT_REPORT_CARD_FILTERS: ReportCardFilters = {
  query: '',
  gender: 'all',
  performance: 'all',
  subjectId: null,
  sortBy: 'admission',
};

export interface ReportCardStudentRow {
  student: StudentResponse;
  summary: ReportCardSummary;
}

export interface ClassReportCardStats {
  totalStudents: number;
  completeCount: number;
  partialCount: number;
  noneCount: number;
  lockedCount: number;
  passingCount: number;
  failingCount: number;
  classAverage: number | null;
}

function matchesPerformance(summary: ReportCardSummary, filter: ReportCardPerformanceFilter, passMark: number): boolean {
  if (filter !== 'at_risk') return true;
  return summary.failedCount > 0 || (summary.average != null && summary.average < passMark);
}

function sortStudents(rows: ReportCardStudentRow[], sortBy: ReportCardSortBy): ReportCardStudentRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return studentDisplayName(a.student.firstName, a.student.lastName).localeCompare(
          studentDisplayName(b.student.firstName, b.student.lastName),
        );
      case 'admission':
        return a.student.admissionNo.localeCompare(b.student.admissionNo);
      case 'position':
      default:
        return (a.summary.classPosition ?? 999) - (b.summary.classPosition ?? 999);
    }
  });
  return copy;
}

export function buildReportCardStudentRows(params: {
  students: StudentResponse[];
  subjectIds: string[];
  entries: GradebookEntryResponse[];
  rosterStudents: StudentResponse[];
  passMark: number;
}): ReportCardStudentRow[] {
  return params.students.map((student) => ({
    student,
    summary: buildReportCardSummary({
      student,
      subjectIds: params.subjectIds,
      entries: params.entries,
      rosterStudents: params.rosterStudents,
      passMark: params.passMark,
    }),
  }));
}

export function filterReportCardStudents(params: {
  rows: ReportCardStudentRow[];
  filters: ReportCardFilters;
  passMark: number;
}): ReportCardStudentRow[] {
  const { rows, filters, passMark } = params;
  const q = filters.query.trim().toLowerCase();

  const filtered = rows.filter(({ student, summary }) => {
    if (q) {
      const name = studentDisplayName(student.firstName, student.lastName).toLowerCase();
      if (!name.includes(q) && !student.admissionNo.toLowerCase().includes(q)) return false;
    }
    if (filters.gender !== 'all' && student.gender !== filters.gender) return false;
    if (!matchesPerformance(summary, filters.performance, passMark)) return false;
    return true;
  });

  return sortStudents(filtered, filters.sortBy);
}

export function buildClassReportCardStats(rows: ReportCardStudentRow[]): ClassReportCardStats {
  const averages = rows
    .map((row) => row.summary.average)
    .filter((value): value is number => value != null);

  return {
    totalStudents: rows.length,
    completeCount: rows.filter((row) => row.summary.isComplete).length,
    partialCount: rows.filter(
      (row) => row.summary.scoredCount > 0 && !row.summary.isComplete,
    ).length,
    noneCount: rows.filter((row) => row.summary.scoredCount === 0).length,
    lockedCount: rows.filter((row) => row.summary.isFullyLocked).length,
    passingCount: rows.filter((row) => row.summary.failedCount === 0 && row.summary.isComplete).length,
    failingCount: rows.filter((row) => row.summary.failedCount > 0).length,
    classAverage:
      averages.length > 0
        ? Math.round(averages.reduce((sum, value) => sum + value, 0) / averages.length)
        : null,
  };
}

export function hasActiveReportCardFilters(filters: ReportCardFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.gender !== 'all' ||
    filters.performance !== 'all' ||
    filters.subjectId != null ||
    filters.sortBy !== 'admission'
  );
}

export function overallPerformanceRemark(
  average: number | null,
  passMark: number,
): { label: string; tone: 'excellent' | 'good' | 'pass' | 'fail' | 'pending' } {
  if (average == null) return { label: 'Awaiting results', tone: 'pending' };
  if (average >= 70) return { label: 'Excellent performance', tone: 'excellent' };
  if (average >= 60) return { label: 'Very good performance', tone: 'good' };
  if (average >= passMark) return { label: 'Satisfactory — passed', tone: 'pass' };
  return { label: 'Needs improvement', tone: 'fail' };
}
