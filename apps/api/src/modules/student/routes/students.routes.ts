import type { FastifyInstance } from 'fastify';
import {
  acceptParentLinkRequest,
  createEnrollmentRequest,
  generateLeavingCertificateRequest,
  initiateParentLinkRequest,
  recordIdentityAttestationRequest,
  setStudentPhotoRequest,
  transferStudentOutRequest,
  type AcceptParentLinkRequest,
  type CreateEnrollmentRequest,
  type GenerateLeavingCertificateRequest,
  type InitiateParentLinkRequest,
  type RecordIdentityAttestationRequest,
  type SetStudentPhotoRequest,
  type TransferStudentOutRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  acceptParentLinkHandler,
  createEnrollmentHandler,
  generateLeavingCertificateHandler,
  getStudentHandler,
  getStudentProfileHandler,
  initiateParentLinkHandler,
  listAttestationsHandler,
  listLeavingCertificatesHandler,
  listStudentsHandler,
  listStudentCertificatesHandler,
  listTermEnrollmentRosterHandler,
  recordIdentityAttestationHandler,
  setStudentPhotoHandler,
  transferStudentOutHandler,
} from '../handlers/index.js';

const studentReaders = [
  'school_owner',
  'principal',
  'admin_officer',
  'exam_officer',
  'deputy_exam_officer',
  'teacher',
  'accountant',
  'cashier',
] as const;
const studentWriters = ['school_owner', 'principal', 'admin_officer'] as const;
const transferApprovers = ['school_owner', 'principal', 'admin_officer'] as const;
const promotionRosterReaders = [
  'school_owner',
  'principal',
  'admin_officer',
  'class_teacher',
  'teacher',
  'exam_officer',
  'deputy_exam_officer',
] as const;
const certificateReaders = ['school_owner', 'principal', 'admin_officer', 'exam_officer'] as const;
const certificateGenerators = ['school_owner', 'principal'] as const;

export async function studentsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/students',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...studentReaders)],
    },
    listStudentsHandler,
  );

  app.get<{ Params: { tenantId: string; studentId: string } }>(
    '/tenants/:tenantId/students/:studentId',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...studentReaders)],
    },
    getStudentHandler,
  );

  app.get<{ Params: { tenantId: string; studentId: string } }>(
    '/tenants/:tenantId/students/:studentId/profile',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('school_owner', 'principal')],
    },
    getStudentProfileHandler,
  );

  app.post<{
    Params: { tenantId: string; studentId: string };
    Body: RecordIdentityAttestationRequest;
  }>(
    '/tenants/:tenantId/students/:studentId/identity-attestation',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...studentWriters)],
      preValidation: [validateBody(recordIdentityAttestationRequest)],
    },
    recordIdentityAttestationHandler,
  );

  app.post<{
    Params: { tenantId: string; studentId: string };
    Body: CreateEnrollmentRequest;
  }>(
    '/tenants/:tenantId/students/:studentId/enrollments',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...studentWriters),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(createEnrollmentRequest)],
    },
    createEnrollmentHandler,
  );

  app.get<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId/enrollment-roster',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...promotionRosterReaders)],
    },
    listTermEnrollmentRosterHandler,
  );

  app.get<{ Params: { tenantId: string; yearId: string } }>(
    '/tenants/:tenantId/academic-years/:yearId/leaving-certificates',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...certificateReaders)],
    },
    listLeavingCertificatesHandler,
  );

  app.get<{ Params: { tenantId: string; studentId: string } }>(
    '/tenants/:tenantId/students/:studentId/certificates',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...certificateReaders)],
    },
    listStudentCertificatesHandler,
  );

  app.post<{
    Params: { tenantId: string; studentId: string };
    Body: GenerateLeavingCertificateRequest;
  }>(
    '/tenants/:tenantId/students/:studentId/leaving-certificate',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...certificateGenerators)],
      preValidation: [validateBody(generateLeavingCertificateRequest)],
    },
    generateLeavingCertificateHandler,
  );

  app.post<{
    Params: { tenantId: string; studentId: string };
    Body: InitiateParentLinkRequest;
  }>(
    '/tenants/:tenantId/students/:studentId/parent-links',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('admin_officer'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(initiateParentLinkRequest)],
    },
    initiateParentLinkHandler,
  );

  app.post<{
    Params: { tenantId: string; studentId: string };
    Body: TransferStudentOutRequest;
  }>(
    '/tenants/:tenantId/students/:studentId/transfer-out',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...transferApprovers),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(transferStudentOutRequest)],
    },
    transferStudentOutHandler,
  );

  app.patch<{ Params: { tenantId: string; studentId: string }; Body: SetStudentPhotoRequest }>(
    '/tenants/:tenantId/students/:studentId/photo',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...studentWriters)],
      preValidation: [validateBody(setStudentPhotoRequest)],
    },
    setStudentPhotoHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: { limit?: string } }>(
    '/tenants/:tenantId/attestations',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner', 'principal'),
      ],
    },
    listAttestationsHandler,
  );

  /** US-SIS-005. Parent-only; no tenant header required (parent JWT is cross-tenant). */
  app.post<{ Params: { linkId: string }; Body: AcceptParentLinkRequest }>(
    '/parent/parent-links/:linkId/accept',
    {
      preHandler: [authenticate, requireRole('parent')],
      preValidation: [validateBody(acceptParentLinkRequest)],
    },
    acceptParentLinkHandler,
  );
}
