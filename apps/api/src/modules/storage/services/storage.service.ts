import type {
  CreateUploadUrlResponse,
  GetDownloadUrlResponse,
  StorageClassification,
} from '@loomis/contracts';
import { createHash } from 'node:crypto';
import { uuidv7 } from 'uuidv7';
import { getEnv } from '../../../config/env.js';
import { writeAudit, writeDataAccess } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { storageEvents } from '../events/index.js';
import { storageRepository } from '../repository/storage.repository.js';
import type { ActorContext, CreateUploadUrlInput } from '../types.js';
import { PRESIGNED_URL_EXPIRY_SECONDS, s3PresignService } from './s3.client.js';

/** School-scoped roles permitted to request upload/download URLs (SRS §10.5). */
const STORAGE_ACCESS_ROLES = new Set([
  'school_owner',
  'principal',
  'admin_officer',
  'accountant',
  'cashier',
  'exam_officer',
  'deputy_exam_officer',
  'timetable_officer',
  'teacher',
  'class_teacher',
  'student',
]);

const MAX_BYTES_BY_CLASSIFICATION: Record<StorageClassification, number> = {
  public_tenant: 10 * 1024 * 1024,
  internal: 25 * 1024 * 1024,
  pii: 10 * 1024 * 1024,
  child_pii: 10 * 1024 * 1024,
  financial: 5 * 1024 * 1024,
  exam: 50 * 1024 * 1024,
};

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

function assertStorageRole(actor: ActorContext): void {
  if (!STORAGE_ACCESS_ROLES.has(actor.role)) {
    throw new LoomisError('FORBIDDEN', 403, 'Role is not permitted to access storage');
  }
}

function buildOpaqueObjectKey(classification: StorageClassification, objectId: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${classification}/${year}/${month}/${objectId}`;
}

function auditSensitivity(classification: StorageClassification) {
  if (classification === 'child_pii') return 'child_pii' as const;
  if (classification === 'financial') return 'financial' as const;
  if (classification === 'pii') return 'pii' as const;
  if (classification === 'exam') return 'security' as const;
  return 'standard' as const;
}

function isSensitiveClassification(classification: StorageClassification): boolean {
  return classification === 'pii' || classification === 'child_pii' || classification === 'financial' || classification === 'exam';
}

export const storageService = {
  validateUploadMetadata(input: CreateUploadUrlInput): void {
    if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
      throw new LoomisError(
        'STORAGE_CONTENT_TYPE_NOT_ALLOWED',
        422,
        'Content type is not permitted for upload',
      );
    }

    const maxBytes = MAX_BYTES_BY_CLASSIFICATION[input.classification]!;
    if (input.contentLengthBytes > maxBytes) {
      throw new LoomisError(
        'STORAGE_CONTENT_LENGTH_EXCEEDED',
        422,
        `File exceeds maximum size of ${maxBytes} bytes for classification ${input.classification}`,
      );
    }
  },

  /**
   * Issues a pre-signed S3 PUT URL and creates an `upload_pending` metadata row.
   * Publishes `storage.object.upload_requested` for the malware-scan pipeline.
   */
  async createUploadUrl(
    input: CreateUploadUrlInput,
    actor: ActorContext,
    requestId: string,
  ): Promise<CreateUploadUrlResponse> {
    assertStorageRole(actor);
    this.validateUploadMetadata(input);

    const env = getEnv();
    const storageObjectId = uuidv7();
    const objectKey = buildOpaqueObjectKey(input.classification, storageObjectId);

    let uploadUrl: string;
    try {
      uploadUrl = await s3PresignService.createPutUrl({
        bucket: env.S3_BUCKET,
        objectKey,
        contentType: input.contentType,
        contentLengthBytes: input.contentLengthBytes,
      });
    } catch {
      throw new LoomisError('STORAGE_S3_UNAVAILABLE', 503, 'Object storage is temporarily unavailable');
    }

    const record = await storageRepository.create({
      id: storageObjectId,
      tenantId: actor.tenantId,
      ownerResourceType: input.ownerResourceType,
      ownerResourceId: input.ownerResourceId,
      bucket: env.S3_BUCKET,
      objectKey,
      objectHash: input.contentSha256,
      classification: input.classification,
      contentType: input.contentType,
      contentLengthBytes: input.contentLengthBytes,
      createdByUserId: actor.userId,
    });

    await storageEvents.publishUploadRequested({
      tenantId: actor.tenantId,
      storageObjectId: record.id,
      bucket: env.S3_BUCKET,
      objectKey,
      classification: input.classification,
      contentType: input.contentType,
      contentLengthBytes: input.contentLengthBytes,
      objectHash: input.contentSha256.toLowerCase(),
      createdByUserId: actor.userId,
    });

    const expiresAt = new Date(Date.now() + PRESIGNED_URL_EXPIRY_SECONDS * 1000).toISOString();

    await writeAudit({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: 'storage.object.upload_url_issued',
      resourceType: 'storage_object',
      resourceId: record.id,
      sensitivity: auditSensitivity(input.classification),
      result: 'success',
      requestId,
      metadata: {
        classification: input.classification,
        ownerResourceType: input.ownerResourceType,
        contentLengthBytes: input.contentLengthBytes,
      },
    });

    return {
      storageObjectId: record.id,
      uploadUrl,
      expiresAt,
      requiredHeaders: {
        'Content-Type': input.contentType,
        'Content-Length': String(input.contentLengthBytes),
      },
    };
  },

  /**
   * Server-side upload for web clients (avoids S3 bucket CORS configuration).
   * Mobile clients should continue to use the pre-signed PUT URL.
   */
  async uploadObjectContent(
    storageObjectId: string,
    body: Buffer,
    actor: ActorContext,
    requestId: string,
  ): Promise<{ storageObjectId: string; status: 'upload_pending' | 'available' }> {
    assertStorageRole(actor);

    const record = await storageRepository.findById(actor.tenantId, storageObjectId);
    if (!record) {
      throw new LoomisError('STORAGE_OBJECT_NOT_FOUND', 404, 'Storage object not found');
    }
    if (record.status !== 'upload_pending') {
      throw new LoomisError('STORAGE_OBJECT_NOT_AVAILABLE', 409, 'Storage object is not awaiting upload');
    }
    if (record.createdByUserId !== actor.userId) {
      throw new LoomisError('FORBIDDEN', 403, 'Cannot upload to another user\'s storage object');
    }
    if (body.length !== record.contentLengthBytes) {
      throw new LoomisError(
        'VALIDATION_ERROR',
        422,
        'Uploaded content length does not match declared size',
      );
    }

    const digest = createHash('sha256').update(body).digest('hex');
    if (digest !== record.objectHash.toLowerCase()) {
      throw new LoomisError('VALIDATION_ERROR', 422, 'Uploaded content hash does not match declared hash');
    }

    try {
      await s3PresignService.putObject({
        bucket: record.bucket,
        objectKey: record.objectKey,
        contentType: record.contentType,
        body,
      });
    } catch {
      throw new LoomisError('STORAGE_S3_UNAVAILABLE', 503, 'Object storage is temporarily unavailable');
    }

    const env = getEnv();
    const nextStatus = env.NODE_ENV === 'development' ? 'available' : 'upload_pending';
    if (nextStatus === 'available') {
      await storageRepository.updateStatus(actor.tenantId, storageObjectId, 'available', new Date());
    }

    await writeAudit({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: 'storage.object.uploaded',
      resourceType: 'storage_object',
      resourceId: storageObjectId,
      sensitivity: auditSensitivity(record.classification as StorageClassification),
      result: 'success',
      requestId,
      metadata: {
        classification: record.classification,
        via: 'api_proxy',
        status: nextStatus,
      },
    });

    return { storageObjectId, status: nextStatus };
  },

  async getDownloadUrl(
    storageObjectId: string,
    actor: ActorContext,
    requestId: string,
    auditContext?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<GetDownloadUrlResponse> {
    assertStorageRole(actor);

    const record = await storageRepository.findById(actor.tenantId, storageObjectId);
    if (!record) {
      throw new LoomisError('STORAGE_OBJECT_NOT_FOUND', 404, 'Storage object not found');
    }

    if (record.status !== 'available') {
      throw new LoomisError(
        'STORAGE_OBJECT_NOT_AVAILABLE',
        409,
        `Object is not available for download (status: ${record.status})`,
      );
    }

    let downloadUrl: string;
    try {
      downloadUrl = await s3PresignService.createGetUrl({
        bucket: record.bucket,
        objectKey: record.objectKey,
      });
    } catch {
      throw new LoomisError('STORAGE_S3_UNAVAILABLE', 503, 'Object storage is temporarily unavailable');
    }

    const expiresAt = new Date(Date.now() + PRESIGNED_URL_EXPIRY_SECONDS * 1000).toISOString();

    await writeAudit({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: 'storage.object.accessed',
      resourceType: 'storage_object',
      resourceId: record.id,
      sensitivity: auditSensitivity(record.classification),
      result: 'success',
      requestId,
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
      metadata: {
        classification: record.classification,
        ownerResourceType: record.ownerResourceType,
      },
    });

    if (isSensitiveClassification(record.classification)) {
      await writeDataAccess({
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        resourceType: 'storage_object',
        containsChildPii: record.classification === 'child_pii',
        containsFinancialData: record.classification === 'financial',
      });
    }

    return {
      downloadUrl,
      expiresAt,
      storageObjectId: record.id,
      classification: record.classification,
      status: record.status,
    };
  },

  /**
   * Server-side object creation for platform-generated documents (certificates, exports).
   * Skips malware scan in development; production uses upload_pending until scan completes.
   */
  async storePlatformGeneratedObject(input: {
    tenantId: string;
    ownerResourceType: string;
    ownerResourceId: string;
    classification: StorageClassification;
    contentType: string;
    body: Buffer;
    createdByUserId: string;
  }): Promise<{ storageObjectId: string }> {
    if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
      throw new LoomisError(
        'STORAGE_CONTENT_TYPE_NOT_ALLOWED',
        422,
        'Content type is not permitted for upload',
      );
    }

    const env = getEnv();
    const storageObjectId = uuidv7();
    const objectKey = buildOpaqueObjectKey(input.classification, storageObjectId);
    const objectHash = createHash('sha256').update(input.body).digest('hex');

    await storageRepository.create({
      id: storageObjectId,
      tenantId: input.tenantId,
      ownerResourceType: input.ownerResourceType,
      ownerResourceId: input.ownerResourceId,
      bucket: env.S3_BUCKET,
      objectKey,
      objectHash,
      classification: input.classification,
      contentType: input.contentType,
      contentLengthBytes: input.body.length,
      createdByUserId: input.createdByUserId,
    });

    try {
      await s3PresignService.putObject({
        bucket: env.S3_BUCKET,
        objectKey,
        contentType: input.contentType,
        body: input.body,
      });
    } catch {
      throw new LoomisError('STORAGE_S3_UNAVAILABLE', 503, 'Object storage is temporarily unavailable');
    }

    if (env.NODE_ENV === 'development') {
      await storageRepository.updateStatus(input.tenantId, storageObjectId, 'available', new Date());
    }

    return { storageObjectId };
  },
};
