import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
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
import { users } from './identity';
import { tenants } from './tenant';

export const hrmSchema = pgSchema('hrm');

/**
 * Tenant-bound staff profile. Assignment history is kept in separate append-style
 * tables so profile deactivation never erases historical academic attribution.
 */
export const staffProfiles = hrmSchema.table(
  'staff_profiles',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    notificationPreferences: jsonb('notification_preferences')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    deactivatedById: uuid('deactivated_by_id'),
    deactivationReason: varchar('deactivation_reason', { length: 500 }),
    reactivatedAt: timestamp('reactivated_at', { withTimezone: true }),
    reactivatedById: uuid('reactivated_by_id'),
    createdById: uuid('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantUserUnique: uniqueIndex('staff_profiles_tenant_id_user_id_unique').on(
      table.tenantId,
      table.userId,
    ),
    tenantEmailUnique: uniqueIndex('staff_profiles_tenant_id_email_unique').on(
      table.tenantId,
      table.email,
    ),
    tenantStatusIdx: index('staff_profiles_tenant_id_status_idx').on(table.tenantId, table.status),
    statusValid: check(
      'staff_profiles_status_valid',
      sql`${table.status} IN ('pending', 'active', 'deactivated')`,
    ),
  }),
);

export const roleAssignments = hrmSchema.table(
  'role_assignments',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    staffProfileId: uuid('staff_profile_id')
      .notNull()
      .references(() => staffProfiles.id),
    role: varchar('role', { length: 50 }).notNull(),
    assignmentType: varchar('assignment_type', { length: 20 }).notNull(),
    primaryStaffProfileId: uuid('primary_staff_profile_id').references(() => staffProfiles.id),
    active: boolean('active').notNull().default(true),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    approvedById: uuid('approved_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    staffActiveIdx: index('role_assignments_staff_profile_id_active_idx').on(
      table.staffProfileId,
      table.active,
    ),
    tenantRoleActiveIdx: index('role_assignments_tenant_id_role_active_idx').on(
      table.tenantId,
      table.role,
      table.active,
    ),
    typeValid: check(
      'role_assignments_type_valid',
      sql`${table.assignmentType} IN ('primary', 'extension', 'backup', 'deputy')`,
    ),
  }),
);

export const subjectAssignments = hrmSchema.table(
  'subject_assignments',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    staffProfileId: uuid('staff_profile_id')
      .notNull()
      .references(() => staffProfiles.id),
    // Academic module is not built yet; these become FKs/read-model references there.
    termId: uuid('term_id').notNull(),
    classArmId: uuid('class_arm_id').notNull(),
    subjectId: uuid('subject_id').notNull(),
    active: boolean('active').notNull().default(true),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    assignedById: uuid('assigned_by_id').notNull(),
    approvedById: uuid('approved_by_id').notNull(),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    removedById: uuid('removed_by_id'),
    removalReason: varchar('removal_reason', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    teacherTermIdx: index('subject_assignments_staff_profile_id_term_id_idx').on(
      table.staffProfileId,
      table.termId,
    ),
    classSubjectIdx: index('subject_assignments_term_class_subject_idx').on(
      table.termId,
      table.classArmId,
      table.subjectId,
    ),
  }),
);

export const classTeacherAssignments = hrmSchema.table(
  'classteacher_assignments',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    staffProfileId: uuid('staff_profile_id')
      .notNull()
      .references(() => staffProfiles.id),
    termId: uuid('term_id').notNull(),
    classArmId: uuid('class_arm_id').notNull(),
    active: boolean('active').notNull().default(true),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    assignedById: uuid('assigned_by_id').notNull(),
    replacedAssignmentId: uuid('replaced_assignment_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    termClassIdx: index('classteacher_assignments_term_id_class_arm_id_idx').on(
      table.termId,
      table.classArmId,
    ),
    teacherTermIdx: index('classteacher_assignments_staff_profile_id_term_id_idx').on(
      table.staffProfileId,
      table.termId,
    ),
  }),
);

export const staffInvitations = hrmSchema.table(
  'staff_invitations',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    staffProfileId: uuid('staff_profile_id')
      .notNull()
      .references(() => staffProfiles.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    email: varchar('email', { length: 255 }).notNull(),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    invitedById: uuid('invited_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex('staff_invitations_token_hash_unique').on(table.tokenHash),
    staffIdx: index('staff_invitations_staff_profile_id_idx').on(table.staffProfileId),
    tenantEmailIdx: index('staff_invitations_tenant_id_email_idx').on(table.tenantId, table.email),
  }),
);
