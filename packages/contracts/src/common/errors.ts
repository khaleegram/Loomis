import { z } from 'zod';

/**
 * All API error codes are namespaced by module. The frontend switches on
 * `code`, never on HTTP status or message strings (Frontend Architecture §11.1).
 */
export const loomisErrorCode = z.enum([
  // identity
  'IDENTITY_INVALID_CREDENTIALS',
  'IDENTITY_TOKEN_EXPIRED',
  'IDENTITY_SESSION_INVALIDATED',
  'IDENTITY_MFA_REQUIRED',
  'IDENTITY_MFA_INVALID',
  'IDENTITY_STEPUP_REQUIRED',
  'IDENTITY_ACCOUNT_LOCKED',
  'IDENTITY_MFA_NOT_ENROLLED',
  // tenant
  'TENANT_NOT_FOUND',
  'TENANT_SUSPENDED',
  // hrm
  'HRM_INVITATION_EXPIRED',
  'HRM_ROLE_CONFLICT',
  'HRM_SINGLETON_ROLE_GUARD',
  // academic
  'ACADEMIC_TERM_NOT_OPEN',
  'ACADEMIC_CENSUS_ALREADY_LOCKED',
  'ACADEMIC_CENSUS_VARIANCE_REASON_REQUIRED',
  // student
  'STUDENT_NOT_FOUND',
  'STUDENT_PARENT_LINK_UNVERIFIED',
  // finance
  'FINANCE_INVALID_AMOUNT',
  'FINANCE_PAYMENT_DUPLICATE',
  'FINANCE_CANNOT_VERIFY_OWN_PAYMENT',
  // ledger
  'LEDGER_UNBALANCED_TRANSACTION',
  'LEDGER_PSF_RATE_ZERO_BLOCKED',
  // risk
  'RISK_IVP_CASE_OPEN',
  // referral
  'REFERRAL_KYC_NOT_APPROVED',
  'REFERRAL_SELF_APPROVAL_BLOCKED',
  // workflow
  'WORKFLOW_APPROVER_IS_REQUESTER',
  // generic
  'VALIDATION_ERROR',
  'IDEMPOTENCY_KEY_REQUIRED',
  'RATE_LIMITED',
  'FORBIDDEN',
  'NOT_FOUND',
  'AUDIT_UNAVAILABLE',
  'INTERNAL_ERROR',
]);

export type LoomisErrorCode = z.infer<typeof loomisErrorCode>;

export const apiError = z.object({
  code: loomisErrorCode,
  message: z.string(),
  requestId: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof apiError>;
