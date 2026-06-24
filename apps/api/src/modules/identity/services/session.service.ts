import { LoomisError } from '../../../shared/errors.js';
import type { Executor } from '../../../shared/db.js';
import { sessionRepository } from '../repository/session.repository.js';
import { tokenRepository } from '../repository/token.repository.js';
import type { DevicePlatform, SessionRevokeReason } from '../types.js';

const MAX_CONCURRENT_SESSIONS = 5;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Idle vs absolute timeout policy (SEC-AUTH-011, System Design §5.4).
 * - Web:    idle 30m, absolute 8h.
 * - Mobile: idle 60m, absolute 30d (refresh-token lifetime).
 * Refreshing slides the idle clock but never extends the absolute deadline.
 */
const TIMEOUT_POLICY: Record<DevicePlatform, { idleMs: number; absMs: number }> = {
  web: { idleMs: 30 * MINUTE_MS, absMs: 8 * HOUR_MS },
  ios: { idleMs: 60 * MINUTE_MS, absMs: 30 * DAY_MS },
  android: { idleMs: 60 * MINUTE_MS, absMs: 30 * DAY_MS },
};

export interface SessionContext {
  platform: DevicePlatform;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateSessionResult {
  session: Awaited<ReturnType<typeof sessionRepository.create>>;
  /** Session displaced by the concurrent-session limit, if any (US-XC-005). */
  displacedSessionId: string | null;
}

export const sessionService = {
  timeoutPolicy(platform: DevicePlatform) {
    return TIMEOUT_POLICY[platform] ?? TIMEOUT_POLICY.web;
  },

  /**
   * Creates a session, enforcing the five-session concurrent limit (SEC-AUTH-010).
   * If the user already holds five active sessions, the oldest is soft-revoked and
   * its refresh tokens are invalidated before the new session is issued.
   */
  async createSession(userId: string, ctx: SessionContext, tx?: Executor): Promise<CreateSessionResult> {
    const policy = this.timeoutPolicy(ctx.platform);
    const now = Date.now();

    let displacedSessionId: string | null = null;
    const active = await sessionRepository.listActiveByUserId(userId);
    if (active.length >= MAX_CONCURRENT_SESSIONS) {
      const oldest = active[0];
      if (oldest) {
        await this.revokeSession(oldest.id, 'concurrent_limit', tx);
        displacedSessionId = oldest.id;
      }
    }

    const session = await sessionRepository.create(
      {
        userId,
        platform: ctx.platform,
        idleExpiresAt: new Date(now + policy.idleMs),
        absExpiresAt: new Date(now + policy.absMs),
        ...(ctx.deviceId !== undefined ? { deviceId: ctx.deviceId } : {}),
        ...(ctx.ipAddress !== undefined ? { ipAddress: ctx.ipAddress } : {}),
        ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
      },
      tx,
    );

    return { session, displacedSessionId };
  },

  /**
   * Returns an active, non-revoked, non-expired session — or throws.
   * Used by the authenticate middleware so a revoked session row immediately
   * invalidates the access token tied to it.
   */
  async assertActiveSession(sessionId: string) {
    const session = await sessionRepository.findById(sessionId);
    const now = new Date();
    if (
      !session ||
      session.revoked ||
      session.absExpiresAt <= now ||
      session.idleExpiresAt <= now
    ) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Session is no longer active');
    }
    return session;
  },

  /** Slides the idle deadline forward on activity, capped at the absolute deadline. */
  async slideIdle(sessionId: string, platform: DevicePlatform, absExpiresAt: Date, tx?: Executor) {
    const policy = this.timeoutPolicy(platform);
    const proposed = new Date(Date.now() + policy.idleMs);
    const next = proposed > absExpiresAt ? absExpiresAt : proposed;
    return sessionRepository.touchActivity(sessionId, next, tx);
  },

  async revokeSession(sessionId: string, reason: SessionRevokeReason, tx?: Executor) {
    const revoked = await sessionRepository.revoke(sessionId, reason, tx);
    // Tear down refresh tokens bound to the session so they cannot be rotated.
    await tokenRepository.revokeBySessionId(sessionId, tx);
    return revoked;
  },

  async revokeAllForUser(
    userId: string,
    reason: SessionRevokeReason,
    exceptSessionId?: string,
    tx?: Executor,
  ) {
    const revoked = await sessionRepository.revokeAllForUser(userId, reason, exceptSessionId, tx);
    for (const session of revoked) {
      await tokenRepository.revokeBySessionId(session.id, tx);
    }
    return revoked;
  },

  /** Lists active sessions for the security settings page (US-HRM-008). */
  async listActiveSessionsForUser(userId: string, currentSessionId: string) {
    const sessions = await sessionRepository.listActiveByUserId(userId);
    return sessions.map((session) => ({
      id: session.id,
      platform: session.platform as DevicePlatform | null,
      ipAddress: session.ipAddress ?? null,
      userAgent: session.userAgent ?? null,
      issuedAt: session.issuedAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
      idleExpiresAt: session.idleExpiresAt.toISOString(),
      absExpiresAt: session.absExpiresAt.toISOString(),
      isCurrent: session.id === currentSessionId,
    }));
  },

  /** User-initiated revocation from security settings (US-HRM-008). */
  async revokeSessionForUser(userId: string, sessionId: string) {
    const session = await sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new LoomisError('NOT_FOUND', 404, 'Session not found');
    }
    if (session.revoked) return session;
    const revoked = await this.revokeSession(sessionId, 'user_revoke');
    if (!revoked) {
      throw new LoomisError('NOT_FOUND', 404, 'Session not found');
    }
    return revoked;
  },
};
