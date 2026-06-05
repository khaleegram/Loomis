import { and, eq } from 'drizzle-orm';
import { configurations } from '../../../../drizzle/schema/tenant.js';
import { db } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { UpsertConfigurationInput } from '../types.js';

/**
 * Tenant configuration is tenant-bound — every query sets the tenant context so
 * the RLS policy on `tenant_id` enforces isolation (loomis-database/security).
 */
export const configurationRepository = {
  async list(tenantId: string) {
    return withTenantContext(tenantId, async () =>
      db.select().from(configurations).where(eq(configurations.tenantId, tenantId)),
    );
  },

  async findByKey(tenantId: string, key: string) {
    return withTenantContext(tenantId, async () => {
      const [config] = await db
        .select()
        .from(configurations)
        .where(and(eq(configurations.tenantId, tenantId), eq(configurations.key, key)))
        .limit(1);
      return config ?? null;
    });
  },

  async upsert(tenantId: string, input: UpsertConfigurationInput) {
    return withTenantContext(tenantId, async () => {
      const [config] = await db
        .insert(configurations)
        .values({ tenantId, key: input.key, value: input.value })
        .onConflictDoUpdate({
          target: [configurations.tenantId, configurations.key],
          set: { value: input.value, updatedAt: new Date() },
        })
        .returning();
      if (!config) throw new Error('Failed to upsert configuration');
      return config;
    });
  },
};
