import { LoomisError } from '../../../shared/errors.js';
import { staffService } from '../../hrm/services/staff.service.js';
import { studentRepository } from '../../student/repository/student.repository.js';
import { workflowService } from '../../workflow/index.js';
import type { WorkflowCompletedEvent } from '../../workflow/events/types.js';
import { academicRepository } from '../repository/academic.repository.js';
import type {
  ActorContext,
  CreateExamConfigInput,
  CreateGradingSchemeInput,
  GradeCalculation,
  ListGradebookInput,
  LockGradebookInput,
  PublishResultsRequestInput,
  RequestGradeCorrectionInput,
  UpsertGradebookEntryInput,
} from '../types.js';
import { requireTenant, requireTerm } from './_shared.js';
import { SCHOOL_SUBJECT_CATALOGUE } from '../subject-catalogue.js';

type GradingSchemeRow = NonNullable<Awaited<ReturnType<typeof academicRepository.findGradingSchemeById>>>;
type GradebookEntryRow = NonNullable<Awaited<ReturnType<typeof academicRepository.findGradebookEntryById>>>;

function calculateGrade(
  scheme: Pick<GradingSchemeRow, 'continuousAssessmentWeight' | 'examWeight' | 'gradeBands'>,
  input: Pick<UpsertGradebookEntryInput, 'continuousAssessmentScore' | 'examScore'>,
): GradeCalculation {
  if (input.continuousAssessmentScore > scheme.continuousAssessmentWeight) {
    throw new LoomisError(
      'VALIDATION_ERROR',
      422,
      `CA score cannot exceed ${scheme.continuousAssessmentWeight}`,
    );
  }
  if (input.examScore > scheme.examWeight) {
    throw new LoomisError(
      'VALIDATION_ERROR',
      422,
      `Exam score cannot exceed ${scheme.examWeight}`,
    );
  }

  const totalScore = input.continuousAssessmentScore + input.examScore;
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

/** Subject teachers (including class teachers with a subject assignment) need that assignment; principals may enter any sheet. */
async function requireGradebookWriteAccess(params: {
  tenantId: string;
  actor: ActorContext;
  termId: string;
  classArmId: string;
  subjectId: string;
}): Promise<{ staffProfileId: string }> {
  if (params.actor.role === 'principal') {
    const profile = await staffService.findActiveProfileByUserId(params.tenantId, params.actor.userId);
    if (!profile || profile.status !== 'active') {
      throw new LoomisError(
        'ACADEMIC_GRADEBOOK_FORBIDDEN',
        403,
        'Principal must have an active staff profile to enter grades',
      );
    }
    return { staffProfileId: profile.id };
  }

  const assignment = await requireTeacherSubjectAssignment(params);
  return { staffProfileId: assignment.staffProfileId };
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

async function autoProvisionExamConfigsForTerm(
  tenantId: string,
  termId: string,
  gradingSchemeId: string,
  configuredById: string,
): Promise<number> {
  const term = await requireTerm(tenantId, termId);
  const arms = await academicRepository.listClassArms(tenantId, term.academicYearId);
  const existing = await academicRepository.listExamConfigs(tenantId, termId);
  const existingKeys = new Set(existing.map((config) => `${config.classArmId}:${config.subjectId}`));

  let created = 0;
  for (const arm of arms) {
    const level = await academicRepository.findClassLevelById(tenantId, arm.classLevelId);
    const armLabel = level ? `${level.code} ${arm.name}` : arm.name;
    for (const subject of SCHOOL_SUBJECT_CATALOGUE) {
      if (existingKeys.has(`${arm.id}:${subject.id}`)) continue;
      try {
        await academicRepository.createExamConfig(
          tenantId,
          {
            termId,
            classArmId: arm.id,
            subjectId: subject.id,
            gradingSchemeId,
            title: `${armLabel} · ${subject.label}`,
          },
          configuredById,
        );
        existingKeys.add(`${arm.id}:${subject.id}`);
        created++;
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
      }
    }
  }
  return created;
}

async function autoProvisionOpenTerms(tenantId: string, gradingSchemeId: string, actorUserId: string) {
  const years = await academicRepository.listYears(tenantId);
  for (const year of years) {
    const terms = await academicRepository.listTermsByYear(tenantId, year.id);
    for (const term of terms) {
      if (term.status === 'open') {
        await autoProvisionExamConfigsForTerm(tenantId, term.id, gradingSchemeId, actorUserId);
      }
    }
  }
}

export const gradebookService = {
  async createGradingScheme(tenantId: string, input: CreateGradingSchemeInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
    try {
      const scheme = await academicRepository.createGradingScheme(tenantId, input, actor.userId);
      if (input.isDefault) {
        await autoProvisionOpenTerms(tenantId, scheme.id, actor.userId);
      }
      return scheme;
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
    let configs = await academicRepository.listExamConfigs(tenantId, termId);
    if (configs.length === 0) {
      const schemes = await academicRepository.listGradingSchemes(tenantId);
      const defaultScheme = schemes.find((scheme) => scheme.isDefault) ?? schemes[0];
      if (defaultScheme) {
        await autoProvisionExamConfigsForTerm(tenantId, termId, defaultScheme.id, actor.userId);
        configs = await academicRepository.listExamConfigs(tenantId, termId);
      }
    }
    return configs;
  },

  async provisionExamConfigsForTerm(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    await requireTerm(tenantId, termId);
    const schemes = await academicRepository.listGradingSchemes(tenantId);
    const defaultScheme = schemes.find((scheme) => scheme.isDefault) ?? schemes[0];
    if (!defaultScheme) {
      throw new LoomisError(
        'ACADEMIC_GRADING_SCHEME_NOT_FOUND',
        404,
        'Create a default grading scheme before opening the gradebook',
      );
    }
    await autoProvisionExamConfigsForTerm(tenantId, termId, defaultScheme.id, actor.userId);
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
    const writer = await requireGradebookWriteAccess({
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
      teacherStaffProfileId: writer.staffProfileId,
    });
    if (!entry) {
      const existing = await academicRepository.findGradebookEntryForStudent({
        tenantId,
        termId: config.termId,
        classArmId: config.classArmId,
        subjectId: config.subjectId,
        studentId: input.studentId,
      });
      if (existing?.status === 'submitted') {
        throw new LoomisError(
          'ACADEMIC_GRADEBOOK_LOCKED',
          409,
          'Gradebook is locked — request a correction to change submitted scores',
        );
      }
      throw new LoomisError(
        'ACADEMIC_GRADE_CORRECTION_PENDING',
        409,
        'This grade has a pending correction workflow',
      );
    }
    return entry;
  },

  async lockGradebook(tenantId: string, input: LockGradebookInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
    await requireTerm(tenantId, input.termId);
    await requireGradebookWriteAccess({
      tenantId,
      actor,
      termId: input.termId,
      classArmId: input.classArmId,
      subjectId: input.subjectId,
    });

    const config = await academicRepository.listExamConfigs(tenantId, input.termId);
    const examConfig = config.find(
      (candidate) =>
        candidate.classArmId === input.classArmId && candidate.subjectId === input.subjectId,
    );
    if (!examConfig) {
      throw new LoomisError('ACADEMIC_EXAM_CONFIG_NOT_FOUND', 404, 'Exam config not found');
    }

    const rosterRows = await studentRepository.listTermEnrollmentRoster(tenantId, input.termId);
    const rosterStudentIds = rosterRows
      .filter(
        (row) =>
          row.classArmId === input.classArmId &&
          (row.status === 'active' || row.status === 'active_billable' || row.status === 'suspended'),
      )
      .map((row) => row.studentId);

    const entries = await academicRepository.listGradebookEntries({
      tenantId,
      termId: input.termId,
      classArmId: input.classArmId,
      subjectId: input.subjectId,
    });

    const entryByStudent = new Map(entries.map((entry) => [entry.studentId, entry]));
    const missingStudents = rosterStudentIds.filter((studentId) => {
      const entry = entryByStudent.get(studentId);
      return !entry || entry.continuousAssessmentScore == null || entry.examScore == null;
    });

    if (missingStudents.length > 0) {
      throw new LoomisError(
        'ACADEMIC_GRADEBOOK_INCOMPLETE',
        422,
        `${missingStudents.length} student(s) still need complete scores before locking`,
      );
    }

    if (entries.some((entry) => entry.status === 'correction_pending')) {
      throw new LoomisError(
        'ACADEMIC_GRADE_CORRECTION_PENDING',
        409,
        'Resolve pending grade corrections before locking',
      );
    }

    const { lockedCount, alreadyLockedCount } = await academicRepository.lockGradebookEntries({
      tenantId,
      ...input,
    });

    return { lockedCount, alreadyLockedCount };
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
    await requireGradebookWriteAccess({
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
    if (entries.some((entry) => entry.status === 'draft')) {
      throw new LoomisError(
        'ACADEMIC_GRADEBOOK_INCOMPLETE',
        422,
        'All gradebook entries must be locked before publishing results',
      );
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

  async listStudentPublishedResults(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    if (actor.role !== 'student') {
      throw new LoomisError('FORBIDDEN', 403, 'Student role required');
    }

    const student = await studentRepository.findStudentByUserId(tenantId, actor.userId);
    if (!student) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student profile not found');
    }

    return this.getChildPublishedResults(tenantId, student.id, termId);
  },

  async listParentChildPublishedResults(
    tenantId: string,
    studentId: string,
    termId: string,
    actor: ActorContext,
  ) {
    if (actor.role !== 'parent') {
      throw new LoomisError('FORBIDDEN', 403, 'Parent role required');
    }

    const linked = await studentRepository.hasActiveParentLink(tenantId, actor.userId, studentId);
    if (!linked) {
      throw new LoomisError('FORBIDDEN', 403, 'You are not linked to this student');
    }

    return this.getChildPublishedResults(tenantId, studentId, termId);
  },

  async getChildPublishedResults(tenantId: string, studentId: string, termId: string) {
    const term = await academicRepository.findTermById(tenantId, termId);
    if (!term) {
      throw new LoomisError('ACADEMIC_TERM_NOT_FOUND', 404, 'Academic term not found');
    }

    const enrollment = await studentRepository.findEnrollmentForTerm(tenantId, studentId, termId);
    if (
      !enrollment ||
      !['active', 'active_billable', 'suspended'].includes(enrollment.status)
    ) {
      throw new LoomisError('STUDENT_ENROLLMENT_NOT_FOUND', 404, 'No active enrollment for this term');
    }

    const classArm = await academicRepository.findClassArmById(tenantId, enrollment.classArmId);
    const level = classArm
      ? await academicRepository.findClassLevelById(tenantId, classArm.classLevelId)
      : null;
    const classArmLabel = classArm && level ? `${level.code} ${classArm.name}` : null;

    const published = await academicRepository.findPublishedResult(tenantId, termId, studentId);
    if (!published) {
      return {
        termId,
        termName: term.name,
        classArmLabel,
        published: false,
        publishedAt: null,
        averageScore: null,
        subjects: [],
      };
    }

    const entries = await academicRepository.listGradebookEntriesForStudent(
      tenantId,
      termId,
      studentId,
    );
    const visibleEntries = entries.filter((entry) =>
      ['submitted', 'corrected'].includes(entry.status),
    );

    return {
      termId,
      termName: term.name,
      classArmLabel,
      published: true,
      publishedAt: published.publishedAt.toISOString(),
      averageScore: published.averageScore,
      subjects: visibleEntries.map((entry) => ({
        subjectId: entry.subjectId,
        continuousAssessmentScore: entry.continuousAssessmentScore,
        examScore: entry.examScore,
        totalScore: entry.totalScore,
        grade: entry.grade,
        remark: entry.remark,
      })),
    };
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
