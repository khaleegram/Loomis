import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  AcceptParentLinkRequest,
  AdmissionDecisionRequest,
  CreateAdmissionRequest,
  CreateEnrollmentRequest,
  InitiateParentLinkRequest,
  RecordIdentityAttestationRequest,
  SetStudentPhotoRequest,
  TransferStudentOutRequest,
} from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { sendSuccess } from '../../../shared/http.js';
import {
  admissionService,
  enrollmentService,
  parentLinkService,
  studentService,
} from '../services/index.js';
import { requireActor } from './_context.js';

interface TenantParams {
  tenantId: string;
}

interface StudentParams extends TenantParams {
  studentId: string;
}

interface AdmissionParams extends TenantParams {
  admissionId: string;
}

interface ParentLinkParams {
  linkId: string;
}

export async function createAdmissionHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: CreateAdmissionRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const admission = await admissionService.createAdmission(
    req.params.tenantId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, admission, 201);
}

export async function listAdmissionsHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const admissions = await admissionService.listAdmissions(req.params.tenantId, requireActor(req));
  return sendSuccess(reply, { admissions });
}

export async function getAdmissionHandler(
  req: FastifyRequest<{ Params: AdmissionParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const admission = await admissionService.getAdmission(
    req.params.tenantId,
    req.params.admissionId,
    requireActor(req),
  );
  return sendSuccess(reply, admission);
}

export async function admissionDecisionHandler(
  req: FastifyRequest<{ Params: AdmissionParams; Body: AdmissionDecisionRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await admissionService.decideAdmission(
    req.params.tenantId,
    req.params.admissionId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, result);
}

export async function listStudentsHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const students = await studentService.listStudents(req.params.tenantId, requireActor(req));
  return sendSuccess(reply, { students });
}

export async function getStudentHandler(
  req: FastifyRequest<{ Params: StudentParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const student = await studentService.getStudent(
    req.params.tenantId,
    req.params.studentId,
    requireActor(req),
  );
  return sendSuccess(reply, student);
}

export async function getStudentProfileHandler(
  req: FastifyRequest<{ Params: StudentParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const profile = await studentService.getStudentProfile(
    req.params.tenantId,
    req.params.studentId,
    requireActor(req),
  );
  return sendSuccess(reply, profile);
}

export async function recordIdentityAttestationHandler(
  req: FastifyRequest<{ Params: StudentParams; Body: RecordIdentityAttestationRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const student = await studentService.recordIdentityAttestation(
    req.params.tenantId,
    req.params.studentId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, student);
}

export async function createEnrollmentHandler(
  req: FastifyRequest<{ Params: StudentParams; Body: CreateEnrollmentRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const enrollment = await enrollmentService.enrollStudent(
    req.params.tenantId,
    req.params.studentId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, enrollment, 201);
}

export async function initiateParentLinkHandler(
  req: FastifyRequest<{ Params: StudentParams; Body: InitiateParentLinkRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const link = await parentLinkService.initiateParentLink(
    req.params.tenantId,
    req.params.studentId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, link, 201);
}

export async function acceptParentLinkHandler(
  req: FastifyRequest<{ Params: ParentLinkParams; Body: AcceptParentLinkRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const header = req.headers['x-tenant-id'];
  const tenantId = Array.isArray(header) ? header[0] : header;
  if (!tenantId) {
    throw new LoomisError(
      'FORBIDDEN',
      403,
      'X-Tenant-Id header is required to accept a parent-student link',
    );
  }

  const link = await parentLinkService.acceptParentLink(
    tenantId,
    req.params.linkId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, link);
}

export async function transferStudentOutHandler(
  req: FastifyRequest<{ Params: StudentParams; Body: TransferStudentOutRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await studentService.transferOut(
    req.params.tenantId,
    req.params.studentId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, result);
}

export async function setStudentPhotoHandler(
  req: FastifyRequest<{ Params: StudentParams; Body: SetStudentPhotoRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const student = await studentService.setPhoto(
    req.params.tenantId,
    req.params.studentId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, student);
}
