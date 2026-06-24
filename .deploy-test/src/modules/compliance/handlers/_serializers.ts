import type {
  BreachRecordResponse,
  ComplianceDashboardResponse,
  ConsentVersionResponse,
  DsarResponse,
  NdpcNotificationDraft,
  RetentionScheduleResponse,
} from '@loomis/contracts';

type DsarRow = {
  id: string;
  tenantId: string | null;
  requesterType: string;
  requesterUserId: string | null;
  subjectUserId: string | null;
  subjectIdentifiers: Record<string, string>;
  dataCategories: string[];
  status: string;
  receivedAt: Date;
  responseDeadlineAt: Date;
  respondedAt: Date | null;
  respondedById: string | null;
  dataPackageJson: Record<string, unknown> | null;
  redactionNotes: string | null;
  escalationDay21SentAt: Date | null;
  escalationDay28SentAt: Date | null;
  notes: string | null;
  createdAt: Date;
};

type BreachRow = {
  id: string;
  tenantId: string | null;
  discoveredAt: Date;
  acknowledgedAt: Date | null;
  acknowledgedById: string | null;
  ndpcNotificationRequired: boolean | null;
  ndpcNotifiedAt: Date | null;
  ndpcNotificationOutcome: string | null;
  ndpcDeadlineAt: Date | null;
  breachType: string;
  affectedDataCategories: string[];
  estimatedSubjectCount: number;
  likelyCause: string;
  containmentMeasures: string;
  status: string;
  assignedDpoId: string | null;
  escalation48hSentAt: Date | null;
  createdAt: Date;
};

export function dsarToResponse(row: DsarRow): DsarResponse {
  const now = Date.now();
  const daysRemaining = Math.max(
    0,
    Math.ceil((row.responseDeadlineAt.getTime() - now) / (1000 * 60 * 60 * 24)),
  );

  return {
    id: row.id,
    tenantId: row.tenantId,
    requesterType: row.requesterType as DsarResponse['requesterType'],
    requesterUserId: row.requesterUserId,
    subjectUserId: row.subjectUserId,
    subjectIdentifiers: row.subjectIdentifiers,
    dataCategories: row.dataCategories,
    status: row.status as DsarResponse['status'],
    receivedAt: row.receivedAt.toISOString(),
    responseDeadlineAt: row.responseDeadlineAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    respondedById: row.respondedById,
    hasDataPackage: Boolean(row.dataPackageJson),
    redactionNotes: row.redactionNotes,
    escalationDay21SentAt: row.escalationDay21SentAt?.toISOString() ?? null,
    escalationDay28SentAt: row.escalationDay28SentAt?.toISOString() ?? null,
    notes: row.notes,
    daysRemaining,
    createdAt: row.createdAt.toISOString(),
  };
}

export function breachToResponse(row: BreachRow): BreachRecordResponse {
  const ndpcHoursRemaining =
    row.ndpcDeadlineAt && !row.ndpcNotifiedAt
      ? Math.max(
          0,
          (row.ndpcDeadlineAt.getTime() - Date.now()) / (1000 * 60 * 60),
        )
      : null;

  return {
    id: row.id,
    tenantId: row.tenantId,
    discoveredAt: row.discoveredAt.toISOString(),
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    acknowledgedById: row.acknowledgedById,
    ndpcNotificationRequired: row.ndpcNotificationRequired,
    ndpcNotifiedAt: row.ndpcNotifiedAt?.toISOString() ?? null,
    ndpcNotificationOutcome: row.ndpcNotificationOutcome,
    ndpcDeadlineAt: row.ndpcDeadlineAt?.toISOString() ?? null,
    ndpcHoursRemaining,
    breachType: row.breachType,
    affectedDataCategories: row.affectedDataCategories,
    estimatedSubjectCount: row.estimatedSubjectCount,
    likelyCause: row.likelyCause,
    containmentMeasures: row.containmentMeasures,
    status: row.status as BreachRecordResponse['status'],
    assignedDpoId: row.assignedDpoId,
    escalation48hSentAt: row.escalation48hSentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function consentToResponse(row: {
  id: string;
  versionLabel: string;
  privacyPolicyHash: string;
  contentSummary: string;
  effectiveFrom: Date;
  publishedById: string;
  isActive: boolean;
  createdAt: Date;
}): ConsentVersionResponse {
  return {
    id: row.id,
    versionLabel: row.versionLabel,
    privacyPolicyHash: row.privacyPolicyHash,
    contentSummary: row.contentSummary,
    effectiveFrom: row.effectiveFrom.toISOString(),
    publishedById: row.publishedById,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export function retentionScheduleToResponse(row: {
  id: string;
  dataCategory: string;
  retentionDays: number;
  anonymiseOnly: boolean;
  description: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RetentionScheduleResponse {
  return {
    id: row.id,
    dataCategory: row.dataCategory as RetentionScheduleResponse['dataCategory'],
    retentionDays: row.retentionDays,
    anonymiseOnly: row.anonymiseOnly,
    description: row.description,
    updatedById: row.updatedById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function dashboardToResponse(input: {
  activeDsarCount: number;
  overdueDsarCount: number;
  openBreachCount: number;
  pendingNdpcNotificationCount: number;
  activeConsentVersion: Parameters<typeof consentToResponse>[0] | null;
  retentionSchedules: Parameters<typeof retentionScheduleToResponse>[0][];
  recentRetentionEvents: number;
}): ComplianceDashboardResponse {
  return {
    activeDsarCount: input.activeDsarCount,
    overdueDsarCount: input.overdueDsarCount,
    openBreachCount: input.openBreachCount,
    pendingNdpcNotificationCount: input.pendingNdpcNotificationCount,
    activeConsentVersion: input.activeConsentVersion
      ? consentToResponse(input.activeConsentVersion)
      : null,
    retentionSchedules: input.retentionSchedules.map(retentionScheduleToResponse),
    recentRetentionEvents: input.recentRetentionEvents,
  };
}

export function ndpcDraftToResponse(draft: Record<string, unknown>): NdpcNotificationDraft {
  return {
    incidentSummary: String(draft.incidentSummary ?? ''),
    affectedDataCategories: (draft.affectedDataCategories as string[]) ?? [],
    estimatedSubjectCount: Number(draft.estimatedSubjectCount ?? 0),
    containmentMeasures: String(draft.containmentMeasures ?? ''),
    discoveryDate: String(draft.discoveryDate ?? new Date().toISOString()),
    breachType: String(draft.breachType ?? ''),
    notificationDeadline:
      draft.notificationDeadline != null ? String(draft.notificationDeadline) : null,
  };
}
