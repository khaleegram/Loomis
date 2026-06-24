import type { FastifyInstance } from 'fastify';
import {
  upsertWorkflowTemplateRequest,
  workflowDecideRequest,
  type UpsertWorkflowTemplateRequest,
  type WorkflowDecideRequest,
  type WorkflowType,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  decideHandler,
  getInstanceHandler,
  listInboxHandler,
  listMyRequestsHandler,
  listPlatformTemplatesHandler,
  listTemplatesHandler,
  processEscalationsHandler,
  upsertPlatformTemplateHandler,
  upsertTemplateHandler,
} from '../handlers/index.js';

/**
 * Workflow routes (SRS §4.10; US-WRK-001..003).
 * Workflow writes require Idempotency-Key (loomis-security).
 */
export async function workflowsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/workflows/inbox',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(
        'school_owner',
        'principal',
        'admin_officer',
        'accountant',
        'cashier',
        'exam_officer',
        'deputy_exam_officer',
        'platform_owner',
        'platform_admin',
        'dpo',
      )],
    },
    listInboxHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/workflows/mine',
    {
      preHandler: [authenticate, requireTenantMatch],
    },
    listMyRequestsHandler,
  );

  app.get<{ Params: { tenantId: string; instanceId: string } }>(
    '/tenants/:tenantId/workflows/instances/:instanceId',
    {
      preHandler: [authenticate, requireTenantMatch],
    },
    getInstanceHandler,
  );

  app.post<{
    Params: { tenantId: string; instanceId: string; stepId: string };
    Body: WorkflowDecideRequest;
  }>(
    '/tenants/:tenantId/workflows/instances/:instanceId/steps/:stepId/decide',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(
          'school_owner',
          'principal',
          'admin_officer',
          'accountant',
          'cashier',
          'exam_officer',
          'deputy_exam_officer',
          'platform_owner',
          'platform_admin',
          'dpo',
        ),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(workflowDecideRequest)],
    },
    decideHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/workflows/templates',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner', 'principal', 'platform_owner', 'platform_admin'),
      ],
    },
    listTemplatesHandler,
  );

  app.put<{
    Params: { tenantId: string; workflowType: WorkflowType };
    Body: UpsertWorkflowTemplateRequest;
  }>(
    '/tenants/:tenantId/workflows/templates/:workflowType',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner', 'principal', 'platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(upsertWorkflowTemplateRequest)],
    },
    upsertTemplateHandler,
  );

  app.get(
    '/workflows/templates',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
    },
    listPlatformTemplatesHandler,
  );

  app.put<{ Params: { workflowType: WorkflowType }; Body: UpsertWorkflowTemplateRequest }>(
    '/workflows/templates/:workflowType',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(upsertWorkflowTemplateRequest)],
    },
    upsertPlatformTemplateHandler,
  );

  app.post(
    '/workflows/escalations/process',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
    },
    processEscalationsHandler,
  );
}
