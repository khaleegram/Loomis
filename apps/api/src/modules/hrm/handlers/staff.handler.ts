import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  AcceptStaffInvitationRequest,
  AssignClassTeacherRequest,
  ChangeStaffRoleRequest,
  CreateSubjectAssignmentRequest,
  DeactivateStaffRequest,
  DesignateBackupRequest,
  InviteStaffRequest,
  ReactivateStaffRequest,
  RemoveSubjectAssignmentRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { staffService } from '../services/staff.service.js';
import { requireActor } from './_context.js';

interface TenantParams {
  tenantId: string;
}

interface StaffParams extends TenantParams {
  staffProfileId: string;
}

interface AssignmentParams extends TenantParams {
  assignmentId: string;
}

export async function inviteStaffHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: InviteStaffRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await staffService.inviteStaff(req.params.tenantId, req.body, requireActor(req));
  return sendSuccess(reply, result, 201);
}

export async function acceptStaffInvitationHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: AcceptStaffInvitationRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const profile = await staffService.acceptInvitation(req.params.tenantId, req.body);
  return sendSuccess(reply, profile);
}

export async function listStaffHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const staff = await staffService.listStaff(req.params.tenantId, requireActor(req));
  return sendSuccess(reply, { staff });
}

export async function getStaffHandler(
  req: FastifyRequest<{ Params: StaffParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const staff = await staffService.getStaff(
    req.params.tenantId,
    req.params.staffProfileId,
    requireActor(req),
  );
  return sendSuccess(reply, staff);
}

export async function changeStaffRoleHandler(
  req: FastifyRequest<{ Params: StaffParams; Body: ChangeStaffRoleRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const staff = await staffService.changePrimaryRole(
    req.params.tenantId,
    req.params.staffProfileId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, staff);
}

export async function createSubjectAssignmentHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: CreateSubjectAssignmentRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const assignment = await staffService.createSubjectAssignment(
    req.params.tenantId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, assignment, 201);
}

export async function removeSubjectAssignmentHandler(
  req: FastifyRequest<{ Params: AssignmentParams; Body: RemoveSubjectAssignmentRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const assignment = await staffService.removeSubjectAssignment(
    req.params.tenantId,
    req.params.assignmentId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, assignment);
}

export async function assignClassTeacherHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: AssignClassTeacherRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const assignment = await staffService.assignClassTeacher(
    req.params.tenantId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, assignment, 201);
}

export async function designateBackupHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: DesignateBackupRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const assignment = await staffService.designateBackup(
    req.params.tenantId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, assignment, 201);
}

export async function deactivateStaffHandler(
  req: FastifyRequest<{ Params: StaffParams; Body: DeactivateStaffRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const staff = await staffService.deactivateStaff(
    req.params.tenantId,
    req.params.staffProfileId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, staff);
}

export async function reactivateStaffHandler(
  req: FastifyRequest<{ Params: StaffParams; Body: ReactivateStaffRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const staff = await staffService.reactivateStaff(
    req.params.tenantId,
    req.params.staffProfileId,
    requireActor(req),
  );
  return sendSuccess(reply, staff);
}
