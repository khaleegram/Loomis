import type { FastifyInstance } from 'fastify';
import {
  createClassArmRequest,
  createClassLevelRequest,
  upsertAcademicSetupPreferencesRequest,
  setupClassArmsRequest,
  setupClassLevelsRequest,
  upsertProgressionRequest,
  type CreateClassArmRequest,
  type CreateClassLevelRequest,
  type SetupClassArmsRequest,
  type SetupClassLevelsRequest,
  type UpsertAcademicSetupPreferencesRequest,
  type UpsertProgressionRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  createClassArmHandler,
  createClassLevelHandler,
  getAcademicSetupPreferencesHandler,
  getClassStructureHandler,
  listClassLevelsHandler,
  listProgressionsHandler,
  setupClassArmsHandler,
  setupClassLevelsHandler,
  upsertAcademicSetupPreferencesHandler,
  upsertProgressionHandler,
} from '../handlers/index.js';

// FR-ASM-009: Principal or Admin Officer configure the class structure.
const structureAdmins = ['school_owner', 'principal', 'admin_officer'] as const;
const setupPreferenceAdmins = [
  'school_owner',
  'principal',
  'admin_officer',
  'exam_officer',
  'deputy_exam_officer',
] as const;
const structureReaders = [
  'school_owner',
  'principal',
  'admin_officer',
  'timetable_officer',
  'exam_officer',
  'deputy_exam_officer',
  'teacher',
  'class_teacher',
] as const;

/** Class structure & progression routes (FR-ASM-009). All under /api/v1. */
export async function classStructureRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/academic/setup-preferences',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...setupPreferenceAdmins)],
    },
    getAcademicSetupPreferencesHandler,
  );

  app.put<{ Params: { tenantId: string }; Body: UpsertAcademicSetupPreferencesRequest }>(
    '/tenants/:tenantId/academic/setup-preferences',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...setupPreferenceAdmins)],
      preValidation: [validateBody(upsertAcademicSetupPreferencesRequest)],
    },
    upsertAcademicSetupPreferencesHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: CreateClassLevelRequest }>(
    '/tenants/:tenantId/class-levels',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...structureAdmins)],
      preValidation: [validateBody(createClassLevelRequest)],
    },
    createClassLevelHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/class-levels',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...structureReaders)] },
    listClassLevelsHandler,
  );

  // Question-based setup wizard: create the whole class ladder + progression in one call.
  app.post<{ Params: { tenantId: string }; Body: SetupClassLevelsRequest }>(
    '/tenants/:tenantId/class-levels/setup',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...structureAdmins)],
      preValidation: [validateBody(setupClassLevelsRequest)],
    },
    setupClassLevelsHandler,
  );

  // Question-based setup wizard: create the selected arms for one level in one year.
  app.post<{ Params: { tenantId: string }; Body: SetupClassArmsRequest }>(
    '/tenants/:tenantId/class-arms/setup',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...structureAdmins)],
      preValidation: [validateBody(setupClassArmsRequest)],
    },
    setupClassArmsHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: CreateClassArmRequest }>(
    '/tenants/:tenantId/class-arms',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...structureAdmins)],
      preValidation: [validateBody(createClassArmRequest)],
    },
    createClassArmHandler,
  );

  app.get<{ Params: { tenantId: string; yearId: string } }>(
    '/tenants/:tenantId/academic-years/:yearId/class-structure',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...structureReaders)] },
    getClassStructureHandler,
  );

  app.put<{ Params: { tenantId: string }; Body: UpsertProgressionRequest }>(
    '/tenants/:tenantId/class-progression',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...structureAdmins)],
      preValidation: [validateBody(upsertProgressionRequest)],
    },
    upsertProgressionHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/class-progression',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...structureReaders)] },
    listProgressionsHandler,
  );
}
