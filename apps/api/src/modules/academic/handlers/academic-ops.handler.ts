import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  AmendAttendanceRequest,
  CreateAssignmentRequest,
  CreateSubmissionRequest,
  CreateTimetableEntryRequest,
  GradeSubmissionRequest,
  ListAssignmentsQuery,
  ListAttendanceQuery,
  ListTimetableQuery,
  ListTimetableSubjectOptionsQuery,
  MarkAttendanceRequest,
  MyTimetableQuery,
  PublishTimetableRequest,
  RegisterDeviceKeyRequest,
  SyncOfflineAttendanceRequest,
  UpdateAssignmentRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { assignmentService } from '../services/assignment.service.js';
import { attendanceService } from '../services/attendance.service.js';
import { deviceKeyService } from '../services/device-key.service.js';
import { timetableService } from '../services/timetable.service.js';
import { bellScheduleService } from '../services/bell-schedule.service.js';
import { requireActor } from './_context.js';
import {
  assignmentToResponse,
  attendanceRecordToResponse,
  deviceKeyToResponse,
  submissionToResponse,
  timetableEntryToResponse,
} from './_ops-serializers.js';

interface TenantParams {
  tenantId: string;
}

// ── Attendance (CON-003 / US-ACA-005) ────────────────────────────────────────

export async function markAttendanceHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: MarkAttendanceRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const records = await attendanceService.markAttendance(
    req.params.tenantId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, { records: records.map(attendanceRecordToResponse) }, 201);
}

export async function syncOfflineAttendanceHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: SyncOfflineAttendanceRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const records = await attendanceService.syncOfflineAttendance(
    req.params.tenantId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(
    reply,
    { applied: records.length, records: records.map(attendanceRecordToResponse) },
    201,
  );
}

export async function amendAttendanceHandler(
  req: FastifyRequest<{ Params: TenantParams & { recordId: string }; Body: AmendAttendanceRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const record = await attendanceService.amendAttendance(
    req.params.tenantId,
    req.params.recordId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, attendanceRecordToResponse(record));
}

export async function listAttendanceHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: ListAttendanceQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const records = await attendanceService.listAttendance(
    req.params.tenantId,
    req.query,
    requireActor(req),
  );
  return sendSuccess(reply, { records: records.map(attendanceRecordToResponse) });
}

// ── Attendance device keys (MOB-007) ─────────────────────────────────────────

export async function registerDeviceKeyHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: RegisterDeviceKeyRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const device = await deviceKeyService.registerDeviceKey(
    req.params.tenantId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, deviceKeyToResponse(device), 201);
}

export async function listDeviceKeysHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const devices = await deviceKeyService.listDeviceKeys(req.params.tenantId, requireActor(req));
  return sendSuccess(reply, { devices: devices.map(deviceKeyToResponse) });
}

export async function revokeDeviceKeyHandler(
  req: FastifyRequest<{ Params: TenantParams & { deviceId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const device = await deviceKeyService.revokeDeviceKey(
    req.params.tenantId,
    req.params.deviceId,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, deviceKeyToResponse(device));
}

// ── Timetable (FR-ACA-001 / US-ACA-006) ──────────────────────────────────────

export async function createTimetableEntryHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: CreateTimetableEntryRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const entry = await timetableService.createEntry(
    req.params.tenantId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, timetableEntryToResponse(entry), 201);
}

export async function listTimetableHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: ListTimetableQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const entries = await timetableService.listTimetable(
    req.params.tenantId,
    req.query,
    requireActor(req),
  );
  return sendSuccess(reply, { entries: entries.map(timetableEntryToResponse) });
}

export async function listTimetableSubjectOptionsHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: ListTimetableSubjectOptionsQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const options = await timetableService.listSubjectOptions(
    req.params.tenantId,
    req.query,
    requireActor(req),
  );
  return sendSuccess(reply, {
    options: options.map((option) => ({
      assignmentId: option.assignmentId,
      subjectId: option.subjectId,
      teacherStaffProfileId: option.teacherStaffProfileId,
      teacherName: option.teacherName,
    })),
  });
}

export async function listStudentTimetableHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: MyTimetableQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await timetableService.listMyTimetable(
    req.params.tenantId,
    req.query.termId,
    requireActor(req),
  );
  return sendSuccess(reply, {
    entries: result.entries.map(timetableEntryToResponse),
    classArmId: result.classArmId,
    classArmLabel: result.classArmLabel,
  });
}

export async function publishTimetableHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: PublishTimetableRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await timetableService.publishTimetable(
    req.params.tenantId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, result);
}

export async function deleteTimetableEntryHandler(
  req: FastifyRequest<{ Params: TenantParams & { entryId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const entry = await timetableService.deleteEntry(
    req.params.tenantId,
    req.params.entryId,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, timetableEntryToResponse(entry));
}

export async function timetableTermSummaryHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: { termId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const summary = await timetableService.summarizeTerm(
    req.params.tenantId,
    req.query.termId,
    requireActor(req),
  );
  return sendSuccess(reply, summary);
}

export async function timetablePublishPreviewHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: { termId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const preview = await timetableService.getPublishPreview(
    req.params.tenantId,
    req.query.termId,
    requireActor(req),
  );
  return sendSuccess(reply, preview);
}

export async function getBellScheduleHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: { academicYearId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const schedule = await bellScheduleService.getForYear(
    req.params.tenantId,
    req.query.academicYearId,
    requireActor(req),
  );
  return sendSuccess(reply, schedule);
}

export async function upsertBellScheduleHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: import('@loomis/contracts').UpsertBellScheduleRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const schedule = await bellScheduleService.upsert(
    req.params.tenantId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, schedule);
}

// ── Assignments & submissions (FR-ACA-003 / US-ACA-007) ──────────────────────

export async function createAssignmentHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: CreateAssignmentRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const assignment = await assignmentService.createAssignment(
    req.params.tenantId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, assignmentToResponse(assignment), 201);
}

export async function updateAssignmentHandler(
  req: FastifyRequest<{
    Params: TenantParams & { assignmentId: string };
    Body: UpdateAssignmentRequest;
  }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const assignment = await assignmentService.updateAssignment(
    req.params.tenantId,
    req.params.assignmentId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, assignmentToResponse(assignment));
}

export async function publishAssignmentHandler(
  req: FastifyRequest<{ Params: TenantParams & { assignmentId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const assignment = await assignmentService.publishAssignment(
    req.params.tenantId,
    req.params.assignmentId,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, assignmentToResponse(assignment));
}

export async function listAssignmentsHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: ListAssignmentsQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const assignments = await assignmentService.listAssignments(
    req.params.tenantId,
    req.query,
    requireActor(req),
  );
  return sendSuccess(reply, { assignments: assignments.map(assignmentToResponse) });
}

export async function submitAssignmentHandler(
  req: FastifyRequest<{
    Params: TenantParams & { assignmentId: string };
    Body: CreateSubmissionRequest;
  }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const submission = await assignmentService.submitAssignment(
    req.params.tenantId,
    req.params.assignmentId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, submissionToResponse(submission), 201);
}

export async function gradeSubmissionHandler(
  req: FastifyRequest<{
    Params: TenantParams & { submissionId: string };
    Body: GradeSubmissionRequest;
  }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const submission = await assignmentService.gradeSubmission(
    req.params.tenantId,
    req.params.submissionId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, submissionToResponse(submission));
}

export async function listSubmissionsHandler(
  req: FastifyRequest<{ Params: TenantParams & { assignmentId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const submissions = await assignmentService.listSubmissions(
    req.params.tenantId,
    req.params.assignmentId,
    requireActor(req),
  );
  return sendSuccess(reply, { submissions: submissions.map(submissionToResponse) });
}
