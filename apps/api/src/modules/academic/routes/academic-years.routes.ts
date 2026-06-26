import type { FastifyInstance } from 'fastify';
import { createAcademicYearRequest, setupSchoolYearRequest, type CreateAcademicYearRequest, type SetupSchoolYearRequest } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  activateAcademicYearHandler,
  closeAcademicYearHandler,
  createAcademicYearHandler,
  finalizeSchoolYearHandler,
  getAcademicYearHandler,
  listAcademicYearsHandler,
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
}
