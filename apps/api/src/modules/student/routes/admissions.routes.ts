import type { FastifyInstance } from 'fastify';
import {
  admissionDecisionRequest,
  createAdmissionRequest,
  type AdmissionDecisionRequest,
  type CreateAdmissionRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  admissionDecisionHandler,
  createAdmissionHandler,
  getAdmissionHandler,
  listAdmissionsHandler,
} from '../handlers/index.js';

const admissionsStaff = ['school_owner', 'principal', 'admin_officer'] as const;
const admissionsApprovers = ['school_owner', 'principal'] as const;

export async function admissionsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: CreateAdmissionRequest }>(
    '/tenants/:tenantId/admissions',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...admissionsStaff)],
      preValidation: [validateBody(createAdmissionRequest)],
    },
    createAdmissionHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/admissions',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...admissionsStaff)],
    },
    listAdmissionsHandler,
  );

  app.get<{ Params: { tenantId: string; admissionId: string } }>(
    '/tenants/:tenantId/admissions/:admissionId',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...admissionsStaff)],
    },
    getAdmissionHandler,
  );

  app.post<{
    Params: { tenantId: string; admissionId: string };
    Body: AdmissionDecisionRequest;
  }>(
    '/tenants/:tenantId/admissions/:admissionId/decision',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...admissionsApprovers),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(admissionDecisionRequest)],
    },
    admissionDecisionHandler,
  );
}
