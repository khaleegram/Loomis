import type { FastifyInstance } from 'fastify';
import {
  amendAttendanceRequest,
  listAttendanceQuery,
  markAttendanceRequest,
  myAttendanceQuery,
  registerDeviceKeyRequest,
  syncOfflineAttendanceRequest,
  type AmendAttendanceRequest,
  type ListAttendanceQuery,
  type MarkAttendanceRequest,
  type MyAttendanceQuery,
  type RegisterDeviceKeyRequest,
  type SyncOfflineAttendanceRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireStaffRole } from '../../../middleware/require-staff-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody, validateQuery } from '../../../shared/validation.js';
import {
  amendAttendanceHandler,
  listAttendanceHandler,
  listDeviceKeysHandler,
  listStudentAttendanceHandler,
  listStaffStudentAttendanceHandler,
  markAttendanceHandler,
  registerDeviceKeyHandler,
  revokeDeviceKeyHandler,
  syncOfflineAttendanceHandler,
} from '../handlers/academic-ops.handler.js';

// CON-003: attendance marking is EXCLUSIVELY a Class Teacher capability. Regular
// Teachers are blocked here at the middleware (requireStaffRole('class_teacher')) and
// again in the service layer — they have no attendance access at all.
const attendanceReaders = ['class_teacher', 'principal', 'school_owner', 'admin_officer'] as const;
const deviceManagers = ['class_teacher', 'principal', 'admin_officer', 'school_owner'] as const;

/** Attendance routes (SRS §4.5 FR-ACA-002; CON-003; US-ACA-005). All under /api/v1. */
export async function attendanceRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: MarkAttendanceRequest }>(
    '/tenants/:tenantId/attendance',
    {
      preHandler: [authenticate, requireTenantMatch, requireStaffRole('class_teacher')],
      preValidation: [validateBody(markAttendanceRequest)],
    },
    markAttendanceHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: SyncOfflineAttendanceRequest }>(
    '/tenants/:tenantId/attendance/sync',
    {
      preHandler: [authenticate, requireTenantMatch, requireStaffRole('class_teacher')],
      preValidation: [validateBody(syncOfflineAttendanceRequest)],
    },
    syncOfflineAttendanceHandler,
  );

  app.patch<{ Params: { tenantId: string; recordId: string }; Body: AmendAttendanceRequest }>(
    '/tenants/:tenantId/attendance/:recordId',
    {
      preHandler: [authenticate, requireTenantMatch, requireStaffRole('class_teacher')],
      preValidation: [validateBody(amendAttendanceRequest)],
    },
    amendAttendanceHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: ListAttendanceQuery }>(
    '/tenants/:tenantId/attendance',
    {
      preHandler: [authenticate, requireTenantMatch, requireStaffRole(...attendanceReaders)],
      preValidation: [validateQuery(listAttendanceQuery)],
    },
    listAttendanceHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: MyAttendanceQuery }>(
    '/tenants/:tenantId/attendance/me',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('student')],
      preValidation: [validateQuery(myAttendanceQuery)],
    },
    listStudentAttendanceHandler,
  );

  app.get<{
    Params: { tenantId: string; studentId: string };
    Querystring: MyAttendanceQuery;
  }>(
    '/tenants/:tenantId/students/:studentId/attendance',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner', 'principal', 'admin_officer'),
      ],
      preValidation: [validateQuery(myAttendanceQuery)],
    },
    listStaffStudentAttendanceHandler,
  );

  // ── Per-tenant device signing keys (MOB-007) ──────────────────────────────────
  app.post<{ Params: { tenantId: string }; Body: RegisterDeviceKeyRequest }>(
    '/tenants/:tenantId/attendance-devices',
    {
      preHandler: [authenticate, requireTenantMatch, requireStaffRole(...deviceManagers)],
      preValidation: [validateBody(registerDeviceKeyRequest)],
    },
    registerDeviceKeyHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/attendance-devices',
    { preHandler: [authenticate, requireTenantMatch, requireStaffRole(...deviceManagers)] },
    listDeviceKeysHandler,
  );

  app.delete<{ Params: { tenantId: string; deviceId: string } }>(
    '/tenants/:tenantId/attendance-devices/:deviceId',
    { preHandler: [authenticate, requireTenantMatch, requireStaffRole(...deviceManagers)] },
    revokeDeviceKeyHandler,
  );
}
