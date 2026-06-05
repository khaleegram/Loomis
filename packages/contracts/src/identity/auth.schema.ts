import { z } from 'zod';
import { role } from '../common/roles.js';

export const loginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof loginRequest>;

/** Login may complete, or require an MFA challenge before issuing tokens. */
export const loginResponse = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('authenticated'),
    accessToken: z.string(),
    expiresAt: z.string().datetime(),
    role,
    tenantId: z.string().uuid().nullable(),
  }),
  z.object({
    outcome: z.literal('mfa_required'),
    mfaChallengeId: z.string().uuid(),
  }),
  z.object({
    outcome: z.literal('mfa_enrollment_required'),
    enrollmentToken: z.string(),
  }),
]);
export type LoginResponse = z.infer<typeof loginResponse>;

export const mfaVerifyRequest = z.object({
  mfaChallengeId: z.string().uuid(),
  code: z.string().length(6),
});
export type MfaVerifyRequest = z.infer<typeof mfaVerifyRequest>;

/** Step-up proof request for high-risk actions (System Design §5.3). */
export const stepUpAction = z.enum([
  'refund_approve',
  'data_export',
  'psf_rate_change',
  'census_lock',
  'result_publish',
  'ledger_adjustment',
  'parent_contact_change',
  'break_glass',
]);
export type StepUpAction = z.infer<typeof stepUpAction>;

export const stepUpRequest = z.object({
  action: stepUpAction,
  code: z.string().length(6),
});
export type StepUpRequest = z.infer<typeof stepUpRequest>;

export const stepUpResponse = z.object({
  mfaToken: z.string(),
  expiresAt: z.string().datetime(),
});
export type StepUpResponse = z.infer<typeof stepUpResponse>;
