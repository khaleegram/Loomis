import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FinanceMode } from '@loomis/contracts';
import { can, effectiveCan, type Capability } from '@loomis/core';
import { tenantRepository } from '../modules/tenant/repository/tenant.repository.js';
import { LoomisError } from '../shared/errors.js';

const PLATFORM_ROLES = new Set([
  'platform_owner',
  'platform_admin',
  'dpo',
  'regional_manager',
  'regional_subordinate',
]);

function parseFinanceMode(value: string | undefined): FinanceMode {
  return value === 'split' ? 'split' : 'combined';
}

function tenantIdFromRequest(req: FastifyRequest): string | null {
  const params = req.params as { tenantId?: string };
  return params.tenantId ?? req.authUser?.tenantId ?? null;
}

/**
 * Capability gate with tenant finance-mode presets (ROLE_EXPERIENCE Sprint 2).
 * Must run after `authenticate`. Platform actors use base role capabilities only.
 */
export function requireCapability(...capabilities: Capability[]) {
  return async function requireCapabilityHandler(
    req: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const user = req.authUser;
    if (!user) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
    }

    const tenantId = tenantIdFromRequest(req);
    let financeMode: FinanceMode = 'combined';

    if (tenantId && !PLATFORM_ROLES.has(user.role)) {
      const tenant = await tenantRepository.findById(tenantId);
      if (tenant) {
        financeMode = parseFinanceMode(tenant.financeMode);
      }
    }

    const allowed = capabilities.some((capability) =>
      tenantId && !PLATFORM_ROLES.has(user.role)
        ? effectiveCan(user.role, capability, financeMode)
        : can(user.role, capability),
    );

    if (!allowed) {
      throw new LoomisError('FORBIDDEN', 403, 'Insufficient capability for this resource');
    }
  };
}
