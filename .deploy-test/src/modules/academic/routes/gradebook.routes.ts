import type { FastifyInstance } from 'fastify';
import {
  createExamConfigRequest,
  createGradingSchemeRequest,
  lockGradebookRequest,
  listGradebookQuery,
  myResultsQuery,
  publishResultsRequest,
  requestGradeCorrectionRequest,
  upsertGradebookEntryRequest,
  type CreateExamConfigRequest,
  type CreateGradingSchemeRequest,
  type ListGradebookQuery,
  type LockGradebookRequest,
  type MyResultsQuery,
  type PublishResultsRequest,
  type RequestGradeCorrectionRequest,
  type UpsertGradebookEntryRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireStepUpForPrincipal } from '../../../middleware/require-step-up-for-principal.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody, validateQuery } from '../../../shared/validation.js';
import {
  createExamConfigHandler,
  createGradingSchemeHandler,
  listExamConfigsHandler,
  listGradebookEntriesHandler,
  listGradingSchemesHandler,
  listStudentPublishedResultsHandler,
  lockGradebookHandler,
  publishResultsHandler,
  requestGradeCorrectionHandler,
  upsertGradebookEntryHandler,
  examOpsStatusHandler,
} from '../handlers/index.js';

const gradingAdmins = ['school_owner', 'principal', 'exam_officer', 'deputy_exam_officer'] as const;
const gradebookReaders = [
  'school_owner',
  'principal',
  'admin_officer',
  'exam_officer',
  'deputy_exam_officer',
  'teacher',
  'class_teacher',
] as const;
const gradebookWriters = ['teacher', 'class_teacher', 'principal'] as const;

/** Grading schemes, gradebook entries, corrections and result publication. */
export async function gradebookRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: CreateGradingSchemeRequest }>(
    '/tenants/:tenantId/grading-schemes',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...gradingAdmins)],
      preValidation: [validateBody(createGradingSchemeRequest)],
    },
    createGradingSchemeHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/grading-schemes',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...gradebookReaders)] },
    listGradingSchemesHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: CreateExamConfigRequest }>(
    '/tenants/:tenantId/exam-configs',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...gradingAdmins)],
      preValidation: [validateBody(createExamConfigRequest)],
    },
    createExamConfigHandler,
  );

  app.get<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId/exam-configs',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...gradebookReaders)] },
    listExamConfigsHandler,
  );

  app.put<{ Params: { tenantId: string }; Body: UpsertGradebookEntryRequest }>(
    '/tenants/:tenantId/gradebook/entries',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...gradebookWriters)],
      preValidation: [validateBody(upsertGradebookEntryRequest)],
    },
    upsertGradebookEntryHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: ListGradebookQuery }>(
    '/tenants/:tenantId/gradebook/entries',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...gradebookReaders)],
      preValidation: [validateQuery(listGradebookQuery)],
    },
    listGradebookEntriesHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: LockGradebookRequest }>(
    '/tenants/:tenantId/gradebook/lock',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...gradebookWriters), requireIdempotencyKey],
      preValidation: [validateBody(lockGradebookRequest)],
    },
    lockGradebookHandler,
  );

  app.post<{ Params: { tenantId: string; entryId: string }; Body: RequestGradeCorrectionRequest }>(
    '/tenants/:tenantId/gradebook/entries/:entryId/corrections',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...gradebookWriters), requireIdempotencyKey],
      preValidation: [validateBody(requestGradeCorrectionRequest)],
    },
    requestGradeCorrectionHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: PublishResultsRequest }>(
    '/tenants/:tenantId/results/publish',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('exam_officer', 'deputy_exam_officer', 'principal'),
        requireStepUpForPrincipal('result_publish'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(publishResultsRequest)],
    },
    publishResultsHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: MyResultsQuery }>(
    '/tenants/:tenantId/results/me',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('student')],
      preValidation: [validateQuery(myResultsQuery)],
    },
    listStudentPublishedResultsHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/exam-ops/status',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...gradingAdmins, 'admin_officer'),
      ],
    },
    examOpsStatusHandler,
  );
}
