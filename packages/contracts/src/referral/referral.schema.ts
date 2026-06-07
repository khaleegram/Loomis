import { z } from 'zod';
import { koboAmount, positiveKoboAmount } from '../finance/finance.schema.js';

export const participantType = z.enum(['regional_manager', 'regional_subordinate']);
export type ParticipantType = z.infer<typeof participantType>;

export const participantStatus = z.enum(['pending_kyc', 'active', 'deactivated']);
export type ParticipantStatus = z.infer<typeof participantStatus>;

export const kycStatus = z.enum(['pending', 'approved', 'rejected']);
export type KycStatus = z.infer<typeof kycStatus>;

export const referralCodeStatus = z.enum(['pending', 'active', 'revoked']);
export type ReferralCodeStatus = z.infer<typeof referralCodeStatus>;

export const attributionStatus = z.enum(['active', 'flagged', 'held', 'forfeited']);
export type AttributionStatus = z.infer<typeof attributionStatus>;

export const attributionOnboardingSource = z.enum([
  'manager_direct',
  'subordinate',
  'self_registration',
  'platform',
]);
export type AttributionOnboardingSource = z.infer<typeof attributionOnboardingSource>;

export const earningStatus = z.enum([
  'accrued',
  'held',
  'eligible',
  'paid',
  'forfeited',
  'carried_forward',
]);
export type EarningStatus = z.infer<typeof earningStatus>;

export const earningType = z.enum(['direct', 'manager_override']);
export type EarningType = z.infer<typeof earningType>;

export const payoutCycleStatus = z.enum(['open', 'computing', 'closed', 'disbursed']);
export type PayoutCycleStatus = z.infer<typeof payoutCycleStatus>;

export const REFERRAL_EVENT_TYPES = {
  earningAccrued: 'referral.earning.accrued',
  payoutCycleClosed: 'referral.payout_cycle.closed',
  attributionCreated: 'referral.attribution.created',
} as const;

/** Default programme rules snapshot (FR-PLT-004 / CON-016). Rates in basis points. */
export const referralRulesSnapshot = z.object({
  managerDirectRateBps: z.number().int().min(0).max(10_000),
  subordinateDirectRateBps: z.number().int().min(0).max(10_000),
  managerOverrideRateBps: z.number().int().min(0).max(10_000),
  tenantPayoutCapBps: z.number().int().min(0).max(10_000),
  minimumPayoutThresholdMinor: koboAmount,
});
export type ReferralRulesSnapshot = z.infer<typeof referralRulesSnapshot>;

export const participantResponse = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  participantType: participantType,
  managerParticipantId: z.string().uuid().nullable(),
  region: z.string().nullable(),
  status: participantStatus,
  deactivatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type ParticipantResponse = z.infer<typeof participantResponse>;

export const createSubordinateRequest = z.object({
  userId: z.string().uuid(),
  region: z.string().min(1).max(50).optional(),
});
export type CreateSubordinateRequest = z.infer<typeof createSubordinateRequest>;

export const submitKycRequest = z.object({
  identityDocumentObjectId: z.string().uuid(),
  addressProofObjectId: z.string().uuid(),
  conflictOfInterestDeclared: z.boolean(),
  conflictDetails: z.string().max(2000).optional(),
  conflictAnswers: z.record(z.unknown()).default({}),
});
export type SubmitKycRequest = z.infer<typeof submitKycRequest>;

export const kycRecordResponse = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  status: kycStatus,
  conflictOfInterestDeclared: z.boolean(),
  conflictDetails: z.string().nullable(),
  reviewedByUserId: z.string().uuid().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  rejectionReason: z.string().nullable(),
  submittedAt: z.string().datetime(),
});
export type KycRecordResponse = z.infer<typeof kycRecordResponse>;

export const reviewKycRequest = z.object({
  notes: z.string().max(500).optional(),
});
export type ReviewKycRequest = z.infer<typeof reviewKycRequest>;

export const rejectKycRequest = z.object({
  reason: z.string().min(10).max(500),
});
export type RejectKycRequest = z.infer<typeof rejectKycRequest>;

/** Raw code returned exactly once at generation (FR-REF-003). */
export const referralCodeRevealResponse = z.object({
  codeId: z.string().uuid(),
  rawCode: z.string().min(12).max(32),
  message: z.literal('Store this code securely. It cannot be retrieved again.'),
});
export type ReferralCodeRevealResponse = z.infer<typeof referralCodeRevealResponse>;

export const referralCodeSummaryResponse = z.object({
  id: z.string().uuid(),
  status: referralCodeStatus,
  activatedAt: z.string().datetime().nullable(),
  canRegenerate: z.boolean(),
});
export type ReferralCodeSummaryResponse = z.infer<typeof referralCodeSummaryResponse>;

export const attributionResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  directParticipantId: z.string().uuid(),
  managerParticipantId: z.string().uuid().nullable(),
  onboardingSource: attributionOnboardingSource,
  status: attributionStatus,
  flagReason: z.string().nullable(),
  attributedAt: z.string().datetime(),
});
export type AttributionResponse = z.infer<typeof attributionResponse>;

export const earningEntryResponse = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  tenantId: z.string().uuid(),
  psfObligationId: z.string().uuid(),
  payoutCycleId: z.string().uuid().nullable(),
  earningType: earningType,
  amountMinor: koboAmount,
  psfSettledAmountMinor: positiveKoboAmount,
  rateBasisPoints: z.number().int(),
  status: earningStatus,
  holdReason: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type EarningEntryResponse = z.infer<typeof earningEntryResponse>;

export const earningsSummaryResponse = z.object({
  participantId: z.string().uuid(),
  totalAccruedMinor: koboAmount,
  totalHeldMinor: koboAmount,
  totalEligibleMinor: koboAmount,
  totalPaidMinor: koboAmount,
  byTenant: z.array(
    z.object({
      tenantId: z.string().uuid(),
      accruedMinor: koboAmount,
      heldMinor: koboAmount,
      eligibleMinor: koboAmount,
    }),
  ),
});
export type EarningsSummaryResponse = z.infer<typeof earningsSummaryResponse>;

export const payoutCycleResponse = z.object({
  id: z.string().uuid(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  status: payoutCycleStatus,
  totalPayoutMinor: koboAmount,
  rulesSnapshot: referralRulesSnapshot,
  tenantCapUsage: z.record(
    z.object({
      psfCollectedMinor: koboAmount,
      referralPaidMinor: koboAmount,
      capMinor: koboAmount,
    }),
  ),
  closedAt: z.string().datetime().nullable(),
  disbursedAt: z.string().datetime().nullable(),
});
export type PayoutCycleResponse = z.infer<typeof payoutCycleResponse>;

/** US-REF-004 — forty-percent cap visibility for a tenant in the current cycle. */
export const tenantPayoutCapCheckResponse = z.object({
  tenantId: z.string().uuid(),
  payoutCycleId: z.string().uuid(),
  psfCollectedMinor: koboAmount,
  capMinor: koboAmount,
  referralAccruedMinor: koboAmount,
  remainingCapMinor: koboAmount,
  capExceeded: z.boolean(),
  heldForCapMinor: koboAmount,
});
export type TenantPayoutCapCheckResponse = z.infer<typeof tenantPayoutCapCheckResponse>;

export const validateReferralCodeRequest = z.object({
  rawCode: z.string().min(8).max(32),
});
export type ValidateReferralCodeRequest = z.infer<typeof validateReferralCodeRequest>;

export const validateReferralCodeResponse = z.object({
  valid: z.boolean(),
  participantId: z.string().uuid().optional(),
  participantType: participantType.optional(),
  kycApproved: z.boolean().optional(),
});
export type ValidateReferralCodeResponse = z.infer<typeof validateReferralCodeResponse>;
