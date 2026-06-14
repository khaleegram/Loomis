'use client';

import type { GradeBand, GradebookEntryResponse, StudentResponse } from '@loomis/contracts';

import {
  ReportCardDocument,
  ReportCardDocumentSkeleton,
} from '@/components/academic/ops/report-card-document';

interface StudentReportCardProps {
  student: StudentResponse | null;
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
  isLoading?: boolean;
}

export const StudentReportCardSkeleton = ReportCardDocumentSkeleton;

/** Single-student report card — formal document layout for the term. */
export function StudentReportCard(props: StudentReportCardProps) {
  return <ReportCardDocument {...props} />;
}
