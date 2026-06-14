'use client';

import { useTeachingStaffContext } from '@loomis/api-client';
import type { Role } from '@loomis/contracts';
import { useMemo } from 'react';

import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';
import { useRole } from '@/lib/auth/use-capability';
import { isClassTeacherRole, isTeachingStaffRole } from '@/lib/timetable/is-teaching-staff';

export type TeachingStaffScopeMode = 'default' | 'classTeacherClass';

interface TeachingStaffScopeOptions {
  /** Lock class teachers to their assigned class (attendance, consolidated gradebook). */
  mode?: TeachingStaffScopeMode;
}

/**
 * Academic scope for teaching staff — resolves class arms from HRM assignments
 * (Greenfield rich seed: teacher01@loomis.com … teacher16@loomis.com), not the
 * first class in the school.
 */
export function useTeachingStaffScope(tenantId: string, options: TeachingStaffScopeOptions = {}) {
  const role = useRole();
  const isTeachingStaff = isTeachingStaffRole(role);
  const isClassTeacher = isClassTeacherRole(role);
  const ctx = useAcademicOpsContext(tenantId);
  const teachingQuery = useTeachingStaffContext(tenantId, isTeachingStaff ? ctx.termId : null);
  const teaching = teachingQuery.data;

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
