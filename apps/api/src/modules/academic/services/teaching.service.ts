import { staffRepository } from '../../hrm/repository/staff.repository.js';
import { LoomisError } from '../../../shared/errors.js';
import { academicRepository } from '../repository/academic.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant } from './_shared.js';

async function classArmLabel(tenantId: string, classArmId: string): Promise<string> {
  const classArm = await academicRepository.findClassArmById(tenantId, classArmId);
  if (!classArm) return 'Class';
  const level = await academicRepository.findClassLevelById(tenantId, classArm.classLevelId);
  return level ? `${level.code} ${classArm.name}` : classArm.name;
}

/** Resolved HRM teaching scope for the logged-in teacher or class teacher. */
export const teachingService = {
  async getStaffContext(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);

    if (actor.role !== 'teacher' && actor.role !== 'class_teacher') {
      throw new LoomisError('FORBIDDEN', 403, 'Teaching staff role required');
    }

    const profile = await staffRepository.findProfileByUserId(tenantId, actor.userId);
    if (!profile || profile.status !== 'active') {
      throw new LoomisError('HRM_STAFF_NOT_FOUND', 404, 'Staff profile not found');
    }

    const rawAssignments = await staffRepository.listActiveSubjectAssignments(tenantId, profile.id);
    const termAssignments = rawAssignments.filter((assignment) => assignment.termId === termId);

    const labelCache = new Map<string, string>();
    const subjectAssignments = await Promise.all(
      termAssignments.map(async (assignment) => {
        let label = labelCache.get(assignment.classArmId);
        if (!label) {
          label = await classArmLabel(tenantId, assignment.classArmId);
          labelCache.set(assignment.classArmId, label);
        }
        return {
          assignmentId: assignment.id,
          termId: assignment.termId,
          classArmId: assignment.classArmId,
          classArmLabel: label,
          subjectId: assignment.subjectId,
        };
      }),
    );

    let classTeacherAssignment: {
      termId: string;
      classArmId: string;
      classArmLabel: string;
    } | null = null;

    if (actor.role === 'class_teacher') {
      const assignment = await staffRepository.findActiveClassTeacherForStaffTerm(
        tenantId,
        profile.id,
        termId,
      );
      if (assignment) {
        classTeacherAssignment = {
          termId: assignment.termId,
          classArmId: assignment.classArmId,
          classArmLabel: await classArmLabel(tenantId, assignment.classArmId),
        };
      }
    }

    return {
      staffProfileId: profile.id,
      subjectAssignments,
      classTeacherAssignment,
    };
  },
};
