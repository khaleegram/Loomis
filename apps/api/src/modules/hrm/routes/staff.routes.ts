import type { FastifyInstance } from 'fastify';
import {
  acceptStaffInvitationRequest,
  assignClassTeacherRequest,
  changeStaffRoleRequest,
  createSubjectAssignmentRequest,
  createStaffRequest,
  deactivateStaffRequest,
  designateBackupRequest,
  inviteStaffRequest,
  reactivateStaffRequest,
  removeSubjectAssignmentRequest,
  setPhotoRequest,
  type AcceptStaffInvitationRequest,
  type AssignClassTeacherRequest,
  type ChangeStaffRoleRequest,
  type CreateSubjectAssignmentRequest,
  type CreateStaffRequest,
  type DeactivateStaffRequest,
  type DesignateBackupRequest,
  type InviteStaffRequest,
  type ReactivateStaffRequest,
  type RemoveSubjectAssignmentRequest,
  type SetPhotoRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  acceptStaffInvitationHandler,
  assignClassTeacherHandler,
  changeStaffRoleHandler,
  createStaffHandler,
  createSubjectAssignmentHandler,
  deactivateStaffHandler,
  designateBackupHandler,
  getStaffHandler,
  inviteStaffHandler,
  listStaffHandler,
  reactivateStaffHandler,
  removeSubjectAssignmentHandler,
  setStaffPhotoHandler,
} from '../handlers/index.js';

const staffAdmins = ['school_owner', 'principal', 'admin_officer'] as const;
const principalOwners = ['school_owner', 'principal'] as const;

export async function staffRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: CreateStaffRequest }>(
    '/tenants/:tenantId/staff',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...staffAdmins)],
      preValidation: [validateBody(createStaffRequest)],
    },
    createStaffHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: InviteStaffRequest }>(
    '/tenants/:tenantId/staff/invitations',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...staffAdmins)],
      preValidation: [validateBody(inviteStaffRequest)],
    },
    inviteStaffHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: AcceptStaffInvitationRequest }>(
    '/tenants/:tenantId/staff/invitations/accept',
    {
      preValidation: [validateBody(acceptStaffInvitationRequest)],
    },
    acceptStaffInvitationHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/staff',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...staffAdmins)],
    },
    listStaffHandler,
  );

  app.get<{ Params: { tenantId: string; staffProfileId: string } }>(
    '/tenants/:tenantId/staff/:staffProfileId',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...staffAdmins)],
    },
    getStaffHandler,
  );

  app.post<{ Params: { tenantId: string; staffProfileId: string }; Body: ChangeStaffRoleRequest }>(
    '/tenants/:tenantId/staff/:staffProfileId/role',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...principalOwners)],
      preValidation: [validateBody(changeStaffRoleRequest)],
    },
    changeStaffRoleHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: CreateSubjectAssignmentRequest }>(
    '/tenants/:tenantId/staff/subject-assignments',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...staffAdmins)],
      preValidation: [validateBody(createSubjectAssignmentRequest)],
    },
    createSubjectAssignmentHandler,
  );

  app.post<{
    Params: { tenantId: string; assignmentId: string };
    Body: RemoveSubjectAssignmentRequest;
  }>(
    '/tenants/:tenantId/staff/subject-assignments/:assignmentId/remove',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...principalOwners)],
      preValidation: [validateBody(removeSubjectAssignmentRequest)],
    },
    removeSubjectAssignmentHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: AssignClassTeacherRequest }>(
    '/tenants/:tenantId/staff/class-teacher-assignments',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...staffAdmins)],
      preValidation: [validateBody(assignClassTeacherRequest)],
    },
    assignClassTeacherHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: DesignateBackupRequest }>(
    '/tenants/:tenantId/staff/backup-designations',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...principalOwners)],
      preValidation: [validateBody(designateBackupRequest)],
    },
    designateBackupHandler,
  );

  app.post<{ Params: { tenantId: string; staffProfileId: string }; Body: DeactivateStaffRequest }>(
    '/tenants/:tenantId/staff/:staffProfileId/deactivate',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...principalOwners)],
      preValidation: [validateBody(deactivateStaffRequest)],
    },
    deactivateStaffHandler,
  );

  app.post<{ Params: { tenantId: string; staffProfileId: string }; Body: ReactivateStaffRequest }>(
    '/tenants/:tenantId/staff/:staffProfileId/reactivate',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...principalOwners)],
      preValidation: [validateBody(reactivateStaffRequest)],
    },
    reactivateStaffHandler,
  );

  app.patch<{ Params: { tenantId: string; staffProfileId: string }; Body: SetPhotoRequest }>(
    '/tenants/:tenantId/staff/:staffProfileId/photo',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...staffAdmins)],
      preValidation: [validateBody(setPhotoRequest)],
    },
    setStaffPhotoHandler,
  );
}
