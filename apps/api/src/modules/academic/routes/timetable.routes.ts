import type { FastifyInstance } from 'fastify';
import {
  createTimetableEntryRequest,
  listTimetableQuery,
  publishTimetableRequest,
  type CreateTimetableEntryRequest,
  type ListTimetableQuery,
  type PublishTimetableRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody, validateQuery } from '../../../shared/validation.js';
import {
  createTimetableEntryHandler,
  deleteTimetableEntryHandler,
  listTimetableHandler,
  publishTimetableHandler,
} from '../handlers/academic-ops.handler.js';

// FR-ACA-001: the Timetable Officer builds and publishes timetables. Published
// timetables are readable by all the school-level academic roles and students.
const timetableBuilders = ['timetable_officer', 'principal', 'school_owner'] as const;
const timetableReaders = [
  'timetable_officer',
  'principal',
  'school_owner',
  'admin_officer',
  'class_teacher',
  'teacher',
  'student',
] as const;

/** Timetable routes (SRS §4.5 FR-ACA-001; US-ACA-006). All under /api/v1. */
export async function timetableRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: CreateTimetableEntryRequest }>(
    '/tenants/:tenantId/timetable-entries',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...timetableBuilders)],
      preValidation: [validateBody(createTimetableEntryRequest)],
    },
    createTimetableEntryHandler,
  );

  app.delete<{ Params: { tenantId: string; entryId: string } }>(
    '/tenants/:tenantId/timetable-entries/:entryId',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...timetableBuilders)] },
    deleteTimetableEntryHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: PublishTimetableRequest }>(
    '/tenants/:tenantId/timetable/publish',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...timetableBuilders)],
      preValidation: [validateBody(publishTimetableRequest)],
    },
    publishTimetableHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: ListTimetableQuery }>(
    '/tenants/:tenantId/timetable',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...timetableReaders)],
      preValidation: [validateQuery(listTimetableQuery)],
    },
    listTimetableHandler,
  );
}
