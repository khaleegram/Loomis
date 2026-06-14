import type { GradebookEntryResponse, GradeBand, StudentResponse } from '@loomis/contracts';

export interface ReportCardSubjectRow {
  subjectId: string;
  entry: GradebookEntryResponse | null;
}

export interface ReportCardSummary {
  rows: ReportCardSubjectRow[];
  scoredCount: number;
  totalSubjects: number;
  totalObtained: number | null;
  totalObtainable: number;
  average: number | null;
  passedCount: number;
  failedCount: number;
  lockedCount: number;
  isComplete: boolean;
  isFullyLocked: boolean;
  classPosition: number | null;
  classSize: number;
}

function studentAverage(
  studentId: string,
  entries: GradebookEntryResponse[],
  subjectIds: string[],
): number | null {
  const scored = entries.filter(
    (entry) =>
      entry.studentId === studentId &&
      subjectIds.includes(entry.subjectId) &&
      entry.continuousAssessmentScore != null &&
      entry.examScore != null,
  );
  if (scored.length === 0) return null;
  return scored.reduce((sum, entry) => sum + entry.totalScore, 0) / scored.length;
}

/** Aggregates a single student's term report from live gradebook entries. */
export function buildReportCardSummary(params: {
  student: StudentResponse;
  subjectIds: string[];
  entries: GradebookEntryResponse[];
  rosterStudents: StudentResponse[];
  passMark: number;
  maxScorePerSubject?: number;
}): ReportCardSummary {
  const { student, subjectIds, entries, rosterStudents, passMark, maxScorePerSubject = 100 } = params;

  const studentEntries = entries.filter((entry) => entry.studentId === student.id);
  const entryBySubject = new Map(studentEntries.map((entry) => [entry.subjectId, entry]));

  const rows: ReportCardSubjectRow[] = subjectIds.map((subjectId) => ({
    subjectId,
    entry: entryBySubject.get(subjectId) ?? null,
  }));

  const scored = rows.filter(
    (row) =>
      row.entry &&
      row.entry.continuousAssessmentScore != null &&
      row.entry.examScore != null,
  );

  const totalObtained =
    scored.length > 0 ? scored.reduce((sum, row) => sum + row.entry!.totalScore, 0) : null;
  const average =
    scored.length > 0
      ? Math.round(scored.reduce((sum, row) => sum + row.entry!.totalScore, 0) / scored.length)
      : null;

  const passedCount = scored.filter((row) => row.entry!.totalScore >= passMark).length;
  const failedCount = scored.filter((row) => row.entry!.totalScore < passMark).length;

  const classAverages = rosterStudents
    .map((candidate) => ({
      studentId: candidate.id,
      average: studentAverage(candidate.id, entries, subjectIds),
    }))
    .filter((row): row is { studentId: string; average: number } => row.average != null)
    .sort((a, b) => b.average - a.average);

  const classPosition =
    average != null && classAverages.length >= 2
      ? (classAverages.findIndex((row) => row.studentId === student.id) + 1 || null)
      : null;

  return {
    rows,
    scoredCount: scored.length,
    totalSubjects: subjectIds.length,
    totalObtained,
    totalObtainable: subjectIds.length * maxScorePerSubject,
    average,
    passedCount,
    failedCount,
    lockedCount: studentEntries.filter((entry) => entry.status === 'submitted').length,
    isComplete: scored.length === subjectIds.length && subjectIds.length > 0,
    isFullyLocked:
      studentEntries.length > 0 &&
      studentEntries.every((entry) => entry.status === 'submitted'),
    classPosition: classPosition && classPosition > 0 ? classPosition : null,
    classSize: rosterStudents.length,
  };
}

export function gradeTone(totalScore: number, passMark: number): 'excellent' | 'pass' | 'fail' | 'neutral' {
  if (totalScore <= 0) return 'neutral';
  if (totalScore >= 70) return 'excellent';
  if (totalScore >= passMark) return 'pass';
  return 'fail';
}

export function formatGradeBandKey(bands: GradeBand[]): string {
  return bands
    .slice()
    .sort((a, b) => b.minScore - a.minScore)
    .map((band) => `${band.grade} (${band.minScore}–${band.maxScore})`)
    .join(' · ');
}
