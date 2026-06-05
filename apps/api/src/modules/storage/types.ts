import type { CreateUploadUrlRequest, StorageClassification } from '@loomis/contracts';

/** Actor context for storage operations — from the verified access token. */
export interface ActorContext {
  userId: string;
  role: string;
  tenantId: string;
}

export type CreateUploadUrlInput = CreateUploadUrlRequest;

export interface OutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  tenantId: string | null;
  payload: Record<string, unknown>;
}

export interface StorageObjectRow {
  id: string;
  tenantId: string;
  ownerResourceType: string;
  ownerResourceId: string;
  bucket: string;
  objectKey: string;
  objectHash: string;
  classification: StorageClassification;
  contentType: string;
  contentLengthBytes: number;
  status: 'upload_pending' | 'available' | 'quarantined';
  createdByUserId: string;
  scannedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
