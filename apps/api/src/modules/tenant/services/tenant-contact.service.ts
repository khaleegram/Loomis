import type { TenantContact, TenantContactInput } from '@loomis/contracts';
import { tenantContactRepository } from '../repository/tenant-contact.repository.js';
import { tenantRepository } from '../repository/tenant.repository.js';

function toContactResponse(row: Awaited<
  ReturnType<typeof tenantContactRepository.listByTenantId>
>[number]): TenantContact {
  return {
    id: row.id,
    role: row.role as TenantContact['role'],
    fullName: row.fullName ?? undefined,
    email: row.email,
    phone: row.phone ?? undefined,
    isPrimary: row.isPrimary,
  };
}

/**
 * The primary contact is whichever row the caller flagged `isPrimary`, falling
 * back to a `primary`-role row, then the first contact. Selecting by index (not
 * by email/role) is what guarantees exactly one primary survives — comparing on
 * the role-rewritten copy previously dropped the flag for proprietor/billing
 * primaries and saved zero primaries, which locked the edit form.
 */
function resolvePrimaryIndex(contacts: TenantContactInput[]): number {
  const flagged = contacts.findIndex((contact) => contact.isPrimary === true);
  if (flagged >= 0) return flagged;
  const byRole = contacts.findIndex((contact) => contact.role === 'primary');
  if (byRole >= 0) return byRole;
  return 0;
}

export const tenantContactService = {
  async listContacts(tenantId: string): Promise<TenantContact[]> {
    const rows = await tenantContactRepository.listByTenantId(tenantId);
    return rows.map(toContactResponse);
  },

  async replaceContacts(tenantId: string, contacts: TenantContactInput[]): Promise<TenantContact[]> {
    const primaryIndex = resolvePrimaryIndex(contacts);
    const primary = contacts[primaryIndex]!;
    const normalized = contacts.map((contact, index) => ({
      ...contact,
      isPrimary: index === primaryIndex,
      role: index === primaryIndex ? ('primary' as const) : contact.role,
    }));

    const rows = await tenantContactRepository.replaceForTenant(tenantId, normalized);
    await tenantRepository.updateProfile(tenantId, {
      contactEmail: primary.email,
      contactPhone: primary.phone,
    });
    return rows.map(toContactResponse);
  },

  async seedFromProvision(
    tenantId: string,
    input: {
      contactEmail: string;
      contactPhone: string;
      contacts?: TenantContactInput[];
    },
  ): Promise<void> {
    const contacts =
      input.contacts && input.contacts.length > 0
        ? input.contacts
        : [
            {
              role: 'primary' as const,
              email: input.contactEmail,
              phone: input.contactPhone,
              isPrimary: true,
            },
          ];
    await this.replaceContacts(tenantId, contacts);
  },
};
