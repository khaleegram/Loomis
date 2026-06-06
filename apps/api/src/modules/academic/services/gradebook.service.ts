import { LoomisError } from '../../../shared/errors.js';
import { staffService } from '../../hrm/services/staff.service.js';
import { workflowService } from '../../workflow/index.js';
import type { WorkflowCompletedEvent } from '../../workflow/events/types.js';
import { academicRepository } from '../repository/academic.repository.js';
import type {
  ActorContext,
  CreateExamConfigInput,
  CreateGradingSchemeInput,
  GradeCalculation,
  ListGradebookInput,
  PublishResultsRequestInput,
  RequestGradeCorrectionInput,
  UpsertGradebookEntryInput,
} from '../types.js';
import { requireTenant, requireTerm } from './_shared.js';

type GradingSchemeRow = NonNullable<Awaited<ReturnType<typeof academicRepository.findGradingSchemeById>>>;
type GradebookEntryRow = NonNullable<Awaited<ReturnType<typeof academicRepository.findGradebookEntryById>>>;

function calculateGrade(
  scheme: Pick<GradingSchemeRow, 'continuousAssessmentWeight' | 'examWeight' | 'gradeBands'>,
  input: Pick<UpsertGradebookEntryInput, 'continuousAssessmentScore' | 'examScore'>,
): GradeCalculation {
  const totalScore = Math.round(
    (input.continuousAssessmentScore * scheme.continuousAssessmentWeight) / 100 +
      (input.examScore * scheme.examWeight) / 100,
  );
  const band = scheme.gradeBands.find(
    (candidate) => totalScore >= candidate.minScore && totalScore <= candidate.maxScore,
  );
  if (!band) {
    throw new LoomisError('ACADEMIC_GRADE_BAND_NOT_FOUND', 422, 'No grade band matches the calculated score');
  }
  return { totalScore, grade: band.grade, remark: band.remark };
}

async function requireTeacherSubjectAssignment(params: {
  tenantId: string;
  actor: ActorContext;
  termId: string;
  classArmId: string;
  subjectId: string;
}) {
  const assignment = await staffService.findActiveSubjectAssignmentForUser({
    tenantId: params.tenantId,
    userId: params.actor.userId,
    termId: params.termId,
    classArmId: params.classArmId,
    subjectId: params.subjectId,
  });
  if (!assignment) {
    throw new LoomisError(
      'ACADEMIC_GRADEBOOK_FORBIDDEN',
      403,
      'Teacher can write grades only for their own assigned subjects',
    );
  }
  return assignment;
}

async function requireReadableGradebook(tenantId: string, input: ListGradebookInput, actor: ActorContext) {
  if (actor.role === 'teacher') {
    if (!input.subjectId) {
      throw new LoomisError('VALIDATION_ERROR', 422, 'Teachers must filter gradebook reads by subjectId');
    }
    await requireTeacherSubjectAssignment({
      tenantId,
      actor,
      termId: input.termId,
      classArmId: input.classArmId,
      subjectId: input.subjectId,
    });
  }

  if (actor.role === 'class_teacher') {
    const assignment = await staffService.findActiveClassTeacherAssignmentForUser({
      tenantId,
      userId: actor.userId,
      termId: input.termId,
      classArmId: input.classArmId,
    });
    if (!assignment) {
      throw new LoomisError(
        'ACADEMIC_GRADEBOOK_FORBIDDEN',
        403,
        'Class Teachers can read gradebooks only for their assigned class arm',
      );
    }
  }
}

export const gradebookService = {
  async createGradingScheme(tenantId: string, input: CreateGradingSchemeInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
    try {
      return await academicRepository.createGradingScheme(tenantId, input, actor.userId);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new LoomisError('ACADEMIC_GRADING_SCHEME_CONFLICT', 409, 'Grading scheme already exists');
      }
      throw err;
    }
  },

  async listGradingSchemes(tenantId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    return academicRepository.listGradingSchemes(tenantId);
  },

  async createExamConfig(tenantId: string, input: CreateExamConfigInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
    await requireTerm(tenantId, input.termId);
    const classArm = await academicRepository.findClassArmById(tenantId, input.classArmId);
    if (!classArm) {
      throw new LoomisError('ACADEMIC_CLASS_ARM_NOT_FOUND', 404, 'Class arm not found');
    }
    const scheme = await academicRepository.findGradingSchemeById(tenantId, input.gradingSchemeId);
    if (!scheme) {
      throw new LoomisError('ACADEMIC_GRADING_SCHEME_NOT_FOUND', 404, 'Grading scheme not found');
    }

    try {
      return await academicRepository.createExamConfig(tenantId, input, actor.userId);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new LoomisError('ACADEMIC_EXAM_CONFIG_CONFLICT', 409, 'Exam config already exists');
      }
      throw err;
    }
  },

  async listExamConfigs(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    await requireTerm(tenantId, termId);
    return academicRepository.listExamConfigs(tenantId, termId);
  },

  async upsertGradebookEntry(tenantId: string, input: UpsertGradebookEntryInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const config = await academicRepository.findExamConfigById(tenantId, input.examConfigId);
    if (!config) {
      throw new LoomisError('ACADEMIC_EXAM_CONFIG_NOT_FOUND', 404, 'Exam config not found');
    }
    const scheme = await academicRepository.findGradingSchemeById(tenantId, config.gradingSchemeId);
    if (!scheme) {
      throw new LoomisError('ACADEMIC_GRADING_SCHEME_NOT_FOUND', 404, 'Grading scheme not found');
    }
    const assignment = await requireTeacherSubjectAssignment({
      tenantId,
      actor,
      termId: config.termId,
      classArmId: config.classArmId,
      subjectId: config.subjectId,
    });
    const calculation = calculateGrade(scheme, input);
    const entry = await academicRepository.upsertGradebookEntry({
      tenantId,
      gradebook: input,
      examConfig: config,
      calculation,
      teacherStaffProfileId: assignment.staffProfileId,
    });
    if (!entry) {
      throw new LoomisError(
        'ACADEMIC_GRADE_CORRECTION_PENDING',
        409,
        'This grade has a pending correction workflow',
      );
    }
    return entry;
  },

  async listGradebookEntries(tenantId: string, input: ListGradebookInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
    await requireTerm(tenantId, input.termId);
    await requireReadableGradebook(tenantId, input, actor);
    return academicRepository.listGradebookEntries({
      tenantId,
      termId: input.termId,
      classArmId: input.classArmId,
      ...(input.subjectId ? { subjectId: input.subjectId } : {}),
    });
  },

  async requestGradeCorrection(
    tenantId: string,
    entryId: string,
    input: RequestGradeCorrectionInput,
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);
    const entry = await this.requireEntry(tenantId, entryId);
    if (entry.status === 'correction_pending') {
      throw new LoomisError('ACADEMIC_GRADE_CORRECTION_PENDING', 409, 'A correction is already pending');
    }
    await requireTeacherSubjectAssignment({
      tenantId,
      actor,
      termId: entry.termId,
      classArmId: entry.classArmId,
      subjectId: entry.subjectId,
    });
    const scheme = await academicRepository.findGradingSchemeById(tenantId, entry.gradingSchemeId);
    if (!scheme) {
      throw new LoomisError('ACADEMIC_GRADING_SCHEME_NOT_FOUND', 404, 'Grading scheme not found');
    }
    const calculation = calculateGrade(scheme, input);
    const workflow = await workflowService.startWorkflow({
      workflowType: 'grade_correction',
      tenantId,
      requestedById: actor.userId,
      requestedByRole: actor.role,
      subjectType: 'gradebook_entry',
      subjectId: entry.id,
      title: 'Grade correction request',
      payload: {
        gradebookEntryId: entry.id,
        continuousAssessmentScore: input.continuousAssessmentScore,
        examScore: input.examScore,
        totalScore: calculation.totalScore,
        grade: calculation.grade,
        reason: input.reason,
      },
    });

    return academicRepository.createGradeCorrectionRequest({
      tenantId,
      entry,
      correction: input,
      calculation,
      workflowInstanceId: workflow.workflowInstanceId,
      requestedById: actor.userId,
    });
  },

  async publishResults(tenantId: string, input: PublishResultsRequestInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
    await requireTerm(tenantId, input.termId);
    const entries = await academicRepository.listGradebookEntries({ tenantId, ...input });
    if (entries.length === 0) {
      throw new LoomisError('ACADEMIC_RESULTS_EMPTY', 422, 'No gradebook entries found for this class');
    }
    if (entries.some((entry) => entry.status === 'correction_pending')) {
      throw new LoomisError(
        'ACADEMIC_RESULTS_CORRECTION_PENDING',
        409,
        'Resolve pending grade corrections before publishing results',
      );
    }

    const byStudent = new Map<string, number[]>();
    for (const entry of entries) {
      const scores = byStudent.get(entry.studentId) ?? [];
      scores.push(entry.totalScore);
      byStudent.set(entry.studentId, scores);
    }

    const resultRows = [...byStudent.entries()].map(([studentId, scores]) => ({
      studentId,
      averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    }));

    return academicRepository.publishResults({
      tenantId,
      termId: input.termId,
      classArmId: input.classArmId,
      publishedById: actor.userId,
      results: resultRows,
    });
  },

  async handleWorkflowCompleted(payload: WorkflowCompletedEvent): Promise<void> {
    if (payload.workflowType !== 'grade_correction' || !payload.tenantId) return;
    const correction = await academicRepository.findGradeCorrectionByWorkflow(
      payload.tenantId,
      payload.workflowInstanceId,
    );
    if (!correction || correction.status !== 'pending') return;

    if (payload.status === 'approved' && payload.approvedById) {
      await academicRepository.applyGradeCorrection({
        tenantId: payload.tenantId,
        correction,
        approvedById: payload.approvedById,
      });
      return;
    }

    if (payload.status === 'rejected' || payload.status === 'returned') {
      await academicRepository.markGradeCorrectionTerminal({
        tenantId: payload.tenantId,
        correction,
        status: payload.status,
      });
    }
  },

  async requireEntry(tenantId: string, entryId: string): Promise<GradebookEntryRow> {
    const entry = await academicRepository.findGradebookEntryById(tenantId, entryId);
    if (!entry) {
      throw new LoomisError('ACADEMIC_GRADEBOOK_ENTRY_NOT_FOUND', 404, 'Gradebook entry not found');
    }
    return entry;
  },
};

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505';
}
