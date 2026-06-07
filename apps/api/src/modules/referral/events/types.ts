import { LEDGER_EVENT_TYPES } from '@loomis/contracts';
import { TENANT_EVENT_TYPES } from '../../tenant/events/types.js';
import { RISK_EVENT_TYPES } from '@loomis/contracts';

export const REFERRAL_CONSUMED_EVENT_TYPES = {
  psfObligationSettled: LEDGER_EVENT_TYPES.psfObligationSettled,
  tenantProvisioned: TENANT_EVENT_TYPES.provisioned,
  ivpCaseOpened: RISK_EVENT_TYPES.ivpCaseOpened,
  ivpCaseClosed: RISK_EVENT_TYPES.ivpCaseClosed,
} as const;

export interface PsfObligationSettledEvent {
  event_id: string;
  eventType: string;
  payload: {
    tenantId: string;
    obligationId: string;
    settledAmountMinor: number;
    termId: string;
    studentId: string;
    settledAt?: string;
  };
}

export interface TenantProvisionedReferralEvent {
  eventId: string;
  tenantId: string;
  referralCode: string | null;
  provisionedById: string;
}

export interface IvpCaseReferralEvent {
  event_id?: string;
  tenantId: string;
  caseId?: string;
}
