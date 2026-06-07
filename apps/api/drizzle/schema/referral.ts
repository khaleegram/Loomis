import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { users } from './identity';
import { psfObligations } from './ledger';
import { tenants } from './tenant';

export const referralSchema = pgSchema('referral');

export const PARTICIPANT_TYPES = ['regional_manager', 'regional_subordinate'] as const;
export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];

export const PARTICIPANT_STATUSES = ['pending_kyc', 'active', 'deactivated'] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export const KYC_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const REFERRAL_CODE_STATUSES = ['pending', 'active', 'revoked'] as const;
export type ReferralCodeStatus = (typeof REFERRAL_CODE_STATUSES)[number];

export const ATTRIBUTION_STATUSES = ['active', 'flagged', 'held', 'forfeited'] as const;
export type AttributionStatus = (typeof ATTRIBUTION_STATUSES)[number];

export const EARNING_STATUSES = [
  'accrued',
  'held',
  'eligible',
  'paid',
  'forfeited',
  'carried_forward',
] as const;
export type EarningStatus = (typeof EARNING_STATUSES)[number];

export const PAYOUT_CYCLE_STATUSES = ['open', 'computing', 'closed', 'disbursed'] as const;
export type PayoutCycleStatus = (typeof PAYOUT_CYCLE_STATUSES)[number];

/**
 * Referral programme participants (SRS §4.13 / FR-REF-001).
 * Regional Managers and Subordinates operate at platform scope (null tenant).
 */
export const participants = referralSchema.table(
  'participants',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    participantType: varchar('participant_type', { length: 25 }).notNull(),
    managerParticipantId: uuid('manager_participant_id'),
    region: varchar('region', { length: 50 }),
    status: varchar('status', { length: 20 }).notNull().default('pending_kyc'),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    deactivationReason: text('deactivation_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userUnique: uniqueIndex('participants_user_id_unique').on(table.userId),
    managerIdx: index('participants_manager_participant_id_idx').on(table.managerParticipantId),
    typeStatusIdx: index('participants_type_status_idx').on(table.participantType, table.status),
    typeValid: check(
      'participants_type_valid',
      sql`${table.participantType} IN ('regional_manager', 'regional_subordinate')`,
    ),
    statusValid: check(
      'participants_status_valid',
      sql`${table.status} IN ('pending_kyc', 'active', 'deactivated')`,
    ),
  }),
);

/**
 * KYC and conflict-of-interest records (FR-REF-001 / FR-REF-002).
 * Approval gates code activation and earning accrual.
 */
export const kycRecords = referralSchema.table(
  'kyc_records',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id),
    status: varchar('status', { length: 15 }).notNull().default('pending'),
    identityDocumentObjectId: uuid('identity_document_object_id'),
    addressProofObjectId: uuid('address_proof_object_id'),
    conflictOfInterestDeclared: boolean('conflict_of_interest_declared').notNull().default(false),
    conflictDetails: text('conflict_details'),
    conflictAnswers: jsonb('conflict_answers').$type<Record<string, unknown>>().notNull().default({}),
    submittedByUserId: uuid('submitted_by_user_id').notNull(),
    reviewedByUserId: uuid('reviewed_by_user_id'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    participantStatusIdx: index('kyc_records_participant_status_idx').on(
      table.participantId,
      table.status,
    ),
    statusValid: check(
      'kyc_records_status_valid',
      sql`${table.status} IN ('pending', 'approved', 'rejected')`,
    ),
  }),
);

/**
 * Referral codes — only HMAC hash stored (FR-REF-003). Raw code shown once at generation.
 */
export const referralCodes = referralSchema.table(
  'referral_codes',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    status: varchar('status', { length: 15 }).notNull().default('pending'),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    shownOnceAt: timestamp('shown_once_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeHashUnique: uniqueIndex('referral_codes_code_hash_unique').on(table.codeHash),
    participantActiveIdx: index('referral_codes_participant_status_idx').on(
      table.participantId,
      table.status,
    ),
    statusValid: check(
      'referral_codes_status_valid',
      sql`${table.status} IN ('pending', 'active', 'revoked')`,
    ),
  }),
);

/**
 * School-to-participant attribution (CON-009 / US-REF-003). One active attribution per tenant.
 */
export const attributions = referralSchema.table(
  'attributions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    referralCodeId: uuid('referral_code_id')
      .notNull()
      .references(() => referralCodes.id),
    directParticipantId: uuid('direct_participant_id')
      .notNull()
      .references(() => participants.id),
    managerParticipantId: uuid('manager_participant_id').references(() => participants.id),
    onboardingSource: varchar('onboarding_source', { length: 25 }).notNull(),
    status: varchar('status', { length: 15 }).notNull().default('active'),
    flagReason: varchar('flag_reason', { length: 50 }),
    attributedAt: timestamp('attributed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantUnique: uniqueIndex('attributions_tenant_id_unique').on(table.tenantId),
    directParticipantIdx: index('attributions_direct_participant_idx').on(table.directParticipantId),
    managerParticipantIdx: index('attributions_manager_participant_idx').on(
      table.managerParticipantId,
    ),
    statusIdx: index('attributions_status_idx').on(table.status),
    sourceValid: check(
      'attributions_onboarding_source_valid',
      sql`${table.onboardingSource} IN (
        'manager_direct', 'subordinate', 'self_registration', 'platform'
      )`,
    ),
    statusValid: check(
      'attributions_status_valid',
      sql`${table.status} IN ('active', 'flagged', 'held', 'forfeited')`,
    ),
  }),
);

/**
 * Immutable payout cycle batches (FR-REF-007).
 */
export const payoutCycles = referralSchema.table(
  'payout_cycles',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 15 }).notNull().default('open'),
    rulesSnapshot: jsonb('rules_snapshot').$type<Record<string, unknown>>().notNull().default({}),
    totalPayoutMinor: bigint('total_payout_minor', { mode: 'number' }).notNull().default(0),
    tenantCapUsage: jsonb('tenant_cap_usage')
      .$type<Record<string, { psfCollectedMinor: number; referralPaidMinor: number; capMinor: number }>>()
      .notNull()
      .default({}),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    disbursedAt: timestamp('disbursed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    periodIdx: index('payout_cycles_period_idx').on(table.periodStart, table.periodEnd),
    statusIdx: index('payout_cycles_status_idx').on(table.status),
    statusValid: check(
      'payout_cycles_status_valid',
      sql`${table.status} IN ('open', 'computing', 'closed', 'disbursed')`,
    ),
  }),
);

/**
 * Referral earning accruals (FR-REF-005 / Appendix C). Immutable after creation.
 */
export const earningEntries = referralSchema.table(
  'earning_entries',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    attributionId: uuid('attribution_id')
      .notNull()
      .references(() => attributions.id),
    psfObligationId: uuid('psf_obligation_id')
      .notNull()
      .references(() => psfObligations.id),
    payoutCycleId: uuid('payout_cycle_id').references(() => payoutCycles.id),
    earningType: varchar('earning_type', { length: 20 }).notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    psfSettledAmountMinor: bigint('psf_settled_amount_minor', { mode: 'number' }).notNull(),
    rateBasisPoints: integer('rate_basis_points').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('accrued'),
    holdReason: varchar('hold_reason', { length: 40 }),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    participantCycleStatusIdx: index('earning_entries_participant_cycle_status_idx').on(
      table.participantId,
      table.payoutCycleId,
      table.status,
    ),
    tenantCycleIdx: index('earning_entries_tenant_cycle_idx').on(table.tenantId, table.payoutCycleId),
    idempotencyUnique: uniqueIndex('earning_entries_idempotency_key_unique').on(
      table.idempotencyKey,
    ),
    amountPositive: check('earning_entries_amount_positive', sql`${table.amountMinor} >= 0`),
    psfPositive: check(
      'earning_entries_psf_settled_positive',
      sql`${table.psfSettledAmountMinor} > 0`,
    ),
    typeValid: check(
      'earning_entries_type_valid',
      sql`${table.earningType} IN ('direct', 'manager_override')`,
    ),
    statusValid: check(
      'earning_entries_status_valid',
      sql`${table.status} IN (
        'accrued', 'held', 'eligible', 'paid', 'forfeited', 'carried_forward'
      )`,
    ),
  }),
);

/** Idempotent event consumption for referral module consumers. */
export const referralProcessedEvents = referralSchema.table(
  'processed_events',
  {
    eventId: uuid('event_id').primaryKey(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventTypeIdx: index('referral_processed_events_event_type_idx').on(table.eventType),
  }),
);
