import { z } from 'zod';

export const mfaEnrollStartResponse = z.object({
  provisioningUri: z.string().startsWith('otpauth://'),
  secretBase32: z.string(),
});
export type MfaEnrollStartResponse = z.infer<typeof mfaEnrollStartResponse>;

export const mfaEnrollConfirmRequest = z.object({
  enrollmentToken: z.string().min(1),
  code: z.string().length(6),
});
export type MfaEnrollConfirmRequest = z.infer<typeof mfaEnrollConfirmRequest>;

export const mfaEnrollConfirmResponse = z.object({
  backupCodes: z.array(z.string()).length(10),
});
export type MfaEnrollConfirmResponse = z.infer<typeof mfaEnrollConfirmResponse>;

export const mfaChallengeResponse = z.object({
  mfaChallengeId: z.string().uuid(),
});
export type MfaChallengeResponse = z.infer<typeof mfaChallengeResponse>;

export const mfaVerifyBackupRequest = z.object({
  mfaChallengeId: z.string().uuid(),
  backupCode: z.string().min(8).max(12),
});
export type MfaVerifyBackupRequest = z.infer<typeof mfaVerifyBackupRequest>;

export const mfaResetRequest = z.object({
  code: z.string().length(6),
});
export type MfaResetRequest = z.infer<typeof mfaResetRequest>;

export const mfaStatusResponse = z.object({
  enrolled: z.boolean(),
  status: z.enum(['none', 'pending', 'active']),
  totpOptionalAvailable: z.boolean(),
});
export type MfaStatusResponse = z.infer<typeof mfaStatusResponse>;

export const mfaVoluntaryEnrollConfirmRequest = z.object({
  code: z.string().length(6),
});
export type MfaVoluntaryEnrollConfirmRequest = z.infer<typeof mfaVoluntaryEnrollConfirmRequest>;
