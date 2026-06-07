import { and, desc, eq } from 'drizzle-orm';
import { attributions } from '../../../../drizzle/schema/referral.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { AttributionOnboardingSource, AttributionStatus } from '@loomis/contracts';

export const attributionRepository = {
  async findByTenant(tx: Executor, tenantId: string) {
    const [row] = await tx
      .select()
      .from(attributions)
      .where(eq(attributions.tenantId, tenantId))
      .limit(1);
    return row ?? null;
  },

  async findByTenantGlobal(tenantId: string) {
    return withTenantContext(tenantId, async (tx) => this.findByTenant(tx, tenantId));
  },

  async create(
    tx: Executor,
    input: {
      tenantId: string;
      referralCodeId: string;
      directParticipantId: string;
      managerParticipantId?: string | null;
      onboardingSource: AttributionOnboardingSource;
      status?: AttributionStatus;
      flagReason?: string | null;
    },
  ) {
    const [row] = await tx
      .insert(attributions)
      .values({
        tenantId: input.tenantId,
        referralCodeId: input.referralCodeId,
        directParticipantId: input.directParticipantId,
        managerParticipantId: input.managerParticipantId ?? null,
        onboardingSource: input.onboardingSource,
        status: input.status ?? 'active',
        flagReason: input.flagReason ?? null,
      })
      .returning();
    if (!row) throw new Error('Failed to create attribution');
    return row;
  },

  async updateStatus(
    tx: Executor,
    id: string,
    status: AttributionStatus,
    flagReason?: string | null,
  ) {
    const [row] = await tx
      .update(attributions)
      .set({ status, flagReason: flagReason ?? null, updatedAt: new Date() })
      .where(eq(attributions.id, id))
      .returning();
    return row ?? null;
  },

  async listAll(tx: Executor, status?: AttributionStatus) {
    const conditions = status ? [eq(attributions.status, status)] : [];
    return tx
      .select()
      .from(attributions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(attributions.attributedAt));
  },

  async listForParticipant(tx: Executor, participantId: string) {
    return tx
      .select()
      .from(attributions)
      .where(
        and(
          eq(attributions.directParticipantId, participantId),
          eq(attributions.status, 'active'),
        ),
      );
  },

  async listPlatform(status?: AttributionStatus) {
    return withTenantContext(null, async (tx) => this.listAll(tx, status));
  },
};
