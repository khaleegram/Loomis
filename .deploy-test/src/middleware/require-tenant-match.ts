import type { FastifyReply, FastifyRequest } from 'fastify';
import { NULL_TENANT_ROLES } from '@loomis/contracts';
import { LoomisError } from '../shared/errors.js';

/**
 * Validates the X-Tenant-Id header against the JWT `tenant_id` claim
 * (loomis-security HTTP rule). Platform/regional/parent actors carry a null
 * tenant claim and may operate cross-tenant; everyone else must match exactly.
 */
export async function requireTenantMatch(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }

  const header = req.headers['x-tenant-id'];
  const tenantHeader = Array.isArray(header) ? header[0] : header;

  if (user.tenantId === null) {
    // A null-tenant claim is only legitimate for platform-level actors.
    if (tenantHeader && !NULL_TENANT_ROLES.has(user.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Tenant header not permitted for this actor');
    }
    return;
  }

  if (!tenantHeader) {
    throw new LoomisError('FORBIDDEN', 403, 'Missing X-Tenant-Id header');
  }
  if (tenantHeader !== user.tenantId) {
    throw new LoomisError('FORBIDDEN', 403, 'Tenant mismatch');
  }
}
