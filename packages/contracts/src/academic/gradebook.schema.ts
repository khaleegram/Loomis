import { z } from 'zod';

/** Grading schemes & gradebook contracts (SRS §4.5; CON-004/005; US-ACA-001..004). */

export const gradeBand = z.object({
  minScore: z.number().int().min(0).max(100),
  maxScore: z.number().int().min(0).max(100),
  grade: z.string().min(1).max(10),
  remark: z.string().min(1).max(120).nullable().default(null),
});
export type GradeBand = z.infer<typeof gradeBand>;

export const createGradingSchemeRequest = z
  .object({
    name: z.string().min(1).max(100),
    continuousAssessmentWeight: z.number().int().min(0).max(100),
    examWeight: z.number().int().min(0).max(100),
    passMark: z.number().int().min(0).max(100).default(40),
    gradeBands: z.array(gradeBand).min(1).max(20),
    isDefault: z.boolean().default(false),
  })
  .refine((v) => v.continuousAssessmentWeight + v.examWeight === 100, {
    message: 'Scheme weights must sum to 100',
    path: ['examWeight'],
  })
  .refine((v) => v.gradeBands.every((band) => band.maxScore >= band.minScore), {
    message: 'Each grade band maxScore must be >= minScore',
    path: ['gradeBands'],
  });
export type CreateGradingSchemeRequest = z.infer<typeof createGradingSchemeRequest>;

export const gradingSchemeResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  continuousAssessmentWeight: z.number().int(),
  examWeight: z.number().int(),
  passMark: z.number().int(),
  gradeBands: z.array(gradeBand),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GradingSchemeResponse = z.infer<typeof gradingSchemeResponse>;

export const gradingSchemeListResponse = z.object({
  schemes: z.array(gradingSchemeResponse),
});
export type GradingSchemeListResponse = z.infer<typeof gradingSchemeListResponse>;

export const examConfigStatus = z.enum(['draft', 'open', 'closed']);
export type ExamConfigStatus = z.infer<typeof examConfigStatus>;

export const createExamConfigRequest = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
  gradingSchemeId: z.string().uuid(),
  title: z.string().min(1).max(120),
});
export type CreateExamConfigRequest = z.infer<typeof createExamConfigRequest>;

export const examConfigResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
  gradingSchemeId: z.string().uuid(),
  title: z.string(),
  status: examConfigStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ExamConfigResponse = z.infer<typeof examConfigResponse>;

export const examConfigListResponse = z.object({
  configs: z.array(examConfigResponse),
});
export type ExamConfigListResponse = z.infer<typeof examConfigListResponse>;

export const gradebookEntryStatus = z.enum([
  'draft',
  'submitted',
  'correction_pending',
  'corrected',
]);
export type GradebookEntryStatus = z.infer<typeof gradebookEntryStatus>;

export const upsertGradebookEntryRequest = z.object({
  examConfigId: z.string().uuid(),
  studentId: z.string().uuid(),
  continuousAssessmentScore: z.number().int().min(0).max(100),
  examScore: z.number().int().min(0).max(100),
});
export type UpsertGradebookEntryRequest = z.infer<typeof upsertGradebookEntryRequest>;

export const listGradebookQuery = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
});
export type ListGradebookQuery = z.infer<typeof listGradebookQuery>;

/** US-ACA-002 — teacher locks subject gradebook before result publish. */
export const lockGradebookRequest = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
});
export type LockGradebookRequest = z.infer<typeof lockGradebookRequest>;

export const lockGradebookResponse = z.object({
  lockedCount: z.number().int().min(0),
  alreadyLockedCount: z.number().int().min(0),
});
export type LockGradebookResponse = z.infer<typeof lockGradebookResponse>;

export const gradebookEntryResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
  studentId: z.string().uuid(),
  examConfigId: z.string().uuid(),
  gradingSchemeId: z.string().uuid(),
  teacherStaffProfileId: z.string().uuid(),
  continuousAssessmentScore: z.number().int(),
  examScore: z.number().int(),
  totalScore: z.number().int(),
  grade: z.string(),
  remark: z.string().nullable(),
  status: gradebookEntryStatus,
  submittedAt: z.string().datetime().nullable(),
  correctedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GradebookEntryResponse = z.infer<typeof gradebookEntryResponse>;

export const gradebookEntryListResponse = z.object({
  entries: z.array(gradebookEntryResponse),
});
export type GradebookEntryListResponse = z.infer<typeof gradebookEntryListResponse>;

export const requestGradeCorrectionRequest = z.object({
  continuousAssessmentScore: z.number().int().min(0).max(100),
  examScore: z.number().int().min(0).max(100),
  reason: z.string().min(3).max(500),
});
export type RequestGradeCorrectionRequest = z.infer<typeof requestGradeCorrectionRequest>;

export const gradeCorrectionStatus = z.enum(['pending', 'approved', 'rejected', 'returned']);
export type GradeCorrectionStatus = z.infer<typeof gradeCorrectionStatus>;

export const gradeCorrectionResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  gradebookEntryId: z.string().uuid(),
  workflowInstanceId: z.string().uuid(),
  previousContinuousAssessmentScore: z.number().int(),
  previousExamScore: z.number().int(),
  previousTotalScore: z.number().int(),
  previousGrade: z.string(),
  newContinuousAssessmentScore: z.number().int(),
  newExamScore: z.number().int(),
  newTotalScore: z.number().int(),
  newGrade: z.string(),
  reason: z.string(),
  status: gradeCorrectionStatus,
  requestedById: z.string().uuid(),
  approvedById: z.string().uuid().nullable(),
  decidedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GradeCorrectionResponse = z.infer<typeof gradeCorrectionResponse>;

export const publishResultsRequest = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
});
export type PublishResultsRequest = z.infer<typeof publishResultsRequest>;

export const resultResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  studentId: z.string().uuid(),
  averageScore: z.number().int(),
  status: z.enum(['published', 'withdrawn']),
  publishedById: z.string().uuid(),
  publishedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ResultResponse = z.infer<typeof resultResponse>;

export const resultListResponse = z.object({
  results: z.array(resultResponse),
});
export type ResultListResponse = z.infer<typeof resultListResponse>;

/** Subject line on a published report card (US-PAR-003 / US-STU-001). */
export const publishedSubjectResultResponse = z.object({
  subjectId: z.string().uuid(),
  continuousAssessmentScore: z.number().int(),
  examScore: z.number().int(),
  totalScore: z.number().int(),
  grade: z.string(),
  remark: z.string().nullable(),
});
export type PublishedSubjectResultResponse = z.infer<typeof publishedSubjectResultResponse>;

export const childPublishedResultsResponse = z.object({
  termId: z.string().uuid(),
  termName: z.string().nullable(),
  classArmLabel: z.string().nullable(),
  published: z.boolean(),
  publishedAt: z.string().datetime().nullable(),
  averageScore: z.number().int().nullable(),
  subjects: z.array(publishedSubjectResultResponse),
});
export type ChildPublishedResultsResponse = z.infer<typeof childPublishedResultsResponse>;

export const myResultsQuery = z.object({
  termId: z.string().uuid(),
});
export type MyResultsQuery = z.infer<typeof myResultsQuery>;

/** Deputy Exam Officer activation status (FR-ACA-008 / loomis-roles 72h rule). */
export const examOpsStatusResponse = z.object({
  deputyExamEnabled: z.boolean(),
  deputyActivated: z.boolean(),
  hasExamOfficer: z.boolean(),
  hasDeputyExamOfficer: z.boolean(),
  examOfficerLastActiveAt: z.string().datetime().nullable(),
  hoursUntilDeputyActivation: z.number().int().min(0),
  emergencyEscalationActive: z.boolean(),
  hoursUntilEmergencyEscalation: z.number().int().min(0),
});
export type ExamOpsStatusResponse = z.infer<typeof examOpsStatusResponse>;
