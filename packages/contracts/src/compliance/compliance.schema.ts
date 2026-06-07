import { z } from 'zod';

export const retentionDataCategory = z.enum([
  'student_records',
  'financial_records',
  'audit_logs',
  'parent_pii',
  'staff_pii',
  'admission_records',
]);
export type RetentionDataCategory = z.infer<typeof retentionDataCategory>;

export const dsarStatus = z.enum(['received', 'in_progress', 'responded', 'rejected']);
export type DsarStatus = z.infer<typeof dsarStatus>;

export const dsarRequesterType = z.enum(['parent', 'student', 'staff', 'other']);
export type DsarRequesterType = z.infer<typeof dsarRequesterType>;

export const breachStatus = z.enum([
  'suspected',
  'confirmed',
  'contained',
  'ndpc_notified',
  'closed',
]);
export type BreachStatus = z.infer<typeof breachStatus>;

export const retentionEventAction = z.enum(['anonymised', 'hard_deleted']);
export type RetentionEventAction = z.infer<typeof retentionEventAction>;

export const COMPLIANCE_EVENT_TYPES = {
  dsarCreated: 'compliance.dsar.created',
  dsarFulfilled: 'compliance.dsar.fulfilled',
  dsarEscalated: 'compliance.dsar.escalated',
  breachCreated: 'compliance.breach.created',
  breachAcknowledged: 'compliance.breach.acknowledged',
  breachNotified: 'compliance.breach.notified',
  breachEscalated: 'compliance.breach.escalated',
  retentionProcessed: 'compliance.retention.processed',
  consentPublished: 'compliance.consent.published',
} as const;

export const createDsarRequest = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  requesterType: dsarRequesterType,
  requesterUserId: z.string().uuid().nullable().optional(),
  subjectUserId: z.string().uuid().nullable().optional(),
  subjectIdentifiers: z.record(z.string()).default({}),
  dataCategories: z.array(z.string()).min(1),
  notes: z.string().max(2000).optional(),
});
export type CreateDsarRequest = z.infer<typeof createDsarRequest>;

export const updateDsarRequest = z.object({
  status: dsarStatus.optional(),
  redactionNotes: z.string().max(5000).optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateDsarRequest = z.infer<typeof updateDsarRequest>;

export const respondDsarRequest = z.object({
  redactionNotes: z.string().max(5000).optional(),
});
export type RespondDsarRequest = z.infer<typeof respondDsarRequest>;

export const dsarResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  requesterType: dsarRequesterType,
  requesterUserId: z.string().uuid().nullable(),
  subjectUserId: z.string().uuid().nullable(),
  subjectIdentifiers: z.record(z.string()),
  dataCategories: z.array(z.string()),
  status: dsarStatus,
  receivedAt: z.string().datetime(),
  responseDeadlineAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
  respondedById: z.string().uuid().nullable(),
  hasDataPackage: z.boolean(),
  redactionNotes: z.string().nullable(),
  escalationDay21SentAt: z.string().datetime().nullable(),
  escalationDay28SentAt: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  daysRemaining: z.number().int(),
  createdAt: z.string().datetime(),
});
export type DsarResponse = z.infer<typeof dsarResponse>;

export const createBreachRecordRequest = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  discoveredAt: z.string().datetime(),
  breachType: z.string().min(3).max(60),
  affectedDataCategories: z.array(z.string()).min(1),
  estimatedSubjectCount: z.number().int().nonnegative(),
  likelyCause: z.string().min(10).max(5000),
  containmentMeasures: z.string().min(10).max(5000),
});
export type CreateBreachRecordRequest = z.infer<typeof createBreachRecordRequest>;

export const updateBreachRecordRequest = z.object({
  status: breachStatus.optional(),
  ndpcNotificationRequired: z.boolean().optional(),
  ndpcNotificationOutcome: z.string().max(5000).optional(),
  assignedDpoId: z.string().uuid().nullable().optional(),
});
export type UpdateBreachRecordRequest = z.infer<typeof updateBreachRecordRequest>;

export const acknowledgeBreachRequest = z.object({
  ndpcNotificationRequired: z.boolean(),
});
export type AcknowledgeBreachRequest = z.infer<typeof acknowledgeBreachRequest>;

export const recordNdpcNotificationRequest = z.object({
  outcome: z.string().min(3).max(5000),
});
export type RecordNdpcNotificationRequest = z.infer<typeof recordNdpcNotificationRequest>;

export const ndpcNotificationDraft = z.object({
  incidentSummary: z.string(),
  affectedDataCategories: z.array(z.string()),
  estimatedSubjectCount: z.number().int(),
  containmentMeasures: z.string(),
  discoveryDate: z.string().datetime(),
  breachType: z.string(),
  notificationDeadline: z.string().datetime().nullable(),
});
export type NdpcNotificationDraft = z.infer<typeof ndpcNotificationDraft>;

export const breachRecordResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  discoveredAt: z.string().datetime(),
  acknowledgedAt: z.string().datetime().nullable(),
  acknowledgedById: z.string().uuid().nullable(),
  ndpcNotificationRequired: z.boolean().nullable(),
  ndpcNotifiedAt: z.string().datetime().nullable(),
  ndpcNotificationOutcome: z.string().nullable(),
  ndpcDeadlineAt: z.string().datetime().nullable(),
  ndpcHoursRemaining: z.number().nullable(),
  breachType: z.string(),
  affectedDataCategories: z.array(z.string()),
  estimatedSubjectCount: z.number().int(),
  likelyCause: z.string(),
  containmentMeasures: z.string(),
  status: breachStatus,
  assignedDpoId: z.string().uuid().nullable(),
  escalation48hSentAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type BreachRecordResponse = z.infer<typeof breachRecordResponse>;

export const createConsentVersionRequest = z.object({
  versionLabel: z.string().min(3).max(40),
  privacyPolicyHash: z.string().min(32).max(128),
  contentSummary: z.string().min(10).max(5000),
  effectiveFrom: z.string().datetime(),
});
export type CreateConsentVersionRequest = z.infer<typeof createConsentVersionRequest>;

export const consentVersionResponse = z.object({
  id: z.string().uuid(),
  versionLabel: z.string(),
  privacyPolicyHash: z.string(),
  contentSummary: z.string(),
  effectiveFrom: z.string().datetime(),
  publishedById: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});
export type ConsentVersionResponse = z.infer<typeof consentVersionResponse>;

export const updateRetentionScheduleRequest = z.object({
  retentionDays: z.number().int().positive().max(36500),
  anonymiseOnly: z.boolean().optional(),
  description: z.string().min(10).max(2000).optional(),
});
export type UpdateRetentionScheduleRequest = z.infer<typeof updateRetentionScheduleRequest>;

export const retentionScheduleResponse = z.object({
  id: z.string().uuid(),
  dataCategory: retentionDataCategory,
  retentionDays: z.number().int(),
  anonymiseOnly: z.boolean(),
  description: z.string(),
  updatedById: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RetentionScheduleResponse = z.infer<typeof retentionScheduleResponse>;

export const complianceDashboardResponse = z.object({
  activeDsarCount: z.number().int(),
  overdueDsarCount: z.number().int(),
  openBreachCount: z.number().int(),
  pendingNdpcNotificationCount: z.number().int(),
  activeConsentVersion: consentVersionResponse.nullable(),
  retentionSchedules: z.array(retentionScheduleResponse),
  recentRetentionEvents: z.number().int(),
});
export type ComplianceDashboardResponse = z.infer<typeof complianceDashboardResponse>;
