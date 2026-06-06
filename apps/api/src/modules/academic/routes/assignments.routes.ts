import type { FastifyInstance } from 'fastify';
import {
  createAssignmentRequest,
  createSubmissionRequest,
  gradeSubmissionRequest,
  listAssignmentsQuery,
  updateAssignmentRequest,
  type CreateAssignmentRequest,
  type CreateSubmissionRequest,
  type GradeSubmissionRequest,
  type ListAssignmentsQuery,
  type UpdateAssignmentRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody, validateQuery } from '../../../shared/validation.js';
import {
  createAssignmentHandler,
  gradeSubmissionHandler,
  listAssignmentsHandler,
  listSubmissionsHandler,
  publishAssignmentHandler,
  submitAssignmentHandler,
  updateAssignmentHandler,
} from '../handlers/academic-ops.handler.js';

// FR-ACA-003: Teachers (and Class Teachers, who are also Teachers) create and
// grade assignments for their own assigned subject. Students submit.
const assignmentAuthors = ['teacher', 'class_teacher'] as const;
const assignmentReaders = [
  'teacher',
  'class_teacher',
  'principal',
  'school_owner',
  'admin_officer',
  'student',
] as const;
const submissionReaders = ['teacher', 'class_teacher', 'principal', 'school_owner'] as const;

/** Assignment & submission routes (SRS §4.5 FR-ACA-003; US-ACA-007). */
export async function assignmentRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: CreateAssignmentRequest }>(
    '/tenants/:tenantId/assignments',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...assignmentAuthors)],
      preValidation: [validateBody(createAssignmentRequest)],
    },
    createAssignmentHandler,
  );

  app.patch<{ Params: { tenantId: string; assignmentId: string }; Body: UpdateAssignmentRequest }>(
    '/tenants/:tenantId/assignments/:assignmentId',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...assignmentAuthors)],
      preValidation: [validateBody(updateAssignmentRequest)],
    },
    updateAssignmentHandler,
  );

  app.post<{ Params: { tenantId: string; assignmentId: string } }>(
    '/tenants/:tenantId/assignments/:assignmentId/publish',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...assignmentAuthors)] },
    publishAssignmentHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: ListAssignmentsQuery }>(
    '/tenants/:tenantId/assignments',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...assignmentReaders)],
      preValidation: [validateQuery(listAssignmentsQuery)],
    },
    listAssignmentsHandler,
  );

  app.post<{ Params: { tenantId: string; assignmentId: string }; Body: CreateSubmissionRequest }>(
    '/tenants/:tenantId/assignments/:assignmentId/submissions',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('student')],
      preValidation: [validateBody(createSubmissionRequest)],
    },
    submitAssignmentHandler,
  );

  app.get<{ Params: { tenantId: string; assignmentId: string } }>(
    '/tenants/:tenantId/assignments/:assignmentId/submissions',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...submissionReaders)] },
    listSubmissionsHandler,
  );

  app.patch<{ Params: { tenantId: string; submissionId: string }; Body: GradeSubmissionRequest }>(
    '/tenants/:tenantId/submissions/:submissionId/grade',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...assignmentAuthors)],
      preValidation: [validateBody(gradeSubmissionRequest)],
    },
    gradeSubmissionHandler,
  );
}
