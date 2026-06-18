'use client';

import { useExamConfigs, useGradebookEntries, useGradingSchemes, useSchoolBranding, useStudents, useTermEnrollmentRoster } from '@loomis/api-client';
import type { StudentGender, StudentResponse } from '@loomis/contracts';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { AcademicScopePicker } from '@/components/academic/ops/academic-scope-picker';
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

  const passMark = activeScheme?.passMark ?? 40;

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
          <AlertDescription>You do not have permission to view report cards.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className="flex flex-col px-3 py-3 sm:px-4 lg:px-6 lg:py-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-[15px] font-bold text-neutral-800">Report cards</h1>
          <p className="text-[11px] text-neutral-500">
            Term reports per student — search, refine, and notify parents.
          </p>
        </div>
        <span className="truncate text-[11px] text-neutral-500">
          {[classLabel, ctx.activeTerm?.name].filter(Boolean).join(' · ')}
        </span>
      </div>

      <div className="mb-2 print:hidden">
        <AcademicScopePicker
          classArmOptions={
            isTeachingStaffRole(role)
              ? teacherCtx.teachingClassArmOptions
              : classArmOptions(ctx.arms, ctx.levels)
          }
          classArmId={ctx.classArmId}
          onClassArmChange={ctx.setClassArmId}
          hideClassSelection={isClassTeacherView && teacherCtx.hideClassSelection}
        />
      </div>

      <ReportCardBrowser
        students={rosterStudents}
        rosterStudents={rosterStudents}
        subjectIds={allClassSubjectIds}
        entries={entriesQuery.data?.entries ?? []}
        selectedStudentId={selectedStudentId}
        onSelectStudent={setSelectedStudentId}
        classArmId={ctx.classArmId}
        termId={ctx.termId}
        termName={ctx.activeTerm?.name}
        sessionName={ctx.activeYear?.label}
        classLabel={classLabel}
        schoolName={brandingQuery.data?.tenantName}
        logoStorageObjectId={brandingQuery.data?.branding.logoStorageObjectId}
        schemeName={activeScheme?.name}
        caWeight={activeScheme?.continuousAssessmentWeight ?? 40}
        examWeight={activeScheme?.examWeight ?? 60}
        passMark={passMark}
        gradeBands={activeScheme?.gradeBands ?? []}
        isLoading={isLoading}
      />
    </PageBody>
  );
}
