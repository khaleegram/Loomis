import { sql } from 'drizzle-orm';
import { db } from './db.js';

/**
 * Sets `app.current_tenant_id` on the connection before executing tenant-bound queries.
 * Identity tables are user-scoped; use this when querying tenant-bound tables in other modules.
 */
export async function withTenantContext<T>(
  tenantId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  if (tenantId === null) {
    await db.execute(sql`SELECT set_config('app.current_tenant_id', '', false)`);
  } else {
    await db.execute(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`,
    );
  }
  return fn();
}
