import { z } from 'zod';

export const ivpSignalType = z.enum([
  'attendance_anomaly',
  'gradebook_anomaly',
  'payment_volume',
  'device_count',
  'parent_link',
]);
export type IvpSignalType = z.infer<typeof ivpSignalType>;

export const ivpCaseStatus = z.enum([
  'OPEN',
  'INVESTIGATING',
  'RESOLVED_EXPLAINED',
  'RESOLVED_CORRECTED',
  'RESOLVED_ENFORCED',
  'DISMISSED',
]);
export type IvpCaseStatus = z.infer<typeof ivpCaseStatus>;

export const ivpCasePriority = z.enum(['watchlist', 'standard', 'urgent']);
export type IvpCasePriority = z.infer<typeof ivpCasePriority>;

export const privilegedChangeType = z.enum([
  'psf_rate_override',
  'psf_waiver',
  'ledger_adjustment',
  'tenant_suspension_override',
  'referral_rule_change',
  'support_impersonation',
  'data_export',
]);
export type PrivilegedChangeType = z.infer<typeof privilegedChangeType>;

export const privilegedChangeStatus = z.enum([
  'requested',
  'approved',
  'rejected',
  'executed',
  'expired',
]);
export type PrivilegedChangeStatus = z.infer<typeof privilegedChangeStatus>;

export const breakGlassSessionStatus = z.enum(['active', 'expired', 'revoked']);
export type BreakGlassSessionStatus = z.infer<typeof breakGlassSessionStatus>;

export const RISK_EVENT_TYPES = {
  signalDetected: 'risk.signal.detected',
  ivpCaseOpened: 'risk.ivp_case.opened',
  ivpCaseClosed: 'risk.ivp_case.closed',
  breakGlassActivated: 'risk.break_glass.activated',
  privilegedChangeApproved: 'risk.privileged_change.approved',
} as const;

export const ivpAnomalyCaseResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  termId: z.string().uuid(),
  detectedAt: z.string().datetime(),
  reportedEnrollment: z.number().int().nonnegative(),
  estimatedRange: z.object({ min: z.number().int(), max: z.number().int() }),
  anomalyScore: z.number(),
  priority: ivpCasePriority,
  caseStatus: ivpCaseStatus,
  signalsAnalyzed: z.record(z.unknown()),
  assignedToId: z.string().uuid().nullable(),
  resolutionNotes: z.string().nullable(),
  resolvedById: z.string().uuid().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  referralEarningsHeld: z.boolean(),
  createdAt: z.string().datetime(),
});
export type IvpAnomalyCaseResponse = z.infer<typeof ivpAnomalyCaseResponse>;

export const updateIvpCaseRequest = z.object({
  caseStatus: ivpCaseStatus.optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  resolutionNotes: z.string().max(2000).optional(),
});
export type UpdateIvpCaseRequest = z.infer<typeof updateIvpCaseRequest>;

export const requestIvpRecountRequest = z.object({
  reason: z.string().min(10).max(500),
});
export type RequestIvpRecountRequest = z.infer<typeof requestIvpRecountRequest>;

export const createPrivilegedChangeRequest = z.object({
  changeType: privilegedChangeType,
  targetTenantId: z.string().uuid().nullable().optional(),
  beforeJson: z.record(z.unknown()),
  afterJson: z.record(z.unknown()),
  reason: z.string().min(10).max(2000),
  riskScore: z.number().int().min(0).max(100),
});
export type CreatePrivilegedChangeRequest = z.infer<typeof createPrivilegedChangeRequest>;

export const decidePrivilegedChangeRequest = z.object({
  decision: z.enum(['approve', 'reject']),
  notes: z.string().max(500).optional(),
});
export type DecidePrivilegedChangeRequest = z.infer<typeof decidePrivilegedChangeRequest>;

export const privilegedChangeResponse = z.object({
  id: z.string().uuid(),
  changeType: privilegedChangeType,
  targetTenantId: z.string().uuid().nullable(),
  requestedByUserId: z.string().uuid(),
  approvedByUserId: z.string().uuid().nullable(),
  status: privilegedChangeStatus,
  beforeJson: z.record(z.unknown()),
  afterJson: z.record(z.unknown()),
  reason: z.string(),
  riskScore: z.number().int(),
  createdAt: z.string().datetime(),
  approvedAt: z.string().datetime().nullable(),
  executedAt: z.string().datetime().nullable(),
});
export type PrivilegedChangeResponse = z.infer<typeof privilegedChangeResponse>;

export const startBreakGlassRequest = z.object({
  tenantId: z.string().uuid(),
  supportTicketId: z.string().min(3).max(64),
});
export type StartBreakGlassRequest = z.infer<typeof startBreakGlassRequest>;

export const breakGlassSessionResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  supportUserId: z.string().uuid(),
  supportTicketId: z.string(),
  status: breakGlassSessionStatus,
  activatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  ownerNotifiedAt: z.string().datetime().nullable(),
});
export type BreakGlassSessionResponse = z.infer<typeof breakGlassSessionResponse>;
