/**
 * Typed TanStack Query key factory (Frontend Architecture §5.1).
 * Tenant-scoped keys always place `tenantId` as the second element (§5.2).
 */

export type StudentListFilters = {
  status?: string;
  classArmId?: string;
};

export type AdmissionListFilters = {
  status?: string;
  search?: string;
};

export type GradebookListFilters = {
  termId: string;
  classArmId: string;
  subjectId?: string;
};

export type AttendanceListFilters = {
  termId: string;
  classArmId: string;
  attendanceDate?: string;
  studentId?: string;
};

export type AssignmentListFilters = {
  termId: string;
  classArmId: string;
  subjectId?: string;
};

export type PaymentsListFilters = {
  termId?: string;
  studentId?: string;
  status?: string;
  channel?: string;
};

export type RefundsListFilters = {
  termId?: string;
  paymentId?: string;
  status?: string;
};

export type OutstandingBalancesFilters = {
  classLevelId?: string;
  status?: string;
};

import type { AuditSensitivity } from '@loomis/contracts';

export type AuditLogFilters = {
  actorUserId?: string;
  tenantId?: string;
  action?: string;
  sensitivity?: AuditSensitivity;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};

export type DsarListFilters = {
  status?: string;
};

export type BreachListFilters = {
  status?: string;
};

export const queryKeys = {
  identity: {
    /** User-scoped — not tenant-partitioned. */
    sessions: () => ['identity', 'sessions'] as const,
    devices: () => ['identity', 'devices'] as const,
    myProfile: () => ['identity', 'me', 'profile'] as const,
    mfaStatus: () => ['identity', 'mfa', 'status'] as const,
  },
  attestations: {
    list: (tenantId: string) => ['attestations', tenantId, 'list'] as const,
  },
  students: {
    all: (tenantId: string) => ['students', tenantId] as const,
    list: (tenantId: string, filters: StudentListFilters = {}) =>
      ['students', tenantId, 'list', filters] as const,
    detail: (tenantId: string, studentId: string) =>
      ['students', tenantId, 'detail', studentId] as const,
    profile: (tenantId: string, studentId: string) =>
      ['students', tenantId, 'profile', studentId] as const,
    enrollmentRoster: (tenantId: string, termId: string) =>
      ['students', tenantId, 'enrollment-roster', termId] as const,
    termAttendance: (tenantId: string, studentId: string, termId: string) =>
      ['students', tenantId, studentId, 'attendance', termId] as const,
    leavingCertificates: (tenantId: string, academicYearId: string) =>
      ['students', tenantId, 'leaving-certificates', academicYearId] as const,
    certificates: (tenantId: string, studentId: string) =>
      ['students', tenantId, 'certificates', studentId] as const,
  },
  admissions: {
    all: (tenantId: string) => ['admissions', tenantId] as const,
    list: (tenantId: string, filters: AdmissionListFilters = {}) =>
      ['admissions', tenantId, 'list', filters] as const,
    detail: (tenantId: string, admissionId: string) =>
      ['admissions', tenantId, 'detail', admissionId] as const,
  },
  hrm: {
    all: (tenantId: string) => ['hrm', tenantId] as const,
    staffList: (tenantId: string) => ['hrm', tenantId, 'staff', 'list'] as const,
    staffDetail: (tenantId: string, staffProfileId: string) =>
      ['hrm', tenantId, 'staff', 'detail', staffProfileId] as const,
  },
  academic: {
    all: (tenantId: string) => ['academic', tenantId] as const,
    years: (tenantId: string) => ['academic', tenantId, 'years'] as const,
    year: (tenantId: string, yearId: string) =>
      ['academic', tenantId, 'years', yearId] as const,
    terms: (tenantId: string, yearId: string) =>
      ['academic', tenantId, 'years', yearId, 'terms'] as const,
    term: (tenantId: string, termId: string) =>
      ['academic', tenantId, 'terms', termId] as const,
    censusPreview: (tenantId: string, termId: string) =>
      ['academic', tenantId, 'terms', termId, 'census', 'preview'] as const,
    closurePreview: (tenantId: string, termId: string) =>
      ['academic', tenantId, 'terms', termId, 'closure', 'preview'] as const,
    classLevels: (tenantId: string) => ['academic', tenantId, 'class-levels'] as const,
    classStructure: (tenantId: string, yearId: string) =>
      ['academic', tenantId, 'years', yearId, 'class-structure'] as const,
    gradingSchemes: (tenantId: string) =>
      ['academic', tenantId, 'grading-schemes'] as const,
    examConfigs: (tenantId: string, termId: string) =>
      ['academic', tenantId, 'terms', termId, 'exam-configs'] as const,
    examOpsStatus: (tenantId: string) => ['academic', tenantId, 'exam-ops', 'status'] as const,
    gradebookEntries: (tenantId: string, filters: GradebookListFilters) =>
      ['academic', tenantId, 'gradebook', 'entries', filters] as const,
    attendance: (tenantId: string, filters: AttendanceListFilters) =>
      ['academic', tenantId, 'attendance', filters] as const,
    timetable: (tenantId: string, termId: string, classArmId: string) =>
      ['academic', tenantId, 'timetable', termId, classArmId] as const,
    timetableSubjectOptions: (tenantId: string, termId: string, classArmId: string) =>
      ['academic', tenantId, 'timetable', 'subject-options', termId, classArmId] as const,
    timetableSummary: (tenantId: string, termId: string) =>
      ['academic', tenantId, 'timetable', 'summary', termId] as const,
    timetablePublishPreview: (tenantId: string, termId: string) =>
      ['academic', tenantId, 'timetable', 'publish-preview', termId] as const,
    bellSchedule: (tenantId: string, academicYearId: string) =>
      ['academic', tenantId, 'bell-schedule', academicYearId] as const,
    studentTimetable: (tenantId: string, termId: string) =>
      ['academic', tenantId, 'timetable', 'me', termId] as const,
    teachingStaffContext: (tenantId: string, termId: string) =>
      ['academic', tenantId, 'teaching', 'me', termId] as const,
    assignments: (tenantId: string, filters: AssignmentListFilters | string) =>
      ['academic', tenantId, 'assignments', filters] as const,
    myAssignments: (tenantId: string, termId: string) =>
      ['academic', tenantId, 'assignments', 'me', termId] as const,
    assignmentSubmissions: (tenantId: string, assignmentId: string) =>
      ['academic', tenantId, 'assignments', assignmentId, 'submissions'] as const,
    promotions: (tenantId: string, yearId: string) =>
      ['academic', tenantId, 'promotions', yearId] as const,
    progressions: (tenantId: string) => ['academic', tenantId, 'progressions'] as const,
  },
  workflow: {
    all: (tenantId: string) => ['workflow', tenantId] as const,
    inbox: (tenantId: string) => ['workflow', tenantId, 'inbox'] as const,
    mine: (tenantId: string) => ['workflow', tenantId, 'mine'] as const,
    instance: (tenantId: string, instanceId: string) =>
      ['workflow', tenantId, 'instances', instanceId] as const,
  },
  finance: {
    all: (tenantId: string) => ['finance', tenantId] as const,
    feeStructures: (tenantId: string, termId: string) =>
      ['finance', tenantId, 'fee-structures', termId] as const,
    feeStructure: (tenantId: string, feeStructureId: string) =>
      ['finance', tenantId, 'fee-structures', 'detail', feeStructureId] as const,
    invoices: (tenantId: string, termId: string) =>
      ['finance', tenantId, 'invoices', termId] as const,
    invoice: (tenantId: string, invoiceId: string) =>
      ['finance', tenantId, 'invoices', 'detail', invoiceId] as const,
    outstandingBalances: (tenantId: string, termId: string, filters: OutstandingBalancesFilters = {}) =>
      ['finance', tenantId, 'outstanding-balances', termId, filters] as const,
    payments: (tenantId: string, filters: PaymentsListFilters = {}) =>
      ['finance', tenantId, 'payments', filters] as const,
    payment: (tenantId: string, paymentId: string) =>
      ['finance', tenantId, 'payments', 'detail', paymentId] as const,
    refunds: (tenantId: string, filters: RefundsListFilters = {}) =>
      ['finance', tenantId, 'refunds', filters] as const,
    refund: (tenantId: string, refundId: string) =>
      ['finance', tenantId, 'refunds', 'detail', refundId] as const,
    reconciliationExceptions: (tenantId: string) =>
      ['finance', tenantId, 'reconciliation', 'exceptions'] as const,
  },
  tenant: {
    branding: (tenantId: string) => ['tenant', tenantId, 'branding'] as const,
    experience: (tenantId: string) => ['tenant', tenantId, 'experience'] as const,
    auditLog: (tenantId: string, filters: AuditLogFilters = {}) =>
      ['tenant', tenantId, 'audit', 'events', filters] as const,
  },
  /** Platform-level keys — no tenant context (platform actors have null tenant_id). */
  platform: {
    all: () => ['platform'] as const,
    revenueSummary: () => ['platform', 'revenue', 'summary'] as const,
    revenueChart: (period: string) => ['platform', 'revenue', 'chart', period] as const,
    tenants: () => ['platform', 'tenants'] as const,
    tenant: (tenantId: string) => ['platform', 'tenants', tenantId] as const,
    tiers: () => ['platform', 'tiers'] as const,
    psfRates: () => ['platform', 'psf-rates'] as const,
    psfRateHistory: (tenantId: string | null) =>
      ['platform', 'psf-rates', 'history', tenantId] as const,
    riskCases: (filters?: { status?: string; priority?: string }) =>
      ['platform', 'risk', 'cases', filters ?? {}] as const,
    riskCase: (caseId: string) => ['platform', 'risk', 'cases', caseId] as const,
    privilegedChanges: (status?: string) =>
      ['platform', 'privileged-changes', status ?? 'all'] as const,
    privilegedChange: (id: string) => ['platform', 'privileged-changes', id] as const,
    referralParticipants: () => ['platform', 'referrals', 'participants'] as const,
    payoutCycles: () => ['platform', 'referrals', 'payout-cycles'] as const,
    breakGlassSessions: () => ['platform', 'break-glass', 'sessions'] as const,
    auditLog: (filters: AuditLogFilters = {}) => ['platform', 'audit', 'events', filters] as const,
  },
  /** Regional layer — platform actors have null tenant_id. */
  regional: {
    all: () => ['regional'] as const,
    analytics: (region?: string) => ['regional', 'analytics', region ?? 'all'] as const,
    participant: () => ['regional', 'participant', 'me'] as const,
    subordinates: () => ['regional', 'subordinates'] as const,
    referralCode: () => ['regional', 'referral-code', 'me'] as const,
    kyc: () => ['regional', 'kyc', 'me'] as const,
    earnings: () => ['regional', 'earnings'] as const,
    earningsSummary: () => ['regional', 'earnings', 'summary'] as const,
    payoutCycles: () => ['regional', 'payout-cycles'] as const,
  },
  /** DPO compliance — global scope (null tenant_id). */
  compliance: {
    all: () => ['compliance'] as const,
    dashboard: () => ['compliance', 'dashboard'] as const,
    dsars: (filters: DsarListFilters = {}) => ['compliance', 'dsars', filters] as const,
    dsar: (dsarId: string) => ['compliance', 'dsars', dsarId] as const,
    breaches: (filters: BreachListFilters = {}) => ['compliance', 'breaches', filters] as const,
    breach: (breachId: string) => ['compliance', 'breaches', breachId] as const,
    consentVersions: () => ['compliance', 'consent-versions'] as const,
    retentionSchedules: () => ['compliance', 'retention-schedules'] as const,
  },
  /** Comms — tenant-scoped notifications and messaging. */
  comms: {
    all: (tenantId: string) => ['comms', tenantId] as const,
    notifications: (tenantId: string) => ['comms', tenantId, 'notifications'] as const,
    message: (tenantId: string, messageId: string) =>
      ['comms', tenantId, 'message', messageId] as const,
    thread: (tenantId: string, messageId: string) =>
      ['comms', tenantId, 'threads', messageId] as const,
  },
  /** Storage — presigned URL access */
  storage: {
    downloadUrl: (storageObjectId: string) =>
      ['storage', 'download-url', storageObjectId] as const,
  },
  parent: {
    dashboard: () => ['parent', 'dashboard'] as const,
    timetable: (tenantId: string, studentId: string, termId: string) =>
      ['parent', 'timetable', tenantId, studentId, termId] as const,
    attendance: (tenantId: string, studentId: string, termId: string) =>
      ['parent', 'attendance', tenantId, studentId, termId] as const,
    results: (tenantId: string, studentId: string, termId: string) =>
      ['parent', 'results', tenantId, studentId, termId] as const,
    fees: (tenantId: string, studentId: string, termId: string) =>
      ['parent', 'fees', tenantId, studentId, termId] as const,
    payments: (tenantId: string, studentId: string, termId: string) =>
      ['parent', 'payments', tenantId, studentId, termId] as const,
    myResults: (tenantId: string, termId: string) =>
      ['student', 'results', tenantId, termId] as const,
    myAttendance: (tenantId: string, termId: string) =>
      ['student', 'attendance', tenantId, termId] as const,
  },

} as const;

/** Asserts tenant-scoped roots place tenantId at index 1 (security invariant). */
export function assertTenantScopedKey(key: readonly unknown[], tenantId: string): void {
  if (key.length < 2 || key[1] !== tenantId) {
    throw new Error(`Query key must include tenantId "${tenantId}" as element 2`);
  }
}
