'use client';

import { useTeachingStaffContext } from '@loomis/api-client';
import type { Role } from '@loomis/contracts';
import { isSchoolTenantRole } from '@loomis/core';
import { useMemo } from 'react';

import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';
import { useRole } from '@/lib/auth/use-capability';
import { hasTeachingDuties } from '@/lib/school/derive-teaching-roles';
import { isClassTeacherRole, isTeachingStaffRole } from '@/lib/timetable/is-teaching-staff';

export type TeachingStaffScopeMode = 'default' | 'classTeacherClass';

interface TeachingStaffScopeOptions {
  /** Lock class teachers to their assigned class (attendance, consolidated gradebook). */
  mode?: TeachingStaffScopeMode;
}

/**
 * Academic scope for teaching staff — resolves class arms from HRM assignments
 * (including staff whose primary role is accountant/admin with a teacher extension).
 */
export function useTeachingStaffScope(tenantId: string, options: TeachingStaffScopeOptions = {}) {
  const role = useRole();
  const ctx = useAcademicOpsContext(tenantId);
  const teachingQuery = useTeachingStaffContext(
    tenantId,
    role && isSchoolTenantRole(role) ? ctx.termId : null,
  );
  const teaching = teachingQuery.data;
  const teachingDuties = hasTeachingDuties(teaching);
  const isTeachingStaff =
    isTeachingStaffRole(role) || teachingDuties;
  const isClassTeacher =
    isClassTeacherRole(role) || Boolean(teaching?.classTeacherAssignment);

  const teachingClassArmOptions = useMemo(() => {
    if (!teaching?.subjectAssignments.length) return [];
    const seen = new Map<string, string>();
    for (const assignment of teaching.subjectAssignments) {
      if (!seen.has(assignment.classArmId)) {
        seen.set(assignment.classArmId, assignment.classArmLabel);
      }
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [teaching?.subjectAssignments]);

  const classTeacherClassArmId = teaching?.classTeacherAssignment?.classArmId ?? null;
  const classTeacherClassArmLabel = teaching?.classTeacherAssignment?.classArmLabel ?? null;

  const defaultTeachingClassArmId =
    (isClassTeacher && classTeacherClassArmId) ||
    teachingClassArmOptions[0]?.id ||
    ctx.classArmId;

  const lockToClassTeacherClass = options.mode === 'classTeacherClass' && isClassTeacher;

  const effectiveClassArmId = lockToClassTeacherClass
    ? classTeacherClassArmId
    : ctx.classArmId &&
        teachingClassArmOptions.some((option) => option.id === ctx.classArmId)
      ? ctx.classArmId
      : defaultTeachingClassArmId;

  const subjectAssignmentsForClass = useMemo(() => {
    if (!teaching || !effectiveClassArmId) return [];
    return teaching.subjectAssignments.filter(
      (assignment) => assignment.classArmId === effectiveClassArmId,
    );
  }, [teaching, effectiveClassArmId]);

  const scopedClassArmOptions = isTeachingStaff
    ? teachingClassArmOptions
    : classArmOptions(ctx.arms, ctx.levels);

  const hideClassSelection =
    lockToClassTeacherClass ||
    (isTeachingStaff && teachingClassArmOptions.length <= 1 && Boolean(effectiveClassArmId));

  return {
    ...ctx,
    role: role as Role | null,
    isTeachingStaff,
    isClassTeacher,
    teachingQuery,
    teachingClassArmOptions: scopedClassArmOptions,
    classArmId: effectiveClassArmId,
    classTeacherClassArmId,
    classTeacherClassArmLabel,
    subjectAssignmentsForClass,
    staffProfileId: teaching?.staffProfileId ?? null,
    hideClassSelection,
    setClassArmId: ctx.setClassArmId,
  };
}
