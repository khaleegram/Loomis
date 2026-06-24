import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { getTenantOnboardingHandler } from '../handlers/onboarding.handler.js';

const ONBOARDING_READERS = [
  'school_owner',
  'principal',
  'platform_owner',
  'platform_admin',
  'dpo',
] as const;

/** Tenant onboarding checklist for school dashboard and platform detail. */
export async function onboardingRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/onboarding',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...ONBOARDING_READERS)],
    },
    getTenantOnboardingHandler,
  );
}
