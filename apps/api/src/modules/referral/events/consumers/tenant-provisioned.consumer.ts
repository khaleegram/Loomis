import type { TenantProvisionedEvent } from '../../../tenant/events/types.js';
import { attributionService } from '../../services/attribution.service.js';

export async function handleTenantProvisioned(event: TenantProvisionedEvent): Promise<void> {
  if (!event.referralCode) return;

  const onboardingSource =
    event.provisionedById !== undefined ? ('platform' as const) : ('self_registration' as const);

  try {
    await attributionService.createAttributionForTenant({
      tenantId: event.tenantId,
      rawReferralCode: event.referralCode,
      onboardingSource,
      actorUserId: event.provisionedById,
    });
  } catch {
    // Invalid codes are flagged for Platform Operations at provisioning time (US-PLT-001).
  }
}
