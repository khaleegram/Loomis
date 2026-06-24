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

function resolvePrimaryContact(contacts: TenantContactInput[]): TenantContactInput {
  const primary =
    contacts.find((contact) => contact.isPrimary === true || contact.role === 'primary') ??
    contacts[0]!;
  return { ...primary, role: 'primary', isPrimary: true };
}

export const tenantContactService = {
  async listContacts(tenantId: string): Promise<TenantContact[]> {
    const rows = await tenantContactRepository.listByTenantId(tenantId);
    return rows.map(toContactResponse);
  },

  async replaceContacts(tenantId: string, contacts: TenantContactInput[]): Promise<TenantContact[]> {
    const primary = resolvePrimaryContact(contacts);
    const normalized = contacts.map((contact) => ({
      ...contact,
      isPrimary: contact.email === primary.email && contact.role === primary.role,
      role:
        contact.email === primary.email && contact.role === primary.role
          ? ('primary' as const)
          : contact.role,
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
