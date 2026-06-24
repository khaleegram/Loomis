import { z } from 'zod';

export const parentChildCardResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  schoolName: z.string(),
  studentFirstName: z.string(),
  studentLastName: z.string().optional(),
  studentDisplayName: z.string().optional(),
  classArmLabel: z.string().nullable(),
  attendanceSummary: z.object({
    presentCount: z.number().int(),
    totalCount: z.number().int(),
    lastStatus: z.string().nullable(),
  }),
  latestResultSummary: z
    .object({
      termId: z.string().uuid().nullable(),
      averageScore: z.number().nullable(),
    })
    .nullable(),
  outstandingBalanceMinor: z.number().int(),
  unreadMessageCount: z.number().int(),
  linkStatus: z.string(),
  lastRefreshedAt: z.string().datetime(),
});
export type ParentChildCardResponse = z.infer<typeof parentChildCardResponse>;

export const parentDashboardResponse = z.object({
  cards: z.array(parentChildCardResponse),
});
export type ParentDashboardResponse = z.infer<typeof parentDashboardResponse>;

export const regionalTenantAnalyticsResponse = z.object({
  tenantId: z.string().uuid(),
  tenantName: z.string().optional(),
  region: z.string(),
  snapshotDate: z.string(),
  totalStudents: z.number().int(),
  activeEnrollments: z.number().int(),
  attendanceRateMilli: z.number().int(),
  feeCollectionRateMilli: z.number().int(),
  feeCollectedMinor: z.number().int(),
  psfCollectedMinor: z.number().int(),
});
export type RegionalTenantAnalyticsResponse = z.infer<typeof regionalTenantAnalyticsResponse>;

// ── Platform revenue dashboard (US-PLT-001 / US-REV-001..006) ──────────────────

export const platformRevenueSummaryResponse = z.object({
  billedMinor: z.number().int(),
  settledMinor: z.number().int(),
  outstandingMinor: z.number().int(),
  activeTenants: z.number().int(),
  billedChangePct: z.number().nullable(),
  settledChangePct: z.number().nullable(),
  asOf: z.string().datetime(),
});
export type PlatformRevenueSummaryResponse = z.infer<typeof platformRevenueSummaryResponse>;

export const platformRevenueDataPointResponse = z.object({
  month: z.string(),
  billedMinor: z.number().int(),
  settledMinor: z.number().int(),
});
export type PlatformRevenueDataPointResponse = z.infer<typeof platformRevenueDataPointResponse>;

export const platformRevenueChartResponse = z.object({
  period: z.string(),
  points: z.array(platformRevenueDataPointResponse),
});
export type PlatformRevenueChartResponse = z.infer<typeof platformRevenueChartResponse>;

export const ivpCasesListResponse = z.object({
  cases: z.array(
    z.object({
      id: z.string().uuid(),
      tenantId: z.string().uuid(),
      tenantName: z.string(),
      priority: z.enum(['watchlist', 'standard', 'urgent']),
      caseStatus: z.enum([
        'OPEN',
        'INVESTIGATING',
        'RESOLVED_EXPLAINED',
        'RESOLVED_CORRECTED',
        'RESOLVED_ENFORCED',
        'DISMISSED',
      ]),
      anomalyScore: z.number(),
      reportedEnrollment: z.number().int(),
      detectedAt: z.string().datetime(),
      assignedToId: z.string().uuid().nullable(),
    }),
  ),
  total: z.number().int(),
  openCount: z.number().int(),
  investigatingCount: z.number().int(),
  resolvedCount: z.number().int(),
});
export type IvpCasesListResponse = z.infer<typeof ivpCasesListResponse>;

export const referralParticipantSummaryResponse = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  participantType: z.enum(['regional_manager', 'regional_subordinate']),
  region: z.string().nullable(),
  status: z.enum(['pending_kyc', 'active', 'deactivated']),
  kycStatus: z.enum(['pending', 'approved', 'rejected']).nullable(),
  schoolsAttributed: z.number().int(),
  totalEarnedMinor: z.number().int(),
  totalPaidMinor: z.number().int(),
  eligibleMinor: z.number().int(),
  createdAt: z.string().datetime(),
});
export type ReferralParticipantSummaryResponse = z.infer<
  typeof referralParticipantSummaryResponse
>;

export const referralParticipantsListResponse = z.object({
  participants: z.array(referralParticipantSummaryResponse),
  total: z.number().int(),
});
export type ReferralParticipantsListResponse = z.infer<typeof referralParticipantsListResponse>;

export const regionalAnalyticsDashboardResponse = z.object({
  region: z.string().nullable(),
  snapshotDate: z.string(),
  tenants: z.array(regionalTenantAnalyticsResponse),
  totals: z.object({
    totalStudents: z.number().int(),
    activeEnrollments: z.number().int(),
    feeCollectedMinor: z.number().int(),
  }),
});
export type RegionalAnalyticsDashboardResponse = z.infer<
  typeof regionalAnalyticsDashboardResponse
>;
