import { eq } from 'drizzle-orm';
import { tenantContacts } from '../../../../drizzle/schema/tenant.js';
import { db, type Executor } from '../../../shared/db.js';
import type { TenantContactInput } from '@loomis/contracts';

export const tenantContactRepository = {
  async listByTenantId(tenantId: string, tx?: Executor) {
    const executor = tx ?? db;
    return executor
      .select()
      .from(tenantContacts)
      .where(eq(tenantContacts.tenantId, tenantId))
      .orderBy(tenantContacts.isPrimary, tenantContacts.createdAt);
  },

  async replaceForTenant(
    tenantId: string,
    contacts: TenantContactInput[],
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    await executor.delete(tenantContacts).where(eq(tenantContacts.tenantId, tenantId));

    if (contacts.length === 0) return [];

    const rows = await executor
      .insert(tenantContacts)
      .values(
        contacts.map((contact) => ({
          tenantId,
          role: contact.role,
          fullName: contact.fullName ?? null,
          email: contact.email,
          phone: contact.phone ?? null,
          isPrimary: contact.isPrimary === true || contact.role === 'primary',
        })),
      )
      .returning();
    return rows;
  },
};
