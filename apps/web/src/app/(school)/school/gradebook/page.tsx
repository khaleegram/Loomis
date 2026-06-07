'use client';

import {
  useExamConfigs,
  useGradebookEntries,
  useGradingSchemes,
  useRequestGradeCorrection,
  useStudents,
  useUpsertGradebookEntry,
} from '@loomis/api-client';
import type { GradebookEntryResponse, StudentResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@loomis/ui-web';
import { Fragment, useMemo, useState } from 'react';

import { AcademicTermSelectors } from '@/components/academic/ops/academic-term-selectors';
import { GradeCorrectionSheet } from '@/components/academic/ops/grade-correction-sheet';
import {
  GradebookSpreadsheet,
  type GradebookRow,
  type GradebookViewMode,
} from '@/components/academic/ops/gradebook-spreadsheet';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';
import { useCan, useCanAny, useRole } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { studentDisplayName } from '@/lib/student/student-labels';

function ConsolidatedGradebookSkeleton() {
  return <Skeleton className="h-[480px] w-full" />;
}

function ConsolidatedGradebook({
  entries,
  students,
  isLoading,
}: {
  entries: GradebookEntryResponse[];
  students: StudentResponse[];
  isLoading?: boolean;
}) {
  const subjects = useMemo(() => {
    const ids = [...new Set(entries.map((e) => e.subjectId))].sort();
    return ids;
  }, [entries]);

  const studentRows = useMemo(() => {
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const ids = new Set<string>();
    for (const entry of entries) ids.add(entry.studentId);
    for (const s of students) {
      if (s.status === 'enrolled') ids.add(s.id);
    }
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

  return (
    <div className="relative max-h-[min(70vh,720px)] overflow-auto rounded-sm border shadow-card">
      <Table className="min-w-[900px] border-collapse">
        <TableHeader className="sticky top-0 z-20 bg-neutral-100 dark:bg-forest-800">
          <TableRow>
            <TableHead className="sticky left-0 z-30 min-w-[200px] bg-neutral-100 dark:bg-forest-800">
              Student
            </TableHead>
            {subjects.map((subjectId) => (
              <TableHead key={subjectId} colSpan={2} className="border-l text-center">
                {formatSubjectLabel(subjectId)}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            <TableHead className="sticky left-0 z-30 bg-neutral-100 dark:bg-forest-800" />
            {subjects.map((subjectId) => (
              <Fragment key={subjectId}>
                <TableHead className="border-l text-center text-xs">Total</TableHead>
                <TableHead className="bg-gold/10 text-center text-xs dark:bg-gold/5">Grade</TableHead>
              </Fragment>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {studentRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={1 + subjects.length * 2} className="py-12 text-center text-muted-foreground">
                No gradebook data for this class yet.
              </TableCell>
            </TableRow>
          ) : (
            studentRows.map((student) => (
              <TableRow key={student!.id}>
                <TableCell className="sticky left-0 z-10 bg-card">
                  <div className="font-medium">
                    {studentDisplayName(student!.firstName, student!.lastName)}
                  </div>
                  <div className="text-xs text-muted-foreground">{student!.admissionNo}</div>
                </TableCell>
                {subjects.map((subjectId) => {
                  const entry = cellMap.get(`${student!.id}:${subjectId}`);
                  const incomplete = !entry || entry.status === 'draft';
                  return (
                    <Fragment key={subjectId}>
                      <TableCell
                        className={`border-l text-center font-mono tabular-nums ${
                          incomplete ? 'bg-warning/5' : ''
                        }`}
                      >
                        {entry?.totalScore ?? '—'}
                      </TableCell>
                      <TableCell
                        className={`text-center font-mono font-semibold ${
                          incomplete ? 'bg-warning/5 text-muted-foreground' : 'bg-gold/5 dark:text-gold'
                        }`}
                      >
                        {entry?.grade ?? '—'}
                      </TableCell>
                    </Fragment>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <p className="border-t p-3 text-xs text-muted-foreground">
        Incomplete cells are highlighted — follow up with subject teachers. Read-only consolidated view (FR-ACA-006).
      </p>
    </div>
  );
}

export default function GradebookPage() {
  const tenantId = useTenantId();
  const role = useRole();
  const canWrite = useCan('gradebook.write');
  const canRead = useCan('gradebook.read');
  const canView = useCanAny(['gradebook.write', 'gradebook.read']);

  const isClassTeacherView = role === 'class_teacher' && canRead && !canWrite;
  const ctx = useAcademicOpsContext(tenantId ?? '');

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [mode, setMode] = useState<GradebookViewMode>('entry');
  const [correctionEntry, setCorrectionEntry] = useState<GradebookEntryResponse | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const examConfigsQuery = useExamConfigs(tenantId ?? '', ctx.termId ?? '');
  const configs = examConfigsQuery.data?.configs ?? [];
  const classConfigs = useMemo(
    () => configs.filter((c) => c.classArmId === ctx.classArmId),
    [configs, ctx.classArmId],
  );
  const resolvedSubjectId = subjectId ?? classConfigs[0]?.subjectId ?? null;
  const activeConfig = classConfigs.find((c) => c.subjectId === resolvedSubjectId) ?? null;

  const gradebookFilters =
    ctx.termId && ctx.classArmId
      ? {
          termId: ctx.termId,
          classArmId: ctx.classArmId,
          ...(isClassTeacherView ? {} : { subjectId: resolvedSubjectId ?? undefined }),
        }
      : null;

  const entriesQuery = useGradebookEntries(tenantId ?? '', gradebookFilters);
  const schemesQuery = useGradingSchemes(tenantId ?? '');
  const studentsQuery = useStudents(tenantId ?? '');

  const scheme = schemesQuery.data?.schemes.find((s) => s.id === activeConfig?.gradingSchemeId);
  const upsert = useUpsertGradebookEntry(tenantId ?? '', {
    termId: ctx.termId ?? '',
    classArmId: ctx.classArmId ?? '',
    subjectId: resolvedSubjectId ?? undefined,
  });
  const requestCorrection = useRequestGradeCorrection(
    tenantId ?? '',
    correctionEntry?.id ?? '',
    {
      termId: ctx.termId ?? '',
      classArmId: ctx.classArmId ?? '',
      subjectId: resolvedSubjectId ?? undefined,
    },
  );

  const rows: GradebookRow[] = useMemo(() => {
    const students = (studentsQuery.data?.students ?? []).filter(
      (s) => s.status === 'enrolled' || s.status === 'admitted',
    );
    const entryByStudent = new Map(entriesQuery.data?.entries.map((e) => [e.studentId, e]) ?? []);
    const rosterIds = new Set<string>();
    for (const s of students) rosterIds.add(s.id);
    for (const e of entriesQuery.data?.entries ?? []) rosterIds.add(e.studentId);

    return [...rosterIds]
      .map((id) => {
        const student = students.find((s) => s.id === id);
        if (!student) return null;
        return {
          student,
          entry: entryByStudent.get(id) ?? null,
          examConfigId: activeConfig?.id ?? '',
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.student.admissionNo.localeCompare(b!.student.admissionNo)) as GradebookRow[];
  }, [studentsQuery.data, entriesQuery.data, activeConfig?.id]);

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Gradebook" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>No tenant context. Sign in again.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  if (!canView) {
    return (
      <>
        <PageHeader title="Gradebook" />
        <PageBody>
          <Alert>
            <AlertDescription>You do not have permission to view the gradebook.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Gradebook"
        description={
          isClassTeacherView
            ? 'Consolidated read-only view of all subjects for your class (FR-ACA-006).'
            : 'Enter scores for your assigned subjects (US-ACA-002). Use Review mode before term lock.'
        }
      />
      <PageBody>
        <div className="space-y-6">
        <AcademicTermSelectors
          years={ctx.sortedYears}
          terms={ctx.terms}
          classArmOptions={classArmOptions(ctx.arms, ctx.levels)}
          yearId={ctx.yearId}
          termId={ctx.termId}
          classArmId={ctx.classArmId}
          onYearChange={(id) => {
            ctx.setYearId(id);
            ctx.setTermId(null);
          }}
          onTermChange={ctx.setTermId}
          onClassArmChange={ctx.setClassArmId}
        />

        {!isClassTeacherView && canWrite ? (
          <div className="max-w-md space-y-2">
            <Label>Subject</Label>
            <Select value={resolvedSubjectId ?? undefined} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {classConfigs.map((config) => (
                  <SelectItem key={config.id} value={config.subjectId}>
                    {formatSubjectLabel(config.subjectId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {classConfigs.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No exam configuration for this class. Ask the exam officer to link a grading scheme.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        {isClassTeacherView ? (
          <ConsolidatedGradebook
            entries={entriesQuery.data?.entries ?? []}
            students={studentsQuery.data?.students ?? []}
            isLoading={entriesQuery.isLoading || studentsQuery.isLoading}
          />
        ) : (
          <>
            <GradebookSpreadsheet
              mode={mode}
              onModeChange={setMode}
              rows={rows}
              examConfig={activeConfig}
              caWeight={scheme?.continuousAssessmentWeight ?? 40}
              examWeight={scheme?.examWeight ?? 60}
              isLoading={
                entriesQuery.isLoading ||
                studentsQuery.isLoading ||
                examConfigsQuery.isLoading ||
                schemesQuery.isLoading
              }
              onSaveCell={async (studentId, examConfigId, ca, exam) => {
                await upsert.mutateAsync({
                  examConfigId,
                  studentId,
                  continuousAssessmentScore: ca,
                  examScore: exam,
                });
              }}
              onRequestCorrection={(entry) => {
                setCorrectionError(null);
                setCorrectionEntry(entry);
              }}
            />

            <GradeCorrectionSheet
              open={Boolean(correctionEntry)}
              onOpenChange={(open) => {
                if (!open) setCorrectionEntry(null);
              }}
              entry={correctionEntry}
              caWeight={scheme?.continuousAssessmentWeight ?? 40}
              examWeight={scheme?.examWeight ?? 60}
              isSubmitting={requestCorrection.isSubmitting}
              errorMessage={correctionError}
              onSubmit={async (values) => {
                setCorrectionError(null);
                try {
                  await requestCorrection.mutateAsync(values);
                  setCorrectionEntry(null);
                } catch (err) {
                  setCorrectionError(academicErrorMessage(err));
                }
              }}
            />
          </>
        )}

        {entriesQuery.data?.entries.some((e) => e.status === 'correction_pending') ? (
          <Alert variant="warning">
            <AlertDescription>
              Some entries have pending grade corrections awaiting exam officer review.
            </AlertDescription>
          </Alert>
        ) : null}
        </div>
      </PageBody>
    </>
  );
}
