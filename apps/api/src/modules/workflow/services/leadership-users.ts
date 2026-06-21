import { staffRepository } from '../../hrm/repository/staff.repository.js';

export interface TenantLeadershipUserIds {
  ownerUserId: string | null;
  principalUserId: string | null;
}

export async function loadTenantLeadershipUserIds(
  tenantId: string,
): Promise<TenantLeadershipUserIds> {
  const [ownerUserId, principalUserId] = await Promise.all([
    staffRepository.findActivePrimaryUserIdForRole(tenantId, 'school_owner'),
    staffRepository.findActivePrimaryUserIdForRole(tenantId, 'principal'),
  ]);
  return { ownerUserId, principalUserId };
}
