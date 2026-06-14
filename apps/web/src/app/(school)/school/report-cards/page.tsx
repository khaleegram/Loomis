'use client';

import Link from 'next/link';
import { useExamConfigs, useGradebookEntries, useGradingSchemes, useSchoolBranding, useStudents, useTermEnrollmentRoster } from '@loomis/api-client';
import type { StudentGender, StudentResponse } from '@loomis/contracts';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { GradebookScopeBar } from '@/components/academic/ops/gradebook-scope-bar';
import { ReportCardBrowser } from '@/components/academic/ops/report-card-browser';
import { PageBody } from '@/components/school/school-shell';
import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';
import { useCanAny, useRole } from '@/lib/auth/use-capability';
import { isClassTeacherRole, isTeachingStaffRole } from '@/lib/timetable/is-teaching-staff';
import { useTeachingStaffScope } from '@/lib/timetable/use-teaching-staff-scope';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

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

export default function ReportCardsPage() {
  const tenantId = useTenantId();
  const role = useRole();
  const searchParams = useSearchParams();
  const canView = useCanAny(['gradebook.read', 'gradebook.write']);

  const isClassTeacherView = isClassTeacherRole(role);
  const adminCtx = useAcademicOpsContext(tenantId ?? '');
  const teacherCtx = useTeachingStaffScope(tenantId ?? '', {
    mode: isClassTeacherView ? 'classTeacherClass' : 'default',
  });
  const ctx = isTeachingStaffRole(role) ? teacherCtx : adminCtx;

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    searchParams.get('studentId'),
  );

  const examConfigsQuery = useExamConfigs(tenantId ?? '', ctx.termId ?? '');
  const schemesQuery = useGradingSchemes(tenantId ?? '');
  const classExamConfigs = useMemo(
    () => examConfigsQuery.data?.configs.filter((c) => c.classArmId === ctx.classArmId) ?? [],
    [examConfigsQuery.data, ctx.classArmId],
  );
  const allClassSubjectIds = useMemo(() => {
    const ids = classExamConfigs.map((c) => c.subjectId);
    return [...new Set(ids)].sort();
  }, [classExamConfigs]);

  const activeScheme = useMemo(() => {
    const schemes = schemesQuery.data?.schemes ?? [];
    if (classExamConfigs.length === 0) {
      return schemes.find((scheme) => scheme.isDefault) ?? schemes[0] ?? null;
    }
    const schemeId = classExamConfigs[0]?.gradingSchemeId;
    return schemes.find((scheme) => scheme.id === schemeId) ?? schemes.find((s) => s.isDefault) ?? null;
  }, [schemesQuery.data, classExamConfigs]);

  const gradebookFilters =
    ctx.termId && ctx.classArmId ? { termId: ctx.termId, classArmId: ctx.classArmId } : null;

  const entriesQuery = useGradebookEntries(tenantId ?? '', gradebookFilters);
  const rosterQuery = useTermEnrollmentRoster(tenantId ?? '', ctx.termId ?? '');
  const studentsQuery = useStudents(tenantId ?? '');
  const brandingQuery = useSchoolBranding(tenantId ?? '');

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

  useEffect(() => {
    setSelectedStudentId(searchParams.get('studentId'));
  }, [ctx.classArmId, ctx.termId, searchParams]);

  const isLoading =
    entriesQuery.isLoading ||
    rosterQuery.isLoading ||
    examConfigsQuery.isLoading ||
    schemesQuery.isLoading ||
    studentsQuery.isLoading ||
    brandingQuery.isLoading;

  const classLabel =
    classArmOptions(ctx.arms, ctx.levels).find((arm) => arm.id === ctx.classArmId)?.label ??
    teacherCtx.classTeacherClassArmLabel ??
    null;

  if (!tenantId) {
    return (
      <PageBody className="px-4 py-5 sm:px-6 lg:px-8">
        <Alert variant="destructive">
          <AlertDescription>No tenant context. Sign in again.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canView) {
    return (
      <PageBody className="px-4 py-5 sm:px-6 lg:px-8">
        <Alert>
          <AlertDescription>You do not have permission to view report cards.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className="px-3 py-3 sm:px-4 lg:px-6 lg:py-4">
      <div className="print:hidden mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[15px] font-bold text-neutral-800">Report cards</h1>
          <p className="mt-0.5 max-w-xl text-[12px] text-neutral-500">
            Official term reports for each student — printable layout with subject breakdown, class position,
            and grading scale. Live from the gradebook until results are published.
          </p>
        </div>
        <Link href="/school/gradebook" className="text-[12px] font-semibold text-brand-700 hover:underline">
          ← Score entry
        </Link>
      </div>

      <div className="print:hidden mb-3 rounded-lg border border-neutral-200 bg-[#f8f6f1] px-3 py-2.5 sm:px-4">
        <GradebookScopeBar
          years={ctx.sortedYears}
          terms={ctx.terms}
          classArmOptions={
            isTeachingStaffRole(role)
              ? teacherCtx.teachingClassArmOptions
              : classArmOptions(ctx.arms, ctx.levels)
          }
          yearId={ctx.yearId}
          termId={ctx.termId}
          classArmId={ctx.classArmId}
          onYearChange={(id) => {
            ctx.setYearId(id);
            ctx.setTermId(null);
          }}
          onTermChange={ctx.setTermId}
          onClassArmChange={ctx.setClassArmId}
          hideClassSelection={isClassTeacherView && teacherCtx.hideClassSelection}
        />
      </div>

      <div className="mt-3">
        <ReportCardBrowser
          students={rosterStudents}
          rosterStudents={rosterStudents}
          subjectIds={allClassSubjectIds}
          entries={entriesQuery.data?.entries ?? []}
          selectedStudentId={selectedStudentId}
          onSelectStudent={setSelectedStudentId}
          termName={ctx.activeTerm?.name}
          sessionName={ctx.activeYear?.label}
          classLabel={classLabel}
          schoolName={brandingQuery.data?.tenantName}
          logoStorageObjectId={brandingQuery.data?.branding.logoStorageObjectId}
          schemeName={activeScheme?.name}
          caWeight={activeScheme?.continuousAssessmentWeight ?? 40}
          examWeight={activeScheme?.examWeight ?? 60}
          passMark={activeScheme?.passMark ?? 40}
          gradeBands={activeScheme?.gradeBands ?? []}
          isLoading={isLoading}
        />
      </div>
    </PageBody>
  );
}
