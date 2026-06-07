import type { FastifyInstance } from 'fastify';
import {
  auditLogExportRequest,
  type AuditLogExportRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import { exportAuditLogHandler, searchAuditLogHandler } from '../handlers/audit.handler.js';

const auditReaders = [authenticate, requireTenantMatch, requireRole('platform_owner', 'platform_admin', 'dpo')] as const;
const schoolAuditReaders = [authenticate, requireTenantMatch, requireRole('school_owner', 'principal')] as const;

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
}
