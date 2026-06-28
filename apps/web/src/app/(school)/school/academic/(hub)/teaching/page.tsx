'use client';

import { useMemo, useState } from 'react';
import { useStaffDirectory, useTeachingRoster } from '@loomis/api-client';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';

import { AcademicScopePicker } from '@/components/academic/ops/academic-scope-picker';
import { TeachingAssignmentsHero } from '@/components/academic/teaching/teaching-assignments-hero';
import { TeachingClassPanel } from '@/components/academic/teaching/teaching-class-panel';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatClassArmLabel, SCHOOL_SUBJECT_OPTIONS } from '@/lib/academic/ops-labels';
import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';
import { useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function isTeachingStaff(
  primaryRole: string | null,
  roleExtensions: string[],
): boolean {
  if (primaryRole === 'teacher') return true;
  return roleExtensions.some((r) => r === 'teacher' || r === 'class_teacher');
}

export default function TeachingAssignmentsPage() {
  const tenantId = useTenantId();
  const canManage = useCanAny(['subject.assign', 'classteacher.assign']);
  const ctx = useAcademicOpsContext(tenantId ?? '');
  const arms = useMemo(
    () => classArmOptions(ctx.arms, ctx.levels),
    [ctx.arms, ctx.levels],
  );

  const rosterQuery = useTeachingRoster(tenantId ?? '', ctx.termId);
  const staffQuery = useStaffDirectory(tenantId ?? '');

  const [classArmId, setClassArmId] = useState<string | null>(null);
  const activeClassArmId = classArmId ?? arms[0]?.id ?? null;

  const teacherOptions = useMemo(() => {
    return (staffQuery.data?.staff ?? [])
      .filter(
        (member) =>
          member.status === 'active' &&
          isTeachingStaff(member.primaryRole, member.roleExtensions),
      )
      .map((member) => ({ id: member.id, label: member.fullName }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [staffQuery.data?.staff]);

  const roster = rosterQuery.data;
  const classCount = arms.length;
  const subjectSlots = classCount * SCHOOL_SUBJECT_OPTIONS.length;
  const subjectsAssigned = roster?.subjectAssignments.length ?? 0;
  const classTeachersSet = roster?.classTeachers.length ?? 0;

  const classLabel = useMemo(() => {
    if (!activeClassArmId) return null;
    const arm = ctx.arms.find((a) => a.id === activeClassArmId);
    if (!arm) return null;
    return formatClassArmLabel(arm, ctx.levels);
  }, [activeClassArmId, ctx.arms, ctx.levels]);

  const classSubjectRows = useMemo(
    () =>
      (roster?.subjectAssignments ?? []).filter((row) => row.classArmId === activeClassArmId),
    [roster?.subjectAssignments, activeClassArmId],
  );

  const classTeacher = useMemo(
    () =>
      (roster?.classTeachers ?? []).find((row) => row.classArmId === activeClassArmId) ?? null,
    [roster?.classTeachers, activeClassArmId],
  );

  if (!tenantId) {
    return <p className="text-sm text-red-600">No tenant context.</p>;
  }

  if (!canManage) {
    return (
      <p className="text-sm text-neutral-500">
        You do not have permission to manage teaching assignments.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <TeachingAssignmentsHero
        termLabel={ctx.activeTerm?.name ?? null}
        classCount={classCount}
        classTeachersSet={classTeachersSet}
        subjectsAssigned={subjectsAssigned}
        subjectSlots={subjectSlots}
        isLoading={ctx.structureQuery.isLoading || rosterQuery.isLoading}
      />

      {!ctx.termId ? (
        <Alert>
          <AlertDescription>
            Open a school term first — go to School year or finish the setup guide.
          </AlertDescription>
        </Alert>
      ) : arms.length === 0 ? (
        <Alert>
          <AlertDescription>
            Add class levels and arms before assigning teachers — use Classes or the setup guide.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <AcademicScopePicker
            classArmOptions={arms}
            classArmId={activeClassArmId}
            onClassArmChange={setClassArmId}
            selectedClassMeta={
              classTeacher
                ? `Class teacher: ${classTeacher.staffName}`
                : 'No class teacher yet'
            }
          />

          {rosterQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>Could not load the teaching roster. Try again.</AlertDescription>
            </Alert>
          ) : rosterQuery.isLoading || !activeClassArmId || !classLabel ? (
            <Skeleton className={`h-96 w-full rounded-2xl ${ACADEMIC_UI.dataPanel}`} />
          ) : (
            <TeachingClassPanel
              tenantId={tenantId}
              termId={ctx.termId}
              classArmId={activeClassArmId}
              classLabel={classLabel}
              subjectRows={classSubjectRows}
              classTeacher={classTeacher}
              teacherOptions={teacherOptions}
              onUpdated={() => void rosterQuery.refetch()}
            />
          )}
        </>
      )}
    </div>
  );
}
