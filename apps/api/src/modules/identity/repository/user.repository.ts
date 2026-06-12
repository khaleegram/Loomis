import { and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import {
  loginAttempts,
  passwordResetOtps,
  users,
} from '../../../../drizzle/schema/identity.js';
import { db, type Executor } from '../../../shared/db.js';
import type {
  CreateLoginAttemptInput,
  CreatePasswordResetOtpInput,
  CreateUserInput,
  UserStatus,
} from '../types.js';

const LOCKOUT_WINDOW_MINUTES = 10;
const LOCKOUT_THRESHOLD = 5;

export const userRepository = {
  async findById(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  },

  async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user ?? null;
  },

  async create(input: CreateUserInput, tx?: Executor) {
    const executor = tx ?? db;
    const [user] = await executor
      .insert(users)
      .values({
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        role: input.role,
        tenantId: input.tenantId,
        mfaRequired: input.mfaRequired,
        status: input.status ?? 'active',
        phone: input.phone ?? null,
        mustChangePassword: input.mustChangePassword ?? false,
        displayName: input.displayName ?? null,
      })
      .returning();
    if (!user) throw new Error('Failed to create user');
    return user;
  },

  async updatePasswordHash(userId: string, passwordHash: string, tx?: Executor) {
    const executor = tx ?? db;
    const [user] = await executor
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
        userVer: sql`${users.userVer} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user ?? null;
  },

  async activatePendingUser(userId: string, passwordHash: string, tx?: Executor) {
    const executor = tx ?? db;
    const [user] = await executor
      .update(users)
      .set({
        passwordHash,
        status: 'active',
        userVer: sql`${users.userVer} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.status, 'pending')))
      .returning();
    return user ?? null;
  },

  async updateRole(userId: string, role: string, tx?: Executor) {
    const executor = tx ?? db;
    const [user] = await executor
      .update(users)
      .set({
        role,
        userVer: sql`${users.userVer} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user ?? null;
  },

  async incrementUserVer(userId: string, tx?: Executor) {
    const executor = tx ?? db;
    const [user] = await executor
      .update(users)
      .set({
        userVer: sql`${users.userVer} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user ?? null;
  },

  async setStatus(userId: string, status: UserStatus, lockedUntil?: Date | null, tx?: Executor) {
    const executor = tx ?? db;
    const [user] = await executor
      .update(users)
      .set({
        status,
        lockedUntil: lockedUntil ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user ?? null;
  },

  async updateProfile(
    userId: string,
    fields: { displayName?: string; email?: string; photoStorageObjectId?: string | null },
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (fields.displayName !== undefined) set.displayName = fields.displayName;
    if (fields.email !== undefined) set.email = fields.email.toLowerCase();
    if (fields.photoStorageObjectId !== undefined) set.photoStorageObjectId = fields.photoStorageObjectId;
    const [user] = await executor
      .update(users)
      .set(set)
      .where(eq(users.id, userId))
      .returning();
    return user ?? null;
  },

  async getUserVer(userId: string) {
    const [row] = await db
      .select({ userVer: users.userVer })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row?.userVer ?? null;
  },

  async recordLoginAttempt(input: CreateLoginAttemptInput, tx?: Executor) {
    const executor = tx ?? db;
    const [attempt] = await executor
      .insert(loginAttempts)
      .values({
        email: input.email.toLowerCase(),
        success: input.success,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        failureReason: input.failureReason ?? null,
      })
      .returning();
    if (!attempt) throw new Error('Failed to record login attempt');
    return attempt;
  },

  async countRecentFailedAttempts(email: string, since: Date) {
    const [row] = await db
      .select({ total: count() })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, email.toLowerCase()),
          eq(loginAttempts.success, false),
          gte(loginAttempts.attemptedAt, since),
        ),
      );
    return row?.total ?? 0;
  },

  async isAccountLocked(email: string): Promise<boolean> {
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);
    const failures = await this.countRecentFailedAttempts(email, windowStart);
    if (failures >= LOCKOUT_THRESHOLD) return true;

    const user = await this.findByEmail(email);
    if (!user) return false;
    if (user.status === 'locked' && user.lockedUntil && user.lockedUntil > new Date()) {
      return true;
    }
    return false;
  },

  async createPasswordResetOtp(input: CreatePasswordResetOtpInput, tx?: Executor) {
    const executor = tx ?? db;
    const [otp] = await executor
      .insert(passwordResetOtps)
      .values({
        userId: input.userId,
        otpHash: input.otpHash,
        channel: input.channel,
        expiresAt: input.expiresAt,
      })
      .returning();
    if (!otp) throw new Error('Failed to create password reset OTP');
    return otp;
  },

  async findActivePasswordResetOtp(otpId: string) {
    const [otp] = await db
      .select()
      .from(passwordResetOtps)
      .where(and(eq(passwordResetOtps.id, otpId), isNull(passwordResetOtps.usedAt)))
      .limit(1);
    if (!otp || otp.expiresAt <= new Date()) return null;
    return otp;
  },

  async markPasswordResetOtpUsed(otpId: string, tx?: Executor) {
    const executor = tx ?? db;
    const [otp] = await executor
      .update(passwordResetOtps)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetOtps.id, otpId))
      .returning();
    return otp ?? null;
  },

  async listRecentLoginAttempts(email: string, limit = 20) {
    return db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.email, email.toLowerCase()))
      .orderBy(desc(loginAttempts.attemptedAt))
      .limit(limit);
  },
};
