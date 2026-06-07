import { earningService } from '../../services/earning.service.js';

function extractTenantId(event: unknown): string | null {
  if (!event || typeof event !== 'object') return null;
  const e = event as Record<string, unknown>;
  if (typeof e.tenantId === 'string') return e.tenantId;
  if (e.payload && typeof e.payload === 'object') {
    const payload = e.payload as Record<string, unknown>;
    if (typeof payload.tenantId === 'string') return payload.tenantId;
  }
  return null;
}

export async function handleIvpCaseOpened(event: unknown): Promise<void> {
  const tenantId = extractTenantId(event);
  if (!tenantId) return;
  await earningService.holdEarningsForTenant(tenantId, 'ivp_case');
}

export async function handleIvpCaseClosed(event: unknown): Promise<void> {
  const tenantId = extractTenantId(event);
  if (!tenantId) return;
  await earningService.releaseHeldEarningsForTenant(tenantId);
}
