import type { FastifyInstance } from 'fastify';
import {
  bellScheduleQuery,
  createTimetableEntryRequest,
  listTimetableQuery,
  listTimetableSubjectOptionsQuery,
  myTimetableQuery,
  publishTimetableRequest,
  timetableTermSummaryQuery,
  timetablePublishPreviewQuery,
  upsertBellScheduleRequest,
  type CreateTimetableEntryRequest,
  type ListTimetableQuery,
  type ListTimetableSubjectOptionsQuery,
  type MyTimetableQuery,
  type PublishTimetableRequest,
  type TimetableTermSummaryQuery,
  type TimetablePublishPreviewQuery,
  type UpsertBellScheduleRequest,
  type BellScheduleQuery,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireOptionalStaffRoleIfApplicable } from '../../../middleware/require-optional-staff-role.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requirePersonalTimetableAccess } from '../../../middleware/require-personal-timetable-access.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody, validateQuery } from '../../../shared/validation.js';
import {
  createTimetableEntryHandler,
  deleteTimetableEntryHandler,
  listStudentTimetableHandler,
  listTimetableHandler,
  listTimetableSubjectOptionsHandler,
  publishTimetableHandler,
  timetableTermSummaryHandler,
  timetablePublishPreviewHandler,
  getBellScheduleHandler,
  upsertBellScheduleHandler,
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

/** Parents need bell slots to render read-only grids; they cannot list arbitrary class timetables. */
const bellScheduleReaders = [...timetableReaders, 'parent'] as const;

/** Timetable routes (SRS §4.5 FR-ACA-001; US-ACA-006). All under /api/v1. */
export async function timetableRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireOptionalStaffRoleIfApplicable());

  app.post<{ Params: { tenantId: string }; Body: CreateTimetableEntryRequest }>(
    '/tenants/:tenantId/timetable-entries',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...timetableBuilders),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(createTimetableEntryRequest)],
    },
    createTimetableEntryHandler,
  );

  app.delete<{ Params: { tenantId: string; entryId: string } }>(
    '/tenants/:tenantId/timetable-entries/:entryId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...timetableBuilders),
        requireIdempotencyKey,
      ],
    },
    deleteTimetableEntryHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: PublishTimetableRequest }>(
    '/tenants/:tenantId/timetable/publish',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...timetableBuilders),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(publishTimetableRequest)],
    },
    publishTimetableHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: ListTimetableSubjectOptionsQuery }>(
    '/tenants/:tenantId/timetable/subject-options',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...timetableBuilders)],
      preValidation: [validateQuery(listTimetableSubjectOptionsQuery)],
    },
    listTimetableSubjectOptionsHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: MyTimetableQuery }>(
    '/tenants/:tenantId/timetable/me',
    {
      preHandler: [authenticate, requireTenantMatch, requirePersonalTimetableAccess()],
      preValidation: [validateQuery(myTimetableQuery)],
    },
    listStudentTimetableHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: BellScheduleQuery }>(
    '/tenants/:tenantId/bell-schedule',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...bellScheduleReaders)],
      preValidation: [validateQuery(bellScheduleQuery)],
    },
    getBellScheduleHandler,
  );

  app.put<{ Params: { tenantId: string }; Body: UpsertBellScheduleRequest }>(
    '/tenants/:tenantId/bell-schedule',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...timetableBuilders),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(upsertBellScheduleRequest)],
    },
    upsertBellScheduleHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: TimetableTermSummaryQuery }>(
    '/tenants/:tenantId/timetable/summary',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...timetableBuilders)],
      preValidation: [validateQuery(timetableTermSummaryQuery)],
    },
    timetableTermSummaryHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: TimetablePublishPreviewQuery }>(
    '/tenants/:tenantId/timetable/publish-preview',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...timetableBuilders)],
      preValidation: [validateQuery(timetablePublishPreviewQuery)],
    },
    timetablePublishPreviewHandler,
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
