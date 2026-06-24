import { and, desc, eq, inArray } from 'drizzle-orm';
import { participants } from '../../../../drizzle/schema/referral.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { ParticipantStatus, ParticipantType } from '@loomis/contracts';

export const participantRepository = {
  async findById(tx: Executor, id: string) {
    const [row] = await tx.select().from(participants).where(eq(participants.id, id)).limit(1);
    return row ?? null;
  },

  async findByUserId(tx: Executor, userId: string) {
    const [row] = await tx
      .select()
      .from(participants)
      .where(eq(participants.userId, userId))
      .limit(1);
    return row ?? null;
  },

  async findByUserIdGlobal(userId: string) {
    return withTenantContext(null, async (tx) => this.findByUserId(tx, userId));
  },

  async findByIdGlobal(id: string) {
    return withTenantContext(null, async (tx) => this.findById(tx, id));
  },

  async create(
    tx: Executor,
    input: {
      userId: string;
      participantType: ParticipantType;
      managerParticipantId?: string | null;
      region?: string | null;
      status?: ParticipantStatus;
    },
  ) {
    const [row] = await tx
      .insert(participants)
      .values({
        userId: input.userId,
        participantType: input.participantType,
        managerParticipantId: input.managerParticipantId ?? null,
        region: input.region ?? null,
        status: input.status ?? 'pending_kyc',
      })
      .returning();
    if (!row) throw new Error('Failed to create participant');
    return row;
  },

  async listSubordinates(tx: Executor, managerParticipantId: string) {
    return tx
      .select()
      .from(participants)
      .where(eq(participants.managerParticipantId, managerParticipantId))
      .orderBy(desc(participants.createdAt));
  },

  async activate(tx: Executor, id: string) {
    const [row] = await tx
      .update(participants)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(participants.id, id))
      .returning();
    return row ?? null;
  },

  async deactivate(tx: Executor, id: string, reason: string) {
    const [row] = await tx
      .update(participants)
      .set({
        status: 'deactivated',
        deactivatedAt: new Date(),
        deactivationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(participants.id, id))
      .returning();
    return row ?? null;
  },

  async isSubordinateOf(
    tx: Executor,
    subordinateParticipantId: string,
    managerUserId: string,
  ): Promise<boolean> {
    const subordinate = await this.findById(tx, subordinateParticipantId);
    if (!subordinate?.managerParticipantId) return false;
    const manager = await this.findById(tx, subordinate.managerParticipantId);
    return manager?.userId === managerUserId;
  },

  async listSubordinateIds(tx: Executor, managerParticipantId: string): Promise<string[]> {
    const rows = await tx
      .select({ id: participants.id })
      .from(participants)
      .where(eq(participants.managerParticipantId, managerParticipantId));
    return rows.map((r) => r.id);
  },

  async findActiveManagers(tx: Executor) {
    return tx
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.participantType, 'regional_manager'),
          inArray(participants.status, ['pending_kyc', 'active']),
        ),
      );
  },
};
