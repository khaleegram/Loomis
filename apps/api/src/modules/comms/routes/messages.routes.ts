import type { FastifyInstance } from 'fastify';
import {
  replyToMessageRequest,
  sendAnnouncementRequest,
  sendClassMessageRequest,
  sendStudentParentMessageRequest,
  type ReplyToMessageRequest,
  type SendAnnouncementRequest,
  type SendClassMessageRequest,
  type SendStudentParentMessageRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  getMessageHandler,
  getThreadHandler,
  replyToMessageHandler,
  sendAnnouncementHandler,
  sendClassMessageHandler,
  sendStudentParentMessageHandler,
} from '../handlers/index.js';

/** Messaging routes (FR-COM-001 / US-COM-001..003). */
export async function messagesRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: SendAnnouncementRequest }>(
    '/tenants/:tenantId/comms/announcements',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner', 'principal', 'admin_officer'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(sendAnnouncementRequest)],
    },
    sendAnnouncementHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: SendClassMessageRequest }>(
    '/tenants/:tenantId/comms/messages/class',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(
          'class_teacher',
          'school_owner',
          'principal',
          'admin_officer',
          'exam_officer',
          'deputy_exam_officer',
        ),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(sendClassMessageRequest)],
    },
    sendClassMessageHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: SendStudentParentMessageRequest }>(
    '/tenants/:tenantId/comms/messages/student-parents',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(
          'school_owner',
          'principal',
          'admin_officer',
          'class_teacher',
          'exam_officer',
          'deputy_exam_officer',
        ),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(sendStudentParentMessageRequest)],
    },
    sendStudentParentMessageHandler,
  );

  app.post<{ Params: { tenantId: string; messageId: string }; Body: ReplyToMessageRequest }>(
    '/tenants/:tenantId/comms/messages/:messageId/replies',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('parent'), requireIdempotencyKey],
      preValidation: [validateBody(replyToMessageRequest)],
    },
    replyToMessageHandler,
  );

  app.get<{ Params: { tenantId: string; messageId: string } }>(
    '/tenants/:tenantId/comms/messages/:messageId',
    { preHandler: [authenticate, requireTenantMatch] },
    getMessageHandler,
  );

  app.get<{ Params: { tenantId: string; threadId: string } }>(
    '/tenants/:tenantId/comms/threads/:threadId',
    { preHandler: [authenticate, requireTenantMatch] },
    getThreadHandler,
  );
}
