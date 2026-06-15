'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useExamConfigs,
  useGradebookEntries,
  useGradingSchemes,
  useLockGradebook,
  useRequestGradeCorrection,
  useStudents,
  useTermEnrollmentRoster,
  useUpsertGradebookEntry,
} from '@loomis/api-client';
import type { GradebookEntryResponse, StudentGender, StudentResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Tabs, TabsList, TabsTrigger } from '@loomis/ui-web';
import { useMemo, useState } from 'react';

import { AcademicScopePicker } from '@/components/academic/ops/academic-scope-picker';
import { ConsolidatedGradebook } from '@/components/academic/ops/consolidated-gradebook';
import { GradeCorrectionSheet } from '@/components/academic/ops/grade-correction-sheet';
import { GradebookHero } from '@/components/academic/ops/gradebook-hero';
import { GradebookSpreadsheet, type GradebookRow } from '@/components/academic/ops/gradebook-spreadsheet';
import { GradebookToolbar } from '@/components/academic/ops/gradebook-toolbar';
import { GradebookWorkspace } from '@/components/academic/ops/gradebook-workspace';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import {
  computeGradebookProgress,
  isGradebookFullyLocked,
} from '@/lib/academic/gradebook-labels';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';
import { useCan, useCanAny, useRole } from '@/lib/auth/use-capability';
import { isClassTeacherRole, isTeachingStaffRole } from '@/lib/timetable/is-teaching-staff';
import { useTeachingStaffScope } from '@/lib/timetable/use-teaching-staff-scope';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

type GradebookWorkspaceTab = 'register' | 'entry';

function rosterStudentFromEnrollment(
  entry: {
    studentId: string;
    admissionNo: string;
    firstName: string;
    lastName: string;
  },
  gender: StudentGender,
): StudentResponse {
  return {
    id: entry.studentId,
    tenantId: '',
    admissionNo: entry.admissionNo,
    firstName: entry.firstName,
    lastName: entry.lastName,
    status: 'enrolled',
    gender,
    dateOfBirth: '2010-01-01',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  } as StudentResponse;
}

export default function GradebookPage() {
  const tenantId = useTenantId();
  const router = useRouter();
  const role = useRole();
  const canWriteCapability = useCan('gradebook.write');
  const canRead = useCan('gradebook.read');
  const canView = useCanAny(['gradebook.write', 'gradebook.read']);

  const adminCtx = useAcademicOpsContext(tenantId ?? '');
  const teacherCtxEntry = useTeachingStaffScope(tenantId ?? '', { mode: 'default' });
  const teacherCtxRegister = useTeachingStaffScope(tenantId ?? '', { mode: 'classTeacherClass' });

  const hasSubjectTeaching =
    isClassTeacherRole(role) && teacherCtxEntry.subjectAssignmentsForClass.length > 0;
  const isDualClassTeacher = hasSubjectTeaching;

  const [workspaceTab, setWorkspaceTab] = useState<GradebookWorkspaceTab | null>(null);
  const effectiveWorkspaceTab: GradebookWorkspaceTab =
    workspaceTab ??
    (isDualClassTeacher || (isClassTeacherRole(role) && !canWriteCapability) ? 'register' : 'entry');

  const isClassTeacherView = effectiveWorkspaceTab === 'register';
  const canWrite = canWriteCapability || (isDualClassTeacher && effectiveWorkspaceTab === 'entry');
  const teacherCtx = isClassTeacherView ? teacherCtxRegister : teacherCtxEntry;
  const ctx = isTeachingStaffRole(role) ? teacherCtx : adminCtx;

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [correctionEntry, setCorrectionEntry] = useState<GradebookEntryResponse | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const examConfigsQuery = useExamConfigs(tenantId ?? '', ctx.termId ?? '');
  const configs = examConfigsQuery.data?.configs ?? [];
  const classConfigs = useMemo(() => {
    const forClass = configs.filter((c) => c.classArmId === ctx.classArmId);
    if (!isTeachingStaffRole(role) || isClassTeacherView) return forClass;
    const taughtSubjectIds = new Set(
      teacherCtxEntry.subjectAssignmentsForClass.map((assignment) => assignment.subjectId),
    );
    return forClass.filter((config) => taughtSubjectIds.has(config.subjectId));
  }, [configs, ctx.classArmId, role, isClassTeacherView, teacherCtxEntry.subjectAssignmentsForClass]);

  const classSubjectIds = useMemo(
    () => [...new Set(configs.filter((c) => c.classArmId === ctx.classArmId).map((c) => c.subjectId))].sort(),
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
  const rosterQuery = useTermEnrollmentRoster(tenantId ?? '', ctx.termId ?? '');
  const studentsQuery = useStudents(tenantId ?? '');

  const genderByStudentId = useMemo(() => {
    const map = new Map<string, StudentGender>();
    for (const student of studentsQuery.data?.students ?? []) {
      map.set(student.id, student.gender);
    }
    return map;
  }, [studentsQuery.data]);

  const rosterStudents = useMemo(() => {
    return (rosterQuery.data?.entries ?? [])
      .filter(
        (entry) =>
          entry.classArmId === ctx.classArmId &&
          (entry.status === 'active' ||
            entry.status === 'active_billable' ||
            entry.status === 'suspended'),
      )
      .map((entry) =>
        rosterStudentFromEnrollment(entry, genderByStudentId.get(entry.studentId) ?? 'unknown'),
      )
      .sort((a, b) => a.admissionNo.localeCompare(b.admissionNo));
  }, [rosterQuery.data, ctx.classArmId, genderByStudentId]);

  const scheme = schemesQuery.data?.schemes.find((s) => s.id === activeConfig?.gradingSchemeId);
  const listFilters = gradebookFilters ?? { termId: '', classArmId: '', subjectId: undefined };

  const upsert = useUpsertGradebookEntry(tenantId ?? '', listFilters);
  const lockGradebook = useLockGradebook(tenantId ?? '', listFilters);
  const requestCorrection = useRequestGradeCorrection(
    tenantId ?? '',
    correctionEntry?.id ?? '',
    listFilters,
  );

  const subjectTabs = useMemo(
    () =>
      classConfigs.map((config) => ({
        subjectId: config.subjectId,
        label: formatSubjectLabel(config.subjectId),
      })),
    [classConfigs],
  );

  const rows: GradebookRow[] = useMemo(() => {
    const entryByStudent = new Map(entriesQuery.data?.entries.map((e) => [e.studentId, e]) ?? []);
    return rosterStudents.map((student) => ({
      student,
      entry: entryByStudent.get(student.id) ?? null,
      examConfigId: activeConfig?.id ?? '',
    }));
  }, [rosterStudents, entriesQuery.data, activeConfig?.id]);

  const entries = entriesQuery.data?.entries ?? [];
  const progress = computeGradebookProgress(entries, rosterStudents.length);
  const fullyLocked = isGradebookFullyLocked(progress);

  const isLoading =
    entriesQuery.isLoading ||
    rosterQuery.isLoading ||
    examConfigsQuery.isLoading ||
    studentsQuery.isLoading ||
    (!isClassTeacherView && schemesQuery.isLoading);

  const classLabel =
    classArmOptions(ctx.arms, ctx.levels).find((arm) => arm.id === ctx.classArmId)?.label ??
    teacherCtx.classTeacherClassArmLabel ??
    null;

  const subjectLabel = resolvedSubjectId ? formatSubjectLabel(resolvedSubjectId) : null;
  const termLabel = ctx.activeTerm?.name ?? null;

  async function handleLock() {
    if (!ctx.termId || !ctx.classArmId || !resolvedSubjectId) return;
    setLockError(null);
    try {
      await lockGradebook.mutateAsync({
        termId: ctx.termId,
        classArmId: ctx.classArmId,
        subjectId: resolvedSubjectId,
      });
    } catch (err) {
      setLockError(academicErrorMessage(err));
    }
  }

  if (!tenantId) {
    return (
      <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
        <Alert variant="destructive">
          <AlertDescription>No tenant context. Sign in again.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canView) {
    return (
      <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
        <Alert>
          <AlertDescription>You do not have permission to view the gradebook.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  const isReadOnlyViewer = !canWrite && !isClassTeacherView;
  const caMax = scheme?.continuousAssessmentWeight ?? 40;
  const examMax = scheme?.examWeight ?? 60;

  const statusLeft = isClassTeacherView
    ? `${rosterStudents.length} students · read-only class register`
    : `${progress.complete}/${progress.total} scored · ${progress.locked} locked`;

  const statusRight = isClassTeacherView
    ? 'Missing scores highlighted · open Report cards for a student view'
    : isReadOnlyViewer
      ? 'View only'
      : fullyLocked
        ? 'Locked — use Fix to request correction'
        : `CA /${caMax} + Exam /${examMax} = /100 · Tab · Enter saves`;

  return (
    <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
      <div className="space-y-4">
        <GradebookHero
          variant={isClassTeacherView ? 'classTeacher' : 'teacher'}
          classLabel={classLabel}
          termLabel={termLabel}
          subjectLabel={isClassTeacherView ? null : subjectLabel}
          rosterCount={rosterStudents.length}
          entries={entries}
          isLoading={isLoading}
          canLock={canWrite && !isClassTeacherView}
          isLocking={lockGradebook.isSubmitting}
          onLock={handleLock}
        />

        {isDualClassTeacher ? (
        <Tabs
          value={effectiveWorkspaceTab}
          onValueChange={(value) => setWorkspaceTab(value as GradebookWorkspaceTab)}
          className="w-full max-w-md"
        >
          <TabsList className="grid h-8 w-full grid-cols-2 rounded-md border border-neutral-200 bg-neutral-100 p-0.5">
            <TabsTrigger
              value="register"
              className="h-7 rounded-[5px] text-[11px] font-semibold data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm"
            >
              Class register
            </TabsTrigger>
            <TabsTrigger
              value="entry"
              className="h-7 rounded-[5px] text-[11px] font-semibold data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm"
            >
              Score entry
            </TabsTrigger>
          </TabsList>
        </Tabs>
        ) : null}

        <AcademicScopePicker
          classArmOptions={
            isTeachingStaffRole(role)
              ? teacherCtx.teachingClassArmOptions
              : classArmOptions(ctx.arms, ctx.levels)
          }
          classArmId={ctx.classArmId}
          onClassArmChange={ctx.setClassArmId}
          hideClassSelection={teacherCtx.hideClassSelection}
        />

      {(lockError || (classConfigs.length === 0 && !isClassTeacherView)) ? (
        <div className="space-y-2">
          {lockError ? (
            <Alert variant="destructive">
              <AlertDescription>{lockError}</AlertDescription>
            </Alert>
          ) : null}
          {classConfigs.length === 0 && !isClassTeacherView ? (
            <Alert>
              <AlertDescription>
                No exam sheet for this class.{' '}
                <Link href="/school/exams" className="font-semibold text-brand-700 underline">
                  Exam officer: configure sheets
                </Link>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      {isReadOnlyViewer ? (
        <Alert>
          <AlertDescription>You can review scores here but cannot edit with your current role.</AlertDescription>
        </Alert>
      ) : null}

      {saveError ? (
        <Alert variant="destructive">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      ) : null}

      {entries.some((e) => e.status === 'correction_pending') && !isClassTeacherView ? (
        <Alert variant="warning">
          <AlertDescription>Some rows have corrections awaiting exam officer review.</AlertDescription>
        </Alert>
      ) : null}

      {!ctx.termId || !ctx.classArmId ? (
        <div className={`${ACADEMIC_UI.dataPanel} p-10 text-center`}>
          <p className="text-[15px] font-semibold text-neutral-800">Choose your class to open the gradebook</p>
          <p className="mt-2 text-[13px] text-neutral-500">
            Choose a class in the scope bar above.
          </p>
        </div>
      ) : (
      <GradebookWorkspace
        toolbar={
          isClassTeacherView ? null : (
            <GradebookToolbar
              classArmOptions={
                isTeachingStaffRole(role)
                  ? teacherCtx.teachingClassArmOptions
                  : classArmOptions(ctx.arms, ctx.levels)
              }
              classArmId={ctx.classArmId}
              onClassArmChange={ctx.setClassArmId}
              hideScopeBar
              subjectTabs={subjectTabs}
              activeSubjectId={resolvedSubjectId}
              onSubjectChange={setSubjectId}
              schemeLabel={scheme ? `${scheme.name} · CA /${caMax} · Exam /${examMax}` : null}
              canLock={canWrite}
              isFullyLocked={fullyLocked}
              canSubmitLock={progress.complete === progress.total && progress.total > 0}
              isLocking={lockGradebook.isSubmitting}
              onLock={handleLock}
            />
          )
        }
        statusBar={
          <>
            <span>{statusLeft}</span>
            <span className="text-neutral-500">{statusRight}</span>
          </>
        }
      >
        {isClassTeacherView ? (
          <ConsolidatedGradebook
            entries={entries}
            students={rosterStudents}
            subjectIds={classSubjectIds}
            isLoading={isLoading}
            onOpenReportCard={(studentId) =>
              router.push(`/school/report-cards?studentId=${studentId}`)
            }
          />
        ) : (
          <GradebookSpreadsheet
            rows={rows}
            examConfig={activeConfig}
            caWeight={caMax}
            examWeight={examMax}
            isLoading={isLoading}
            readOnly={!canWrite}
            onSaveCell={async (studentId, examConfigId, ca, exam) => {
              setSaveError(null);
              await upsert.mutateAsync({
                examConfigId,
                studentId,
                continuousAssessmentScore: ca,
                examScore: exam,
              });
            }}
            onSaveError={(err) => setSaveError(academicErrorMessage(err))}
            onRequestCorrection={(entry) => {
              setCorrectionError(null);
              setCorrectionEntry(entry);
            }}
          />
        )}
      </GradebookWorkspace>
      )}

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
      </div>
    </PageBody>
  );
}
