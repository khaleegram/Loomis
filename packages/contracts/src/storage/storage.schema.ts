import { z } from 'zod';

/**
 * Storage module contracts (SRS §10.5; System Design §10).
 * Pre-signed URLs expire in 5 minutes; object keys are opaque server-side.
 */

export const storageClassification = z.enum([
  'public_tenant',
  'internal',
  'pii',
  'child_pii',
  'financial',
  'exam',
]);
export type StorageClassification = z.infer<typeof storageClassification>;

export const storageObjectStatus = z.enum(['upload_pending', 'available', 'quarantined']);
export type StorageObjectStatus = z.infer<typeof storageObjectStatus>;

/** SHA-256 hex digest of the file content (provided before upload). */
export const contentSha256 = z
  .string()
  .length(64, 'contentSha256 must be a 64-character SHA-256 hex digest')
  .regex(/^[a-f0-9]{64}$/i, 'contentSha256 must be lowercase/uppercase hex');

export const createUploadUrlRequest = z.object({
  ownerResourceType: z.string().min(1).max(128),
  ownerResourceId: z.string().uuid(),
  classification: storageClassification,
  contentType: z.string().min(1).max(255),
  contentLengthBytes: z
    .number({ invalid_type_error: 'contentLengthBytes must be an integer' })
    .int('contentLengthBytes must be an integer')
    .positive('contentLengthBytes must be greater than zero'),
  contentSha256,
});
export type CreateUploadUrlRequest = z.infer<typeof createUploadUrlRequest>;

export const createUploadUrlResponse = z.object({
  storageObjectId: z.string().uuid(),
  uploadUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  /** Client must send this Content-Type header on the S3 PUT. */
  requiredHeaders: z.object({
    'Content-Type': z.string(),
    'Content-Length': z.string(),
  }),
});
export type CreateUploadUrlResponse = z.infer<typeof createUploadUrlResponse>;

export const getDownloadUrlResponse = z.object({
  downloadUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  storageObjectId: z.string().uuid(),
  classification: storageClassification,
  status: storageObjectStatus,
});
export type GetDownloadUrlResponse = z.infer<typeof getDownloadUrlResponse>;
