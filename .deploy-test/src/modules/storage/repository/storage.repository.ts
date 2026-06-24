import { eq } from 'drizzle-orm';
import { storageObjects } from '../../../../drizzle/schema/storage.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { StorageObjectRow } from '../types.js';

export interface CreateStorageObjectInput {
  id: string;
  tenantId: string;
  ownerResourceType: string;
  ownerResourceId: string;
  bucket: string;
  objectKey: string;
  objectHash: string;
  classification: string;
  contentType: string;
  contentLengthBytes: number;
  createdByUserId: string;
}

export const storageRepository = {
  async create(input: CreateStorageObjectInput, tx?: Executor): Promise<StorageObjectRow> {
    const insert = async (executor: Executor) => {
      const [row] = await executor
        .insert(storageObjects)
        .values({
          id: input.id,
          tenantId: input.tenantId,
          ownerResourceType: input.ownerResourceType,
          ownerResourceId: input.ownerResourceId,
          bucket: input.bucket,
          objectKey: input.objectKey,
          objectHash: input.objectHash.toLowerCase(),
          classification: input.classification,
          contentType: input.contentType,
          contentLengthBytes: input.contentLengthBytes,
          status: 'upload_pending',
          createdByUserId: input.createdByUserId,
        })
        .returning();
      if (!row) throw new Error('Failed to create storage object');
      return row as StorageObjectRow;
    };

    if (tx) return insert(tx);
    return withTenantContext(input.tenantId, insert);
  },

  async findById(tenantId: string, id: string): Promise<StorageObjectRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(storageObjects)
        .where(eq(storageObjects.id, id))
        .limit(1);
      return (row as StorageObjectRow | undefined) ?? null;
    });
  },

  async updateStatus(
    tenantId: string,
    id: string,
    status: 'upload_pending' | 'available' | 'quarantined',
    scannedAt?: Date,
  ): Promise<StorageObjectRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .update(storageObjects)
        .set({
          status,
          scannedAt: scannedAt ?? null,
          updatedAt: new Date(),
        })
        .where(eq(storageObjects.id, id))
        .returning();
      return (row as StorageObjectRow | undefined) ?? null;
    });
  },
};
