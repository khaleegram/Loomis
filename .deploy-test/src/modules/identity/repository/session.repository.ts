import { and, asc, desc, eq, gt } from 'drizzle-orm';
import { userSessions } from '../../../../drizzle/schema/identity.js';
import { db, type Executor } from '../../../shared/db.js';
import type { CreateSessionInput, SessionRevokeReason } from '../types.js';

export const sessionRepository = {
  async findById(sessionId: string) {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, sessionId))
      .limit(1);
    return session ?? null;
  },

  async create(input: CreateSessionInput, tx?: Executor) {
    const executor = tx ?? db;
    const [session] = await executor
      .insert(userSessions)
      .values({
        userId: input.userId,
        deviceId: input.deviceId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        platform: input.platform ?? null,
        idleExpiresAt: input.idleExpiresAt,
        absExpiresAt: input.absExpiresAt,
      })
      .returning();
    if (!session) throw new Error('Failed to create session');
    return session;
  },

  async listActiveByUserId(userId: string) {
    const now = new Date();
    return db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.revoked, false),
          gt(userSessions.absExpiresAt, now),
        ),
      )
      .orderBy(asc(userSessions.issuedAt));
  },

  async countActiveByUserId(userId: string) {
    const sessions = await this.listActiveByUserId(userId);
    return sessions.length;
  },

  async findOldestActiveSession(userId: string) {
    const sessions = await this.listActiveByUserId(userId);
    return sessions[0] ?? null;
  },

  /** Latest activity timestamp across all sessions (including revoked) for deputy-exam 72h rule. */
  async findLatestLastActiveAt(userId: string): Promise<Date | null> {
    const [row] = await db
      .select({ lastActiveAt: userSessions.lastActiveAt })
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.lastActiveAt))
      .limit(1);
    return row?.lastActiveAt ?? null;
  },

  async touchActivity(sessionId: string, idleExpiresAt: Date, tx?: Executor) {
    const executor = tx ?? db;
    const [session] = await executor
      .update(userSessions)
      .set({
        lastActiveAt: new Date(),
        idleExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(userSessions.id, sessionId))
      .returning();
    return session ?? null;
  },

  async revoke(
    sessionId: string,
    reason: SessionRevokeReason,
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const [session] = await executor
      .update(userSessions)
      .set({
        revoked: true,
        revokeReason: reason,
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSessions.id, sessionId))
      .returning();
    return session ?? null;
  },

  async revokeAllForUser(
    userId: string,
    reason: SessionRevokeReason,
    exceptSessionId?: string,
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const active = await this.listActiveByUserId(userId);
    const toRevoke = exceptSessionId
      ? active.filter((s) => s.id !== exceptSessionId)
      : active;

    const revoked: typeof active = [];
    for (const session of toRevoke) {
      const updated = await this.revoke(session.id, reason, executor);
      if (updated) revoked.push(updated);
    }
    return revoked;
  },
};
