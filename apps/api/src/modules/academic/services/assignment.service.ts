import type {
  CreateAssignmentRequest,
  CreateSubmissionRequest,
  GradeSubmissionRequest,
  UpdateAssignmentRequest,
} from '@loomis/contracts';
import { staffRepository } from '../../hrm/repository/staff.repository.js';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { academicOpsEvents } from '../events/ops-events.js';
import { academicRepository } from '../repository/academic.repository.js';
import { assignmentRepository } from '../repository/assignment.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant, requireTerm } from './_shared.js';

/**
 * Assignment management (SRS §4.5 FR-ACA-003; US-ACA-007). A Teacher creates and
 * manages assignments for their OWN assigned subject/class (verified against the
 * HRM subject assignment). Students submit; teachers grade individual
 * submissions; a submission after the due date is flagged late automatically.
 */
export const assignmentService = {
  async createAssignment(
    tenantId: string,
    input: CreateAssignmentRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    const term = await requireTerm(tenantId, input.termId);
    if (term.status === 'closed') {
      throw new LoomisError(
        'ACADEMIC_TERM_NOT_OPEN',
        409,
        'Assignments cannot be created for a closed term',
      );
    }
    const arm = await academicRepository.findClassArmById(tenantId, input.classArmId);
    if (!arm) {
      throw new LoomisError('ACADEMIC_CLASS_ARM_NOT_FOUND', 404, 'Class arm not found');
    }

    const profile = await requireSubjectTeacher(tenantId, actor, {
      termId: input.termId,
      classArmId: input.classArmId,
      subjectId: input.subjectId,
    });

    const assignment = await assignmentRepository.createAssignment(
      tenantId,
      {
        termId: input.termId,
        classArmId: input.classArmId,
        subjectId: input.subjectId,
        teacherStaffProfileId: profile.id,
        title: input.title,
        instructions: input.instructions,
        dueAt: new Date(input.dueAt),
        maxScore: input.maxScore,
      },
      actor.userId,
    );

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.assignment.created',
      resourceType: 'assignment',
      resourceId: assignment.id,
      sensitivity: 'standard',
      result: 'success',
      requestId,
      metadata: { termId: input.termId, classArmId: input.classArmId, subjectId: input.subjectId },
    });

    return assignment;
  },

  async updateAssignment(
    tenantId: string,
    assignmentId: string,
    input: UpdateAssignmentRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    const assignment = await requireOwnedAssignment(tenantId, assignmentId, actor);

    const updated = await assignmentRepository.updateAssignment(tenantId, assignment.id, {
      title: input.title,
      instructions: input.instructions,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      maxScore: input.maxScore,
    });
    if (!updated) {
      throw new LoomisError('ACADEMIC_ASSIGNMENT_NOT_FOUND', 404, 'Assignment not found');
    }

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.assignment.updated',
      resourceType: 'assignment',
      resourceId: assignment.id,
      sensitivity: 'standard',
      result: 'success',
      requestId,
    });

    return updated;
  },

  async publishAssignment(
    tenantId: string,
    assignmentId: string,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    const assignment = await requireOwnedAssignment(tenantId, assignmentId, actor);
    const published = await assignmentRepository.publishAssignment(tenantId, assignment.id);
    if (!published) {
      throw new LoomisError('ACADEMIC_ASSIGNMENT_NOT_FOUND', 404, 'Assignment not found');
    }

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.assignment.published',
      resourceType: 'assignment',
      resourceId: assignment.id,
      sensitivity: 'standard',
      result: 'success',
      requestId,
    });

    await academicOpsEvents.publishAssignmentPublished({
      tenantId,
      assignmentId: assignment.id,
      classArmId: assignment.classArmId,
      dueAt: published.dueAt.toISOString(),
      publishedById: actor.userId,
    });

    return published;
  },

  async listAssignments(
    tenantId: string,
    filter: { termId: string; classArmId: string; subjectId?: string | undefined },
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);
    return assignmentRepository.listAssignments(tenantId, filter);
  },

  /**
   * A student submits work. The assignment must be published; a submission after
   * the due date is flagged late automatically (US-ACA-007).
   */
  async submitAssignment(
    tenantId: string,
    assignmentId: string,
    input: CreateSubmissionRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    const assignment = await assignmentRepository.findAssignmentById(tenantId, assignmentId);
    if (!assignment) {
      throw new LoomisError('ACADEMIC_ASSIGNMENT_NOT_FOUND', 404, 'Assignment not found');
    }
    if (assignment.status !== 'published') {
      throw new LoomisError(
        'ACADEMIC_ASSIGNMENT_NOT_PUBLISHED',
        409,
        'This assignment is not open for submissions',
      );
    }

    const studentId = actor.userId;
    const existing = await assignmentRepository.findSubmissionByStudent(
      tenantId,
      assignmentId,
      studentId,
    );
    if (existing) {
      throw new LoomisError(
        'ACADEMIC_SUBMISSION_ALREADY_EXISTS',
        409,
        'You have already submitted this assignment',
      );
    }

    const isLate = Date.now() > assignment.dueAt.getTime();
    const submission = await assignmentRepository.createSubmission(tenantId, {
      assignmentId,
      studentId,
      content: input.content ?? null,
      storageObjectId: input.storageObjectId ?? null,
      isLate,
      status: isLate ? 'late' : 'submitted',
    });

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.assignment.submitted',
      resourceType: 'submission',
      resourceId: submission.id,
      sensitivity: 'child_pii',
      result: 'success',
      requestId,
      metadata: { assignmentId, isLate },
    });

    await academicOpsEvents.publishAssignmentSubmitted({
      tenantId,
      assignmentId,
      submissionId: submission.id,
      studentId,
      isLate,
    });

    return submission;
  },

  async gradeSubmission(
    tenantId: string,
    submissionId: string,
    input: GradeSubmissionRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    const submission = await assignmentRepository.findSubmissionById(tenantId, submissionId);
    if (!submission) {
      throw new LoomisError('ACADEMIC_SUBMISSION_NOT_FOUND', 404, 'Submission not found');
    }
    const assignment = await requireOwnedAssignment(tenantId, submission.assignmentId, actor);

    if (input.score > assignment.maxScore) {
      throw new LoomisError(
        'VALIDATION_ERROR',
        422,
        `Score cannot exceed the assignment maximum of ${assignment.maxScore}`,
      );
    }

    const profile = await resolveStaffProfile(tenantId, actor);
    const graded = await assignmentRepository.gradeSubmission(tenantId, submissionId, {
      score: input.score,
      feedback: input.feedback ?? null,
      gradedByStaffProfileId: profile.id,
    });
    if (!graded) {
      throw new LoomisError('ACADEMIC_SUBMISSION_NOT_FOUND', 404, 'Submission not found');
    }

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.assignment.graded',
      resourceType: 'submission',
      resourceId: submissionId,
      sensitivity: 'child_pii',
      result: 'success',
      requestId,
      metadata: { assignmentId: submission.assignmentId, score: input.score },
    });

    return graded;
  },

  async listSubmissions(tenantId: string, assignmentId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const assignment = await assignmentRepository.findAssignmentById(tenantId, assignmentId);
    if (!assignment) {
      throw new LoomisError('ACADEMIC_ASSIGNMENT_NOT_FOUND', 404, 'Assignment not found');
    }
    return assignmentRepository.listSubmissions(tenantId, assignmentId);
  },
};

async function resolveStaffProfile(tenantId: string, actor: ActorContext) {
  const profile = await staffRepository.findProfileByUserId(tenantId, actor.userId);
  if (!profile) {
    throw new LoomisError(
      'ACADEMIC_ASSIGNMENT_FORBIDDEN',
      403,
      'No staff profile is linked to this account',
    );
  }
  return profile;
}

/** The teacher must hold an active subject assignment for the subject/class/term. */
async function requireSubjectTeacher(
  tenantId: string,
  actor: ActorContext,
  scope: { termId: string; classArmId: string; subjectId: string },
) {
  const profile = await resolveStaffProfile(tenantId, actor);
  const assignment = await staffRepository.findActiveSubjectAssignment({
    tenantId,
    staffProfileId: profile.id,
    termId: scope.termId,
    classArmId: scope.classArmId,
    subjectId: scope.subjectId,
  });
  if (!assignment) {
    throw new LoomisError(
      'ACADEMIC_ASSIGNMENT_FORBIDDEN',
      403,
      'You are not assigned to teach this subject for this class (FR-ACA-005)',
    );
  }
  return profile;
}

/** Loads an assignment and asserts the actor is its owning teacher. */
async function requireOwnedAssignment(tenantId: string, assignmentId: string, actor: ActorContext) {
  const assignment = await assignmentRepository.findAssignmentById(tenantId, assignmentId);
  if (!assignment) {
    throw new LoomisError('ACADEMIC_ASSIGNMENT_NOT_FOUND', 404, 'Assignment not found');
  }
  const profile = await resolveStaffProfile(tenantId, actor);
  if (assignment.teacherStaffProfileId !== profile.id) {
    throw new LoomisError(
      'ACADEMIC_ASSIGNMENT_FORBIDDEN',
      403,
      'Only the assignment owner may manage this assignment',
    );
  }
  return assignment;
}
