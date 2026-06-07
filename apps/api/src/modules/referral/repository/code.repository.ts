import { and, desc, eq } from 'drizzle-orm';
import { referralCodes } from '../../../../drizzle/schema/referral.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const codeRepository = {
  async findByHash(tx: Executor, codeHash: string) {
    const [row] = await tx
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.codeHash, codeHash))
      .limit(1);
    return row ?? null;
  },

  async findActiveByParticipant(tx: Executor, participantId: string) {
    const [row] = await tx
      .select()
      .from(referralCodes)
      .where(
        and(eq(referralCodes.participantId, participantId), eq(referralCodes.status, 'active')),
      )
      .orderBy(desc(referralCodes.activatedAt))
      .limit(1);
    return row ?? null;
  },

  async findLatestByParticipant(tx: Executor, participantId: string) {
    const [row] = await tx
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.participantId, participantId))
      .orderBy(desc(referralCodes.createdAt))
      .limit(1);
    return row ?? null;
  },

  async create(tx: Executor, input: { participantId: string; codeHash: string; status: 'pending' | 'active' }) {
    const [row] = await tx
      .insert(referralCodes)
      .values({
        participantId: input.participantId,
        codeHash: input.codeHash,
        status: input.status,
        activatedAt: input.status === 'active' ? new Date() : null,
      })
      .returning();
    if (!row) throw new Error('Failed to create referral code');
    return row;
  },

  async activate(tx: Executor, id: string) {
    const [row] = await tx
      .update(referralCodes)
      .set({ status: 'active', activatedAt: new Date() })
      .where(eq(referralCodes.id, id))
      .returning();
    return row ?? null;
  },

  async markShownOnce(tx: Executor, id: string) {
    const [row] = await tx
      .update(referralCodes)
      .set({ shownOnceAt: new Date() })
      .where(eq(referralCodes.id, id))
      .returning();
    return row ?? null;
  },

  async revokeActiveForParticipant(tx: Executor, participantId: string) {
    return tx
      .update(referralCodes)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(
        and(eq(referralCodes.participantId, participantId), eq(referralCodes.status, 'active')),
      )
      .returning();
  },

  async findByHashGlobal(codeHash: string) {
    return withTenantContext(null, async (tx) => this.findByHash(tx, codeHash));
  },
};
