export const STORAGE_EVENT_TYPES = {
  uploadRequested: 'storage.object.upload_requested',
  scanCompleted: 'storage.object.scan_completed',
} as const;

export interface StorageUploadRequestedPayload {
  tenantId: string;
  storageObjectId: string;
  bucket: string;
  objectKey: string;
  classification: string;
  contentType: string;
  contentLengthBytes: number;
  objectHash: string;
  createdByUserId: string;
}

export interface StorageScanCompletedPayload {
  tenantId: string;
  storageObjectId: string;
  result: 'clean' | 'infected';
}
