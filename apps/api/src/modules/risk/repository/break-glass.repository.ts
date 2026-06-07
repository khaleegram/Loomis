import { and, eq, gt, lt } from 'drizzle-orm';
import { roleAssignments, staffProfiles } from '../../../../drizzle/schema/hrm.js';
import { breakGlassSessions } from '../../../../drizzle/schema/risk.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const breakGlassRepository = {
  async create(
    input: {
      tenantId: string;
      supportUserId: string;
      supportTicketId: string;
      expiresAt: Date;
    },
    tx?: Executor,
  ) {
    const run = async (executor: Executor) => {
      const [row] = await executor
        .insert(breakGlassSessions)
        .values({
          tenantId: input.tenantId,
          supportUserId: input.supportUserId,
          supportTicketId: input.supportTicketId,
          expiresAt: input.expiresAt,
          status: 'active',
        })
        .returning();
      if (!row) throw new Error('Failed to create break-glass session');
      return row;
    };
    if (tx) return run(tx);
    return withTenantContext(input.tenantId, run);
  },

  async findActiveForTenant(tenantId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [row] = await tx
        .select()
        .from(breakGlassSessions)
        .where(
          and(
            eq(breakGlassSessions.tenantId, tenantId),
            eq(breakGlassSessions.status, 'active'),
            gt(breakGlassSessions.expiresAt, now),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async findActiveForSupportUser(supportUserId: string, tenantId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [row] = await tx
        .select()
        .from(breakGlassSessions)
        .where(
          and(
            eq(breakGlassSessions.tenantId, tenantId),
            eq(breakGlassSessions.supportUserId, supportUserId),
            eq(breakGlassSessions.status, 'active'),
            gt(breakGlassSessions.expiresAt, now),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async expireStale() {
    return withTenantContext(null, async (tx) => {
      const now = new Date();
      return tx
        .update(breakGlassSessions)
        .set({ status: 'expired' })
        .where(
          and(eq(breakGlassSessions.status, 'active'), lt(breakGlassSessions.expiresAt, now)),
        )
        .returning({ id: breakGlassSessions.id });
    });
  },

  async revoke(tenantId: string, sessionId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .update(breakGlassSessions)
        .set({ status: 'revoked', revokedAt: new Date() })
        .where(
          and(eq(breakGlassSessions.id, sessionId), eq(breakGlassSessions.tenantId, tenantId)),
        )
        .returning();
      return row ?? null;
    });
  },

  async markOwnerNotified(sessionId: string) {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .update(breakGlassSessions)
        .set({ ownerNotifiedAt: new Date() })
        .where(eq(breakGlassSessions.id, sessionId))
        .returning();
      return row ?? null;
    });
  },

  async findSchoolOwnerUserId(tenantId: string): Promise<string | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({ userId: staffProfiles.userId })
        .from(roleAssignments)
        .innerJoin(staffProfiles, eq(staffProfiles.id, roleAssignments.staffProfileId))
        .where(
          and(
            eq(roleAssignments.tenantId, tenantId),
            eq(roleAssignments.role, 'school_owner'),
            eq(roleAssignments.active, true),
            eq(staffProfiles.status, 'active'),
          ),
        )
        .limit(1);
      return row?.userId ?? null;
    });
  },
};
