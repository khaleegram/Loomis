import { and, eq } from 'drizzle-orm';
import { refreshTokens } from '../../../../drizzle/schema/identity.js';
import { db, type Executor } from '../../../shared/db.js';
import type { CreateRefreshTokenInput } from '../types.js';

export const tokenRepository = {
  async findByHash(tokenHash: string) {
    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    return token ?? null;
  },

  async findById(tokenId: string) {
    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, tokenId))
      .limit(1);
    return token ?? null;
  },

  async create(input: CreateRefreshTokenInput, tx?: Executor) {
    const executor = tx ?? db;
    const [token] = await executor
      .insert(refreshTokens)
      .values({
        userId: input.userId,
        sessionId: input.sessionId,
        deviceId: input.deviceId ?? null,
        tokenHash: input.tokenHash,
        familyId: input.familyId,
        expiresAt: input.expiresAt,
      })
      .returning();
    if (!token) throw new Error('Failed to create refresh token');
    return token;
  },

  async markUsed(tokenId: string, tx?: Executor) {
    const executor = tx ?? db;
    const [token] = await executor
      .update(refreshTokens)
      .set({ usedAt: new Date() })
      .where(eq(refreshTokens.id, tokenId))
      .returning();
    return token ?? null;
  },

  async revoke(tokenId: string, tx?: Executor) {
    const executor = tx ?? db;
    const [token] = await executor
      .update(refreshTokens)
      .set({
        revoked: true,
        revokedAt: new Date(),
      })
      .where(eq(refreshTokens.id, tokenId))
      .returning();
    return token ?? null;
  },

  async revokeFamily(familyId: string, tx?: Executor) {
    const executor = tx ?? db;
    return executor
      .update(refreshTokens)
      .set({
        revoked: true,
        revokedAt: new Date(),
      })
      .where(
        and(eq(refreshTokens.familyId, familyId), eq(refreshTokens.revoked, false)),
      )
      .returning();
  },

  async revokeBySessionId(sessionId: string, tx?: Executor) {
    const executor = tx ?? db;
    return executor
      .update(refreshTokens)
      .set({
        revoked: true,
        revokedAt: new Date(),
      })
      .where(
        and(eq(refreshTokens.sessionId, sessionId), eq(refreshTokens.revoked, false)),
      )
      .returning();
  },
};
