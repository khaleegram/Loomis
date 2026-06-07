import { eq } from 'drizzle-orm';
import { tenants } from '../../../../drizzle/schema/tenant.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const tenantScopeRepository = {
  async listActiveTenantIds(tx: Executor): Promise<string[]> {
    const rows = await tx
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.status, 'active'));
    return rows.map((r) => r.id);
  },

  async listActiveTenantIdsGlobal(): Promise<string[]> {
    return withTenantContext(null, async (tx) => this.listActiveTenantIds(tx));
  },
};
