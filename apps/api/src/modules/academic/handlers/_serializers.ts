import type {
  AcademicTermResponse,
  AcademicTermStatus,
  AcademicYearResponse,
  AcademicYearStatus,
  CensusLockResponse,
  ClassArmResponse,
  ClassLevelResponse,
  ExamConfigResponse,
  ExamConfigStatus,
  GradebookEntryResponse,
  GradebookEntryStatus,
  GradeCorrectionResponse,
  GradeCorrectionStatus,
  GradingSchemeResponse,
  PromotionOutcome,
  PromotionRecordResponse,
  ProgressionResponse,
  ResultResponse,
} from '@loomis/contracts';
import type {
  academicTerms,
  academicYears,
  classArms,
  classLevels,
  classProgressionMap,
  examConfigs,
  gradebookEntries,
  gradeCorrectionLogs,
  gradingSchemes,
  results,
  studentPromotionRecords,
} from '../../../../drizzle/schema/academic.js';

type AcademicYearRow = typeof academicYears.$inferSelect;
type AcademicTermRow = typeof academicTerms.$inferSelect;
type ClassLevelRow = typeof classLevels.$inferSelect;
type ClassArmRow = typeof classArms.$inferSelect;
type ProgressionRow = typeof classProgressionMap.$inferSelect;
type PromotionRow = typeof studentPromotionRecords.$inferSelect;
type GradingSchemeRow = typeof gradingSchemes.$inferSelect;
type ExamConfigRow = typeof examConfigs.$inferSelect;
type GradebookEntryRow = typeof gradebookEntries.$inferSelect;
type GradeCorrectionRow = typeof gradeCorrectionLogs.$inferSelect;
type ResultRow = typeof results.$inferSelect;

export function academicYearToResponse(row: AcademicYearRow): AcademicYearResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    label: row.label,
    startDate: row.startDate,
    endDate: row.endDate,
    termCount: row.termCount,
    status: row.status as AcademicYearStatus,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function academicTermToResponse(row: AcademicTermRow): AcademicTermResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    academicYearId: row.academicYearId,
    name: row.name,
    sequence: row.sequence,
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    enrollmentWindowOpenDate: row.enrollmentWindowOpenDate ?? null,
    enrollmentWindowCloseDate: row.enrollmentWindowCloseDate ?? null,
    censusLockDate: row.censusLockDate ?? null,
    examStartDate: row.examStartDate ?? null,
    examEndDate: row.examEndDate ?? null,
    status: row.status as AcademicTermStatus,
    declaredBillableCount: row.declaredBillableCount ?? null,
    systemBillableCount: row.systemBillableCount ?? null,
    openedAt: row.openedAt?.toISOString() ?? null,
    censusLockedAt: row.censusLockedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function censusLockToResponse(result: {
  term: AcademicTermRow;
  psfRateMinor: number;
  systemBillableCount: number | null;
}): CensusLockResponse {
  return {
    termId: result.term.id,
    academicYearId: result.term.academicYearId,
    status: result.term.status as AcademicTermStatus,
    declaredBillableCount: result.term.declaredBillableCount ?? 0,
    systemBillableCount: result.systemBillableCount,
    psfRateMinor: result.psfRateMinor,
    censusLockedAt: result.term.censusLockedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function classLevelToResponse(row: ClassLevelRow): ClassLevelResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    name: row.name,
    rank: row.rank,
    isTerminal: row.isTerminal,
    createdAt: row.createdAt.toISOString(),
  };
}

export function classArmToResponse(row: ClassArmRow): ClassArmResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    academicYearId: row.academicYearId,
    classLevelId: row.classLevelId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export function progressionToResponse(row: ProgressionRow): ProgressionResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    fromClassLevelId: row.fromClassLevelId,
    toClassLevelId: row.toClassLevelId ?? null,
    isTerminal: row.isTerminal,
    createdAt: row.createdAt.toISOString(),
  };
}

export function promotionRecordToResponse(row: PromotionRow): PromotionRecordResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    studentId: row.studentId,
    fromAcademicYearId: row.fromAcademicYearId,
    toAcademicYearId: row.toAcademicYearId,
    fromClassLevelId: row.fromClassLevelId ?? null,
    fromClassArmId: row.fromClassArmId ?? null,
    toClassLevelId: row.toClassLevelId ?? null,
    toClassArmId: row.toClassArmId ?? null,
    outcome: row.outcome as PromotionOutcome,
    heldBackReason: row.heldBackReason ?? null,
    status: row.status as 'proposed' | 'confirmed',
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function gradingSchemeToResponse(row: GradingSchemeRow): GradingSchemeResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    continuousAssessmentWeight: row.continuousAssessmentWeight,
    examWeight: row.examWeight,
    passMark: row.passMark,
    gradeBands: row.gradeBands,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function examConfigToResponse(row: ExamConfigRow): ExamConfigResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    termId: row.termId,
    classArmId: row.classArmId,
    subjectId: row.subjectId,
    gradingSchemeId: row.gradingSchemeId,
    title: row.title,
    status: row.status as ExamConfigStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function gradebookEntryToResponse(row: GradebookEntryRow): GradebookEntryResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    termId: row.termId,
    classArmId: row.classArmId,
    subjectId: row.subjectId,
    studentId: row.studentId,
    examConfigId: row.examConfigId,
    gradingSchemeId: row.gradingSchemeId,
    teacherStaffProfileId: row.teacherStaffProfileId,
    continuousAssessmentScore: row.continuousAssessmentScore,
    examScore: row.examScore,
    totalScore: row.totalScore,
    grade: row.grade,
    remark: row.remark ?? null,
    status: row.status as GradebookEntryStatus,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    correctedAt: row.correctedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function gradeCorrectionToResponse(row: GradeCorrectionRow): GradeCorrectionResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    gradebookEntryId: row.gradebookEntryId,
    workflowInstanceId: row.workflowInstanceId,
    previousContinuousAssessmentScore: row.previousContinuousAssessmentScore,
    previousExamScore: row.previousExamScore,
    previousTotalScore: row.previousTotalScore,
    previousGrade: row.previousGrade,
    newContinuousAssessmentScore: row.newContinuousAssessmentScore,
    newExamScore: row.newExamScore,
    newTotalScore: row.newTotalScore,
    newGrade: row.newGrade,
    reason: row.reason,
    status: row.status as GradeCorrectionStatus,
    requestedById: row.requestedById,
    approvedById: row.approvedById ?? null,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function resultToResponse(row: ResultRow): ResultResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    termId: row.termId,
    classArmId: row.classArmId,
    studentId: row.studentId,
    averageScore: row.averageScore,
    status: row.status as ResultResponse['status'],
    publishedById: row.publishedById,
    publishedAt: row.publishedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
