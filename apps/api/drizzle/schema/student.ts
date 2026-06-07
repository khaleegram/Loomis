import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { classLevels } from './academic';
import { psfRateSnapshots, tenants } from './tenant';

export const studentSchema = pgSchema('student');

/**
 * Global parent identity (FR-SIS-003; CON-002). Not tenant-bound — one row per
 * unique email/phone across the platform. Parent-student links are per-tenant
 * in `parent_links`; never JOIN identities across tenants in a single query.
 */
export const parentIdentities = studentSchema.table(
  'parent_identities',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    emailNormalized: varchar('email_normalized', { length: 255 }).notNull(),
    phoneE164: varchar('phone_e164', { length: 20 }),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    /** Links to identity.users when the parent has a platform account. */
    userId: uuid('user_id'),
    status: varchar('status', { length: 20 }).notNull().default('unverified'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('parent_identities_email_normalized_unique').on(table.emailNormalized),
    phoneUnique: uniqueIndex('parent_identities_phone_e164_unique')
      .on(table.phoneE164)
      .where(sql`${table.phoneE164} IS NOT NULL`),
    statusValid: check(
      'parent_identities_status_valid',
      sql`${table.status} IN ('unverified', 'verified', 'recovery_locked', 'suspended')`,
    ),
  }),
);

/**
 * Admission applications (FR-SIS-001 / US-SIS-001). Pending applications hold
 * applicant data; approval creates a `students` row (US-SIS-002).
 */
export const admissions = studentSchema.table(
  'admissions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    referenceNumber: varchar('reference_number', { length: 32 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    dateOfBirth: date('date_of_birth').notNull(),
    gender: varchar('gender', { length: 10 }).notNull().default('unknown'),
    intendedClassLevelId: uuid('intended_class_level_id')
      .notNull()
      .references(() => classLevels.id),
    guardianName: varchar('guardian_name', { length: 200 }).notNull(),
    guardianEmail: varchar('guardian_email', { length: 255 }).notNull(),
    guardianPhone: varchar('guardian_phone', { length: 20 }).notNull(),
    guardianRelationship: varchar('guardian_relationship', { length: 30 }).notNull(),
    declineReason: varchar('decline_reason', { length: 500 }),
    studentId: uuid('student_id'),
    decidedById: uuid('decided_by_id'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdById: uuid('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantReferenceUnique: uniqueIndex('admissions_tenant_id_reference_number_unique').on(
      table.tenantId,
      table.referenceNumber,
    ),
    tenantStatusIdx: index('admissions_tenant_id_status_idx').on(table.tenantId, table.status),
    statusValid: check(
      'admissions_status_valid',
      sql`${table.status} IN ('pending', 'approved', 'declined', 'withdrawn')`,
    ),
    genderValid: check(
      'admissions_gender_valid',
      sql`${table.gender} IN ('male', 'female', 'other', 'unknown')`,
    ),
  }),
);

/**
 * Student registry (FR-SIS-002). Created when an admission is approved. Each
 * student has a unique admission number within the tenant.
 */
export const students = studentSchema.table(
  'students',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    admissionId: uuid('admission_id').notNull(),
    admissionNo: varchar('admission_no', { length: 64 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    dateOfBirth: date('date_of_birth').notNull(),
    gender: varchar('gender', { length: 10 }).notNull().default('unknown'),
    status: varchar('status', { length: 20 }).notNull().default('admitted'),
    /** FR-SIS-002: required before billable enrollment. */
    identityAttestationType: varchar('identity_attestation_type', { length: 40 }),
    identityAttestedAt: timestamp('identity_attested_at', { withTimezone: true }),
    identityAttestedById: uuid('identity_attested_by_id'),
    transferDestination: varchar('transfer_destination', { length: 200 }),
    transferReason: varchar('transfer_reason', { length: 500 }),
    transferredAt: timestamp('transferred_at', { withTimezone: true }),
    transferredById: uuid('transferred_by_id'),
    createdById: uuid('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantAdmissionNoUnique: uniqueIndex('students_tenant_id_admission_no_unique').on(
      table.tenantId,
      table.admissionNo,
    ),
    tenantAdmissionUnique: uniqueIndex('students_tenant_id_admission_id_unique').on(
      table.tenantId,
      table.admissionId,
    ),
    tenantStatusIdx: index('students_tenant_id_status_idx').on(table.tenantId, table.status),
    nameDobIdx: index('students_tenant_name_dob_idx').on(
      table.tenantId,
      table.lastName,
      table.firstName,
      table.dateOfBirth,
    ),
    statusValid: check(
      'students_status_valid',
      sql`${table.status} IN ('admitted', 'enrolled', 'graduated', 'transferred_out', 'withdrawn')`,
    ),
    genderValid: check(
      'students_gender_valid',
      sql`${table.gender} IN ('male', 'female', 'other', 'unknown')`,
    ),
    attestationTypeValid: check(
      'students_attestation_type_valid',
      sql`${table.identityAttestationType} IS NULL OR ${table.identityAttestationType} IN (
        'birth_certificate', 'previous_school_record', 'admission_photograph', 'parent_consent'
      )`,
    ),
  }),
);

/**
 * Term enrollments (FR-SIS-005 / US-SIS-003). `active_billable` rows feed the
 * census lock billable count (System Design §8.1 step 2).
 */
export const enrollments = studentSchema.table(
  'enrollments',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    termId: uuid('term_id').notNull(),
    classArmId: uuid('class_arm_id').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    enrolledById: uuid('enrolled_by_id').notNull(),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    endReason: varchar('end_reason', { length: 30 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    termStudentUnique: uniqueIndex('enrollments_tenant_term_student_unique').on(
      table.tenantId,
      table.termId,
      table.studentId,
    ),
    billableCensusIdx: index('enrollments_tenant_term_status_idx').on(
      table.tenantId,
      table.termId,
      table.status,
    ),
    classArmIdx: index('enrollments_tenant_term_class_arm_idx').on(
      table.tenantId,
      table.termId,
      table.classArmId,
    ),
    statusValid: check(
      'enrollments_status_valid',
      sql`${table.status} IN ('active', 'active_billable', 'suspended', 'withdrawn', 'transferred', 'graduated')`,
    ),
    endReasonValid: check(
      'enrollments_end_reason_valid',
      sql`${table.endReason} IS NULL OR ${table.endReason} IN ('transfer', 'withdrawal', 'graduation', 'suspension')`,
    ),
  }),
);

/**
 * Census enrollment attestation (Revenue Integrity §A / System Design §8.1 step 6).
 * INSERT-only legal declaration at census lock: attested counts, rate snapshot,
 * and SHA-256 hashes of the attested figures and billable student list.
 */
export const enrollmentAttestations = studentSchema.table(
  'enrollment_attestations',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    termId: uuid('term_id').notNull(),
    declaredBillableCount: integer('declared_billable_count').notNull(),
    systemBillableCount: integer('system_billable_count').notNull(),
    attestedById: uuid('attested_by_id').notNull(),
    attestedAt: timestamp('attested_at', { withTimezone: true }).notNull(),
    /** SHA-256 of the sorted billable student ID list at lock time. */
    studentListHash: varchar('student_list_hash', { length: 64 }).notNull(),
    /** Tamper-evident digest of attested figures (includes studentListHash). */
    attestationHash: varchar('attestation_hash', { length: 64 }).notNull(),
    rateSnapshotId: uuid('rate_snapshot_id')
      .notNull()
      .references(() => psfRateSnapshots.id),
    psfRateMinor: bigint('psf_rate_minor', { mode: 'number' }).notNull(),
    attestationStatus: varchar('attestation_status', { length: 20 }).notNull().default('submitted'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantTermUnique: uniqueIndex('enrollment_attestations_tenant_term_unique').on(
      table.tenantId,
      table.termId,
    ),
    statusIdx: index('enrollment_attestations_status_idx').on(table.attestationStatus),
    ratePositive: check('enrollment_attestations_rate_positive', sql`${table.psfRateMinor} > 0`),
    statusValid: check(
      'enrollment_attestations_status_valid',
      sql`${table.attestationStatus} IN ('submitted', 'verified', 'disputed')`,
    ),
  }),
);

/**
 * Parent-student links per tenant (FR-SIS-003 / US-SIS-004..005). Global
 * identity in `parent_identities`; link activation requires parent OTP — the
 * Admin Officer cannot self-complete verification.
 */
export const parentLinks = studentSchema.table(
  'parent_links',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    parentIdentityId: uuid('parent_identity_id')
      .notNull()
      .references(() => parentIdentities.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    relationship: varchar('relationship', { length: 15 }).notNull(),
    status: varchar('status', { length: 25 }).notNull().default('initiated'),
    otpHash: varchar('otp_hash', { length: 64 }),
    otpExpiresAt: timestamp('otp_expires_at', { withTimezone: true }),
    verifiedByFactor: varchar('verified_by_factor', { length: 20 }),
    initiatedById: uuid('initiated_by_id').notNull(),
    schoolAttestedById: uuid('school_attested_by_id'),
    schoolAttestedAt: timestamp('school_attested_at', { withTimezone: true }),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    linkUnique: uniqueIndex('parent_links_identity_tenant_student_unique').on(
      table.parentIdentityId,
      table.tenantId,
      table.studentId,
    ),
    tenantStudentIdx: index('parent_links_tenant_student_idx').on(table.tenantId, table.studentId),
    verificationIdx: index('parent_links_parent_identity_status_idx').on(
      table.parentIdentityId,
      table.status,
    ),
    relationshipValid: check(
      'parent_links_relationship_valid',
      sql`${table.relationship} IN ('mother', 'father', 'guardian', 'sponsor', 'other')`,
    ),
    statusValid: check(
      'parent_links_status_valid',
      sql`${table.status} IN (
        'initiated', 'school_attested', 'parent_verified', 'active',
        'rejected', 'revoked', 'expired'
      )`,
    ),
    verifiedFactorValid: check(
      'parent_links_verified_factor_valid',
      sql`${table.verifiedByFactor} IS NULL OR ${table.verifiedByFactor} IN (
        'email_otp', 'phone_otp', 'document_review', 'platform_manual'
      )`,
    ),
  }),
);
