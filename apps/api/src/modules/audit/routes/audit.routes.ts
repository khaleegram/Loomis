import type { FastifyInstance } from 'fastify';
import {
  auditLogExportRequest,
  type AuditLogExportRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireCapability } from '../../../middleware/require-capability.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireStepUp } from '../../../middleware/require-step-up.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import { sendSuccess } from '../../../shared/http.js';
import { exportAuditLogHandler, searchAuditLogHandler } from '../handlers/audit.handler.js';
import { auditReadService } from '../services/audit-read.service.js';

const auditReaders = [authenticate, requireTenantMatch, requireRole('platform_owner', 'platform_admin', 'dpo')] as const;
const schoolAuditReaders = [authenticate, requireTenantMatch, requireRole('school_owner', 'principal')] as const;
const schoolAuditExporters = [
  authenticate,
  requireTenantMatch,
  requireCapability('audit.export'),
  requireStepUp('data_export'),
  requireIdempotencyKey,
] as const;

/** Audit log read + export (US-AUD-001). */
export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: Record<string, string | undefined> }>(
    '/platform/audit/events',
    { preHandler: [...auditReaders] },
    searchAuditLogHandler,
  );

  app.post<{ Body: AuditLogExportRequest }>(
    '/platform/audit/export',
    {
      preHandler: [...auditReaders, requireIdempotencyKey],
      preValidation: [validateBody(auditLogExportRequest)],
    },
    exportAuditLogHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: Record<string, string | undefined> }>(
    '/tenants/:tenantId/audit/events',
    { preHandler: [...schoolAuditReaders] },
    async (req, reply) => {
      return searchAuditLogHandler(
        { ...req, query: { ...req.query, tenantId: req.params.tenantId } } as any,
        reply,
      );
    },
  );

  app.post<{ Params: { tenantId: string }; Body: AuditLogExportRequest }>(
    '/tenants/:tenantId/audit/export',
    {
      preHandler: [...schoolAuditExporters],
      preValidation: [validateBody(auditLogExportRequest)],
    },
    async (req, reply) => {
      const actor = req.authUser;
      if (!actor) {
        throw new Error('Not authenticated');
      }
      const result = await auditReadService.export(
        { ...req.body, filters: { ...req.body.filters, tenantId: req.params.tenantId } },
        actor.sub,
        req.id,
        { tenantId: req.params.tenantId, inlineDelivery: true },
      );
      return sendSuccess(reply, result);
    },
  );
}
