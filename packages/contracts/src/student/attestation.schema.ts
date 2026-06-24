import { z } from 'zod';

export const enrollmentAttestationResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  termId: z.string().uuid(),
  systemBillableCount: z.number().int(),
  generatedBy: z.string(),
  attestedById: z.string().uuid().nullable(),
  attestedAt: z.string().datetime(),
  studentListHash: z.string(),
  attestationHash: z.string(),
  rateSnapshotId: z.string().uuid(),
  psfRateMinor: z.number().int(),
  attestationStatus: z.enum(['submitted', 'verified', 'disputed']),
  createdAt: z.string().datetime(),
});
export type EnrollmentAttestationResponse = z.infer<typeof enrollmentAttestationResponse>;

export const enrollmentAttestationListResponse = z.object({
  attestations: z.array(enrollmentAttestationResponse),
});
export type EnrollmentAttestationListResponse = z.infer<typeof enrollmentAttestationListResponse>;
