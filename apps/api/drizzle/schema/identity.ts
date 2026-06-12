import {
  boolean,
  char,
  index,
  inet,
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

export const identitySchema = pgSchema('identity');

export const users = identitySchema.table(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id'),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    passwordHash: text('password_hash').notNull(),
    role: varchar('role', { length: 50 }).notNull(),
    userVer: integer('user_ver').notNull().default(1),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    mfaRequired: boolean('mfa_required').notNull().default(false),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    displayName: varchar('display_name', { length: 200 }),
    photoStorageObjectId: uuid('photo_storage_object_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
    tenantEmailIdx: index('users_tenant_id_email_idx').on(table.tenantId, table.email),
  }),
);

export const userSessions = identitySchema.table(
  'user_sessions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    deviceId: uuid('device_id'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    platform: varchar('platform', { length: 20 }),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    idleExpiresAt: timestamp('idle_expires_at', { withTimezone: true }).notNull(),
    absExpiresAt: timestamp('abs_expires_at', { withTimezone: true }).notNull(),
    revoked: boolean('revoked').notNull().default(false),
    revokeReason: varchar('revoke_reason', { length: 50 }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeSessionsIdx: index('user_sessions_user_revoked_abs_idx').on(
      table.userId,
      table.revoked,
      table.absExpiresAt,
    ),
    userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
  }),
);

export const refreshTokens = identitySchema.table(
  'refresh_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => userSessions.id),
    deviceId: uuid('device_id'),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    familyId: uuid('family_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    revoked: boolean('revoked').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex('refresh_tokens_token_hash_unique').on(table.tokenHash),
    sessionIdIdx: index('refresh_tokens_session_id_idx').on(table.sessionId),
    familyIdIdx: index('refresh_tokens_family_id_idx').on(table.familyId),
  }),
);

export const registeredDevices = identitySchema.table(
  'registered_devices',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    deviceFingerprintHash: char('device_fingerprint_hash', { length: 64 }).notNull(),
    platform: varchar('platform', { length: 20 }).notNull(),
    registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    persistentTokenHash: char('persistent_token_hash', { length: 64 }),
    persistentTokenExpiresAt: timestamp('persistent_token_expires_at', { withTimezone: true }),
    revoked: boolean('revoked').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userFingerprintIdx: uniqueIndex('registered_devices_user_fingerprint_unique').on(
      table.userId,
      table.deviceFingerprintHash,
    ),
    userIdIdx: index('registered_devices_user_id_idx').on(table.userId),
  }),
);

export const mfaConfigs = identitySchema.table(
  'mfa_configs',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    encryptedSecret: text('encrypted_secret').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    backupCodesHash: jsonb('backup_codes_hash').$type<string[]>().notNull().default([]),
    usedBackupCodeIndexes: jsonb('used_backup_code_indexes').$type<number[]>().notNull().default([]),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex('mfa_configs_user_id_unique').on(table.userId),
  }),
);

export const loginAttempts = identitySchema.table(
  'login_attempts',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    email: varchar('email', { length: 255 }).notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    success: boolean('success').notNull(),
    failureReason: varchar('failure_reason', { length: 50 }),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailAttemptedAtIdx: index('login_attempts_email_attempted_at_idx').on(
      table.email,
      table.attemptedAt,
    ),
  }),
);

export const passwordResetOtps = identitySchema.table(
  'password_reset_otps',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    otpHash: text('otp_hash').notNull(),
    channel: varchar('channel', { length: 10 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('password_reset_otps_user_id_idx').on(table.userId),
    expiresAtIdx: index('password_reset_otps_expires_at_idx').on(table.expiresAt),
  }),
);
