import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const tenantSchema = pgSchema('tenant');

/**
 * Platform pricing tiers. Platform-level reference data (not tenant-bound).
 * `default_psf_rate_minor` is the per-student fee in kobo applied when a tenant
 * is provisioned without a pre-approved override. CON-011: never zero.
 */
export const tiers = tenantSchema.table(
  'tiers',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    defaultPsfRateMinor: bigint('default_psf_rate_minor', { mode: 'number' }).notNull(),
    maxStudents: bigint('max_students', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex('tiers_code_unique').on(table.code),
    // CON-011: tier default PSF rate can never be zero or negative.
    defaultRatePositive: check(
      'tiers_default_psf_rate_positive',
      sql`${table.defaultPsfRateMinor} > 0`,
    ),
  }),
);

/**
 * The tenant registry — the root of every tenant's data. This table defines the
 * tenants themselves and is managed by platform actors (null tenant context),
 * so it is intentionally NOT under tenant-isolation RLS (mirrors identity.users).
 */
export const tenants = tenantSchema.table(
  'tenants',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: varchar('name', { length: 200 }).notNull(),
    region: varchar('region', { length: 100 }).notNull(),
    contactEmail: varchar('contact_email', { length: 255 }).notNull(),
    address: varchar('address', { length: 500 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('provisioning'),
    tierId: uuid('tier_id')
      .notNull()
      .references(() => tiers.id),
    // CON-009: referral code is permanently linked at onboarding, never reassigned.
    referralCode: varchar('referral_code', { length: 64 }),
    provisionedById: uuid('provisioned_by_id'),
    suspendedReason: varchar('suspended_reason', { length: 500 }),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspendedById: uuid('suspended_by_id'),
    reinstatedAt: timestamp('reinstated_at', { withTimezone: true }),
    reinstatedById: uuid('reinstated_by_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('tenants_status_idx').on(table.status),
    regionIdx: index('tenants_region_idx').on(table.region),
  }),
);

/**
 * Per-tenant key/value configuration. Tenant-bound: protected by RLS on
 * `tenant_id` (loomis-database, loomis-security). RLS policy added in migration.
 */
export const configurations = tenantSchema.table(
  'configurations',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    key: varchar('key', { length: 100 }).notNull(),
    value: jsonb('value').$type<unknown>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantKeyUnique: uniqueIndex('configurations_tenant_id_key_unique').on(
      table.tenantId,
      table.key,
    ),
  }),
);

/**
 * Immutable, append-only PSF rate snapshots (System Design §3.2; FR-PLT-002).
 * Each rate change — global default or per-tenant override — inserts a new row;
 * rows are NEVER updated or deleted (immutability enforced by a DB trigger in
 * the migration). The latest snapshot for a scope is the effective rate.
 *
 * - `scope = 'global'` → `tenant_id IS NULL` (platform-wide default).
 * - `scope = 'tenant'` → `tenant_id` set (per-school override; dual approval).
 *
 * CON-011: `rate_minor > 0` — a PSF rate of zero is permanently blocked at the
 * database layer in addition to the Zod schema and service guard.
 */
export const psfRateSnapshots = tenantSchema.table(
  'psf_rate_snapshots',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    scope: varchar('scope', { length: 10 }).notNull(),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    rateMinor: bigint('rate_minor', { mode: 'number' }).notNull(),
    previousRateMinor: bigint('previous_rate_minor', { mode: 'number' }),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    reason: varchar('reason', { length: 500 }),
    changedById: uuid('changed_by_id').notNull(),
    approvedById: uuid('approved_by_id'),
    workflowInstanceId: uuid('workflow_instance_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    scopeTenantIdx: index('psf_rate_snapshots_scope_tenant_id_idx').on(
      table.scope,
      table.tenantId,
    ),
    // CON-011: a PSF rate of zero (or negative) is permanently blocked.
    ratePositive: check('psf_rate_snapshots_rate_positive', sql`${table.rateMinor} > 0`),
    // scope/tenant_id consistency: global rows have no tenant; tenant rows do.
    scopeTenantConsistent: check(
      'psf_rate_snapshots_scope_tenant_consistent',
      sql`(${table.scope} = 'global' AND ${table.tenantId} IS NULL) OR (${table.scope} = 'tenant' AND ${table.tenantId} IS NOT NULL)`,
    ),
  }),
);
