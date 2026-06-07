import { z } from 'zod';

export const parentChildCardResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  schoolName: z.string(),
  studentFirstName: z.string(),
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
