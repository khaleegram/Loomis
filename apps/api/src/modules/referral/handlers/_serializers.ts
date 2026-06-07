import type {
  AttributionResponse,
  EarningEntryResponse,
  EarningsSummaryResponse,
  KycRecordResponse,
  ParticipantResponse,
  PayoutCycleResponse,
  ReferralCodeRevealResponse,
  ReferralCodeSummaryResponse,
  ReferralRulesSnapshot,
  TenantPayoutCapCheckResponse,
} from '@loomis/contracts';

type ParticipantRow = {
  id: string;
  userId: string;
  participantType: string;
  managerParticipantId: string | null;
  region: string | null;
  status: string;
  deactivatedAt: Date | null;
  createdAt: Date;
};

type KycRow = {
  id: string;
  participantId: string;
  status: string;
  conflictOfInterestDeclared: boolean;
  conflictDetails: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  submittedAt: Date;
};

type AttributionRow = {
  id: string;
  tenantId: string;
  directParticipantId: string;
  managerParticipantId: string | null;
  onboardingSource: string;
  status: string;
  flagReason: string | null;
  attributedAt: Date;
};

type EarningRow = {
  id: string;
  participantId: string;
  tenantId: string;
  psfObligationId: string;
  payoutCycleId: string | null;
  earningType: string;
  amountMinor: number;
  psfSettledAmountMinor: number;
  rateBasisPoints: number;
  status: string;
  holdReason: string | null;
  createdAt: Date;
};

type PayoutCycleRow = {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  totalPayoutMinor: number;
  rulesSnapshot: Record<string, unknown>;
  tenantCapUsage: Record<
    string,
    { psfCollectedMinor: number; referralPaidMinor: number; capMinor: number }
  >;
  closedAt: Date | null;
  disbursedAt: Date | null;
};

export function participantToResponse(row: ParticipantRow): ParticipantResponse {
  return {
    id: row.id,
    userId: row.userId,
    participantType: row.participantType as ParticipantResponse['participantType'],
    managerParticipantId: row.managerParticipantId,
    region: row.region,
    status: row.status as ParticipantResponse['status'],
    deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function kycToResponse(row: KycRow): KycRecordResponse {
  return {
    id: row.id,
    participantId: row.participantId,
    status: row.status as KycRecordResponse['status'],
    conflictOfInterestDeclared: row.conflictOfInterestDeclared,
    conflictDetails: row.conflictDetails,
    reviewedByUserId: row.reviewedByUserId,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    submittedAt: row.submittedAt.toISOString(),
  };
}

export function codeRevealToResponse(input: {
  codeId: string;
  rawCode: string;
}): ReferralCodeRevealResponse {
  return {
    codeId: input.codeId,
    rawCode: input.rawCode,
    message: 'Store this code securely. It cannot be retrieved again.',
  };
}

export function codeSummaryToResponse(row: {
  id: string;
  status: string;
  activatedAt: string | null;
  canRegenerate: boolean;
}): ReferralCodeSummaryResponse {
  return {
    id: row.id,
    status: row.status as ReferralCodeSummaryResponse['status'],
    activatedAt: row.activatedAt,
    canRegenerate: row.canRegenerate,
  };
}

export function attributionToResponse(row: AttributionRow): AttributionResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    directParticipantId: row.directParticipantId,
    managerParticipantId: row.managerParticipantId,
    onboardingSource: row.onboardingSource as AttributionResponse['onboardingSource'],
    status: row.status as AttributionResponse['status'],
    flagReason: row.flagReason,
    attributedAt: row.attributedAt.toISOString(),
  };
}

export function earningToResponse(row: EarningRow): EarningEntryResponse {
  return {
    id: row.id,
    participantId: row.participantId,
    tenantId: row.tenantId,
    psfObligationId: row.psfObligationId,
    payoutCycleId: row.payoutCycleId,
    earningType: row.earningType as EarningEntryResponse['earningType'],
    amountMinor: row.amountMinor,
    psfSettledAmountMinor: row.psfSettledAmountMinor,
    rateBasisPoints: row.rateBasisPoints,
    status: row.status as EarningEntryResponse['status'],
    holdReason: row.holdReason,
    createdAt: row.createdAt.toISOString(),
  };
}

export function earningsSummaryToResponse(row: EarningsSummaryResponse): EarningsSummaryResponse {
  return row;
}

export function payoutCycleToResponse(row: PayoutCycleRow): PayoutCycleResponse {
  return {
    id: row.id,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    status: row.status as PayoutCycleResponse['status'],
    totalPayoutMinor: row.totalPayoutMinor,
    rulesSnapshot: row.rulesSnapshot as ReferralRulesSnapshot,
    tenantCapUsage: row.tenantCapUsage,
    closedAt: row.closedAt?.toISOString() ?? null,
    disbursedAt: row.disbursedAt?.toISOString() ?? null,
  };
}

export function capCheckToResponse(row: TenantPayoutCapCheckResponse): TenantPayoutCapCheckResponse {
  return row;
}
