import type { FastifyInstance } from 'fastify';
import {
  acknowledgeBreachRequest,
  createBreachRecordRequest,
  createConsentVersionRequest,
  createDsarRequest,
  recordNdpcNotificationRequest,
  respondDsarRequest,
  updateBreachRecordRequest,
  updateDsarRequest,
  updateRetentionScheduleRequest,
  type AcknowledgeBreachRequest,
  type CreateBreachRecordRequest,
  type CreateConsentVersionRequest,
  type CreateDsarRequest,
  type RecordNdpcNotificationRequest,
  type RespondDsarRequest,
  type UpdateBreachRecordRequest,
  type UpdateDsarRequest,
  type UpdateRetentionScheduleRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  acknowledgeBreachHandler,
  collectDsarDataHandler,
  createBreachHandler,
  createDsarHandler,
  getActiveConsentVersionHandler,
  getBreachHandler,
  getComplianceDashboardHandler,
  getDsarHandler,
  getNdpcDraftHandler,
  listBreachesHandler,
  listConsentVersionsHandler,
  listDsarsHandler,
  listRetentionSchedulesHandler,
  publishConsentVersionHandler,
  recordNdpcNotificationHandler,
  respondDsarHandler,
  updateBreachHandler,
  updateDsarHandler,
  updateRetentionScheduleHandler,
} from '../handlers/index.js';

const dpoOnly = [authenticate, requireTenantMatch, requireRole('dpo')] as const;

/** Compliance routes (System Design §19; US-AUD-002..005). DPO-only access. */
export async function complianceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/compliance/dashboard', { preHandler: [...dpoOnly] }, getComplianceDashboardHandler);

  app.get<{ Querystring: { status?: string } }>(
    '/compliance/dsars',
    { preHandler: [...dpoOnly] },
    listDsarsHandler,
  );

  app.post<{ Body: CreateDsarRequest }>(
    '/compliance/dsars',
    { preHandler: [...dpoOnly], preValidation: [validateBody(createDsarRequest)] },
    createDsarHandler,
  );

  app.get<{ Params: { dsarId: string } }>(
    '/compliance/dsars/:dsarId',
    { preHandler: [...dpoOnly] },
    getDsarHandler,
  );

  app.patch<{ Params: { dsarId: string }; Body: UpdateDsarRequest }>(
    '/compliance/dsars/:dsarId',
    { preHandler: [...dpoOnly], preValidation: [validateBody(updateDsarRequest)] },
    updateDsarHandler,
  );

  app.post<{ Params: { dsarId: string } }>(
    '/compliance/dsars/:dsarId/collect',
    { preHandler: [...dpoOnly] },
    collectDsarDataHandler,
  );

  app.post<{ Params: { dsarId: string }; Body: RespondDsarRequest }>(
    '/compliance/dsars/:dsarId/respond',
    { preHandler: [...dpoOnly], preValidation: [validateBody(respondDsarRequest)] },
    respondDsarHandler,
  );

  app.get<{ Querystring: { status?: string } }>(
    '/compliance/breaches',
    { preHandler: [...dpoOnly] },
    listBreachesHandler,
  );

  app.post<{ Body: CreateBreachRecordRequest }>(
    '/compliance/breaches',
    { preHandler: [...dpoOnly], preValidation: [validateBody(createBreachRecordRequest)] },
    createBreachHandler,
  );

  app.get<{ Params: { breachId: string } }>(
    '/compliance/breaches/:breachId',
    { preHandler: [...dpoOnly] },
    getBreachHandler,
  );

  app.patch<{ Params: { breachId: string }; Body: UpdateBreachRecordRequest }>(
    '/compliance/breaches/:breachId',
    { preHandler: [...dpoOnly], preValidation: [validateBody(updateBreachRecordRequest)] },
    updateBreachHandler,
  );

  app.post<{ Params: { breachId: string }; Body: AcknowledgeBreachRequest }>(
    '/compliance/breaches/:breachId/acknowledge',
    { preHandler: [...dpoOnly], preValidation: [validateBody(acknowledgeBreachRequest)] },
    acknowledgeBreachHandler,
  );

  app.get<{ Params: { breachId: string } }>(
    '/compliance/breaches/:breachId/ndpc-draft',
    { preHandler: [...dpoOnly] },
    getNdpcDraftHandler,
  );

  app.post<{ Params: { breachId: string }; Body: RecordNdpcNotificationRequest }>(
    '/compliance/breaches/:breachId/ndpc-notification',
    {
      preHandler: [...dpoOnly],
      preValidation: [validateBody(recordNdpcNotificationRequest)],
    },
    recordNdpcNotificationHandler,
  );

  app.get('/compliance/consent-versions', { preHandler: [...dpoOnly] }, listConsentVersionsHandler);

  app.get(
    '/compliance/consent-versions/active',
    { preHandler: [...dpoOnly] },
    getActiveConsentVersionHandler,
  );

  app.post<{ Body: CreateConsentVersionRequest }>(
    '/compliance/consent-versions',
    { preHandler: [...dpoOnly], preValidation: [validateBody(createConsentVersionRequest)] },
    publishConsentVersionHandler,
  );

  app.get(
    '/compliance/retention-schedules',
    { preHandler: [...dpoOnly] },
    listRetentionSchedulesHandler,
  );

  app.patch<{ Params: { scheduleId: string }; Body: UpdateRetentionScheduleRequest }>(
    '/compliance/retention-schedules/:scheduleId',
    {
      preHandler: [...dpoOnly],
      preValidation: [validateBody(updateRetentionScheduleRequest)],
    },
    updateRetentionScheduleHandler,
  );
}
