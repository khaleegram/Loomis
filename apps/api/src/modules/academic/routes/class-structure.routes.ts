import type { FastifyInstance } from 'fastify';
import {
  createClassArmRequest,
  createClassLevelRequest,
  upsertProgressionRequest,
  type CreateClassArmRequest,
  type CreateClassLevelRequest,
  type UpsertProgressionRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  createClassArmHandler,
  createClassLevelHandler,
  getClassStructureHandler,
  listClassLevelsHandler,
  listProgressionsHandler,
  upsertProgressionHandler,
} from '../handlers/index.js';

// FR-ASM-009: Principal or Admin Officer configure the class structure.
const structureAdmins = ['school_owner', 'principal', 'admin_officer'] as const;
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
