import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { tenants } from './tenant.js';

export const websiteSchema = pgSchema('website');

export const websiteSites = websiteSchema.table(
  'sites',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 80 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    templateId: varchar('template_id', { length: 50 }).notNull().default('prestige'),
    theme: jsonb('theme').$type<Record<string, unknown>>().notNull().default({}),
    sections: jsonb('sections').$type<unknown[]>().notNull().default([]),
    seo: jsonb('seo').$type<Record<string, unknown>>().notNull().default({}),
    publishedSnapshotId: uuid('published_snapshot_id'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    publishedById: uuid('published_by_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantUnique: uniqueIndex('website_sites_tenant_id_unique').on(table.tenantId),
    slugUnique: uniqueIndex('website_sites_slug_unique').on(table.slug),
    statusIdx: index('website_sites_status_idx').on(table.status),
    statusValid: check(
      'website_sites_status_valid',
      sql`${table.status} IN ('draft', 'published', 'unpublished')`,
    ),
    slugFormat: check(
      'website_sites_slug_format',
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
  }),
);

export const websitePublishSnapshots = websiteSchema.table(
  'publish_snapshots',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    siteId: uuid('site_id')
      .notNull()
      .references(() => websiteSites.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    templateId: varchar('template_id', { length: 50 }).notNull(),
    theme: jsonb('theme').$type<Record<string, unknown>>().notNull(),
    sections: jsonb('sections').$type<unknown[]>().notNull(),
    seo: jsonb('seo').$type<Record<string, unknown>>().notNull(),
    publishedById: uuid('published_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    siteVersionUnique: uniqueIndex('website_publish_snapshots_site_version_unique').on(
      table.siteId,
      table.version,
    ),
    siteIdx: index('website_publish_snapshots_site_id_idx').on(table.siteId),
  }),
);
