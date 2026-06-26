import type { FastifyInstance } from 'fastify';
import {
  createAcademicYearRequest,
  createCalendarEventRequest,
  setupSchoolYearRequest,
  type CreateAcademicYearRequest,
  type CreateCalendarEventRequest,
  type SetupSchoolYearRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  activateAcademicYearHandler,
  closeAcademicYearHandler,
  createAcademicYearHandler,
  createCalendarEventHandler,
  deleteCalendarEventHandler,
  finalizeSchoolYearHandler,
  getAcademicYearHandler,
  listAcademicYearsHandler,
  listCalendarEventsHandler,
  setupSchoolYearHandler,
} from '../handlers/index.js';

const yearAdmins = ['school_owner', 'principal'] as const;
// FR-ASM-001: the Platform Administrator may also create/correct years at onboarding.
const yearCreators = ['school_owner', 'principal', 'platform_admin'] as const;
const yearReaders = [
  'school_owner',
  'principal',
  'admin_officer',
  'timetable_officer',
  'exam_officer',
  'deputy_exam_officer',
  'teacher',
  'class_teacher',
  'parent',
  'student',
] as const;
// Calendar event authors: school leadership and the admin officer who runs the diary.
const calendarManagers = ['school_owner', 'principal', 'admin_officer'] as const;

/** Academic year routes (FR-ASM-001/002/003; US-ASM-001). All under /api/v1. */
export async function academicYearsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: CreateAcademicYearRequest }>(
    '/tenants/:tenantId/academic-years',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...yearCreators)],
      preValidation: [validateBody(createAcademicYearRequest)],
    },
    createAcademicYearHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: SetupSchoolYearRequest }>(
    '/tenants/:tenantId/academic-years/setup',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...yearAdmins)],
      preValidation: [validateBody(setupSchoolYearRequest)],
    },
    setupSchoolYearHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/academic-years',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...yearReaders)] },
    listAcademicYearsHandler,
  );

  app.get<{ Params: { tenantId: string; yearId: string } }>(
    '/tenants/:tenantId/academic-years/:yearId',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...yearReaders)] },
    getAcademicYearHandler,
  );

  // Irreversible (FR-ASM-002): creates draft term placeholders.
  app.post<{ Params: { tenantId: string; yearId: string } }>(
    '/tenants/:tenantId/academic-years/:yearId/activate',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...yearAdmins)] },
    activateAcademicYearHandler,
  );

  app.post<{ Params: { tenantId: string; yearId: string } }>(
    '/tenants/:tenantId/academic-years/:yearId/finalize',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...yearAdmins)] },
    finalizeSchoolYearHandler,
  );

  app.post<{ Params: { tenantId: string; yearId: string } }>(
    '/tenants/:tenantId/academic-years/:yearId/close',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...yearAdmins)] },
    closeAcademicYearHandler,
  );

  // School calendar events (holidays, meetings, activities) for a year.
  app.get<{ Params: { tenantId: string; yearId: string } }>(
    '/tenants/:tenantId/academic-years/:yearId/calendar-events',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...yearReaders)] },
    listCalendarEventsHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: CreateCalendarEventRequest }>(
    '/tenants/:tenantId/calendar-events',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...calendarManagers)],
      preValidation: [validateBody(createCalendarEventRequest)],
    },
    createCalendarEventHandler,
  );

  app.delete<{ Params: { tenantId: string; eventId: string } }>(
    '/tenants/:tenantId/calendar-events/:eventId',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...calendarManagers)] },
    deleteCalendarEventHandler,
  );
}
