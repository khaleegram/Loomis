import type {
  CreateSubordinateRequest,
  ReferralRulesSnapshot,
  RejectKycRequest,
  ReviewKycRequest,
  SubmitKycRequest,
} from '@loomis/contracts';
import type { Role } from '@loomis/contracts';

export interface ActorContext {
  userId: string;
  role: Role;
  tenantId: string | null;
}

export type SubmitKycInput = SubmitKycRequest;
export type ReviewKycInput = ReviewKycRequest;
export type RejectKycInput = RejectKycRequest;
export type CreateSubordinateInput = CreateSubordinateRequest;

export interface OutboxEventInput {
  tenantId: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/** Default programme rules until Platform Config module ships (FR-PLT-004). */
export const DEFAULT_REFERRAL_RULES: ReferralRulesSnapshot = {
  managerDirectRateBps: 1000,
  subordinateDirectRateBps: 800,
  managerOverrideRateBps: 200,
  tenantPayoutCapBps: 4000,
  minimumPayoutThresholdMinor: 5_000_000,
};

export const TENANT_PAYOUT_CAP_BPS = 4000;

export const PLATFORM_ROLES = new Set(['platform_owner', 'platform_admin']);
export const REGIONAL_ROLES = new Set(['regional_manager', 'regional_subordinate']);
