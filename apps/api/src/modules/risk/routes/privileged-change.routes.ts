import type { FastifyInstance } from 'fastify';
import {
  createPrivilegedChangeRequest,
  decidePrivilegedChangeRequest,
  type CreatePrivilegedChangeRequest,
  type DecidePrivilegedChangeRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  createPrivilegedChangeHandler,
  decidePrivilegedChangeHandler,
  executePrivilegedChangeHandler,
  listPrivilegedChangesHandler,
} from '../handlers/index.js';

export async function privilegedChangeRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/platform/privileged-changes',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
    },
    listPrivilegedChangesHandler,
  );

  app.post<{ Body: CreatePrivilegedChangeRequest }>(
    '/platform/privileged-changes',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(createPrivilegedChangeRequest)],
    },
    createPrivilegedChangeHandler,
  );

  app.post<{ Params: { changeId: string }; Body: DecidePrivilegedChangeRequest }>(
    '/platform/privileged-changes/:changeId/decide',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(decidePrivilegedChangeRequest)],
    },
    decidePrivilegedChangeHandler,
  );

  app.post<{ Params: { changeId: string } }>(
    '/platform/privileged-changes/:changeId/execute',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
    },
    executePrivilegedChangeHandler,
  );
}
