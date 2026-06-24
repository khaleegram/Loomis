import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  check,
  index,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { tenants } from './tenant';

export const storageSchema = pgSchema('storage');

/**
 * Metadata for objects stored in private S3 buckets (System Design §10).
 * Object keys are opaque (`<classification>/<year>/<month>/<uuid>`); the
 * mapping to tenant and owner resource lives only here. Rows start as
 * `upload_pending`, become `available` after malware scan, or `quarantined`
 * if the scan fails.
 */
export const storageObjects = storageSchema.table(
  'storage_objects',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    ownerResourceType: varchar('owner_resource_type', { length: 128 }).notNull(),
    ownerResourceId: uuid('owner_resource_id').notNull(),
    bucket: varchar('bucket', { length: 128 }).notNull(),
    objectKey: varchar('object_key', { length: 512 }).notNull(),
    objectHash: char('object_hash', { length: 64 }).notNull(),
    classification: varchar('classification', { length: 20 }).notNull(),
    contentType: varchar('content_type', { length: 255 }).notNull(),
    contentLengthBytes: bigint('content_length_bytes', { mode: 'number' }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('upload_pending'),
    createdByUserId: uuid('created_by_user_id').notNull(),
    scannedAt: timestamp('scanned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bucketKeyUnique: uniqueIndex('storage_objects_bucket_object_key_unique').on(
      table.bucket,
      table.objectKey,
    ),
    tenantResourceIdx: index('storage_objects_tenant_resource_idx').on(
      table.tenantId,
      table.ownerResourceType,
      table.ownerResourceId,
    ),
    classificationIdx: index('storage_objects_classification_created_at_idx').on(
      table.classification,
      table.createdAt,
    ),
    classificationCheck: check(
      'storage_objects_classification_valid',
      sql`${table.classification} IN ('public_tenant','internal','pii','child_pii','financial','exam')`,
    ),
    statusCheck: check(
      'storage_objects_status_valid',
      sql`${table.status} IN ('upload_pending','available','quarantined')`,
    ),
    contentLengthPositive: check(
      'storage_objects_content_length_positive',
      sql`${table.contentLengthBytes} > 0`,
    ),
  }),
);
