import { z } from 'zod';
import { calendarDate } from '../academic/academic.schema.js';
import { emailDeliveryResult } from '../comms/comms.schema.js';

/**
 * Student module contracts (SRS §4.4 FR-SIS-001..008; CON-002; US-SIS-001..007).
 * Shared by API request/response validation and clients.
 */

export const studentGender = z.enum(['male', 'female', 'other', 'unknown']);
export type StudentGender = z.infer<typeof studentGender>;

export const guardianRelationship = z.enum([
  'mother',
  'father',
  'guardian',
  'sponsor',
  'other',
]);
export type GuardianRelationship = z.infer<typeof guardianRelationship>;

export const identityAttestationType = z.enum([
  'birth_certificate',
  'previous_school_record',
  'admission_photograph',
  'parent_consent',
]);
export type IdentityAttestationType = z.infer<typeof identityAttestationType>;

// ── Admissions ─────────────────────────────────────────────────────────────────

export const admissionStatus = z.enum(['pending', 'approved', 'declined', 'withdrawn']);
export type AdmissionStatus = z.infer<typeof admissionStatus>;

/** US-SIS-001 / FR-SIS-001. Admin Officer registers a new applicant. */
export const createAdmissionRequest = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: calendarDate,
  gender: studentGender.default('unknown'),
  intendedClassLevelId: z.string().uuid(),
  guardianName: z.string().min(2).max(200),
  guardianEmail: z.string().email(),
  guardianPhone: z.string().min(7).max(20),
  guardianRelationship: guardianRelationship,
});
export type CreateAdmissionRequest = z.infer<typeof createAdmissionRequest>;

/** US-SIS-002. Principal (or Owner) approves or declines an application. */
export const admissionDecisionRequest = z
  .object({
    decision: z.enum(['approve', 'decline']),
    declineReason: z.string().min(3).max(500).optional(),
    /** Assigned on approval; auto-generated if omitted. */
    admissionNo: z
      .string()
      .min(3)
      .max(64)
      .regex(/^[A-Za-z0-9-]+$/, 'Admission number must be alphanumeric')
      .optional(),
  })
  .refine((v) => v.decision !== 'decline' || v.declineReason !== undefined, {
    message: 'declineReason is required when declining',
    path: ['declineReason'],
  });
export type AdmissionDecisionRequest = z.infer<typeof admissionDecisionRequest>;

export const admissionResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  referenceNumber: z.string(),
  status: admissionStatus,
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: calendarDate,
  gender: studentGender,
  intendedClassLevelId: z.string().uuid(),
  guardianName: z.string(),
  guardianEmail: z.string().email(),
  guardianPhone: z.string(),
  guardianRelationship: guardianRelationship,
  declineReason: z.string().nullable(),
  studentId: z.string().uuid().nullable(),
  decidedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AdmissionResponse = z.infer<typeof admissionResponse>;

export const admissionListResponse = z.object({
  admissions: z.array(admissionResponse),
});
export type AdmissionListResponse = z.infer<typeof admissionListResponse>;

// ── Students ───────────────────────────────────────────────────────────────────

export const studentStatus = z.enum([
  'admitted',
  'enrolled',
  'graduated',
  'transferred_out',
  'withdrawn',
]);
export type StudentStatus = z.infer<typeof studentStatus>;

export const studentResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  admissionId: z.string().uuid(),
  admissionNo: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: calendarDate,
  gender: studentGender,
  status: studentStatus,
  userId: z.string().uuid().nullable().optional(),
  identityAttestationType: identityAttestationType.nullable(),
  identityAttestedAt: z.string().datetime().nullable(),
  photoStorageObjectId: z.string().uuid().nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type StudentResponse = z.infer<typeof studentResponse>;

export const portalCredentialsResponse = z.object({
  loginEmail: z.string().email(),
  temporaryPassword: z.string(),
});
export type PortalCredentialsResponse = z.infer<typeof portalCredentialsResponse>;

export const admissionDecisionResponse = z.object({
  admission: admissionResponse,
  student: studentResponse.nullable(),
  portalCredentials: portalCredentialsResponse.nullable().optional(),
  credentialsEmail: emailDeliveryResult.optional(),
});
export type AdmissionDecisionResponse = z.infer<typeof admissionDecisionResponse>;

/** US-SIS-001 create — pending application or auto-approved student when policy allows. */
export const createAdmissionResponse = z.object({
  admission: admissionResponse,
  student: studentResponse.nullable(),
  autoApproved: z.boolean(),
  portalCredentials: portalCredentialsResponse.nullable().optional(),
  credentialsEmail: emailDeliveryResult.optional(),
});
export type CreateAdmissionResponse = z.infer<typeof createAdmissionResponse>;

export const studentListResponse = z.object({
  students: z.array(studentResponse),
});
export type StudentListResponse = z.infer<typeof studentListResponse>;

/** FR-SIS-002. Record identity attestation before billable enrollment. */
export const recordIdentityAttestationRequest = z.object({
  attestationType: identityAttestationType,
});
export type RecordIdentityAttestationRequest = z.infer<
  typeof recordIdentityAttestationRequest
>;

// ── Enrollments ────────────────────────────────────────────────────────────────

export const enrollmentStatus = z.enum([
  'active',
  'active_billable',
  'suspended',
  'withdrawn',
  'transferred',
  'graduated',
]);
export type EnrollmentStatus = z.infer<typeof enrollmentStatus>;

/** US-SIS-003. Enroll an admitted student into a class arm for the open term. */
export const createEnrollmentRequest = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
});
export type CreateEnrollmentRequest = z.infer<typeof createEnrollmentRequest>;

export const enrollmentResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  status: enrollmentStatus,
  enrolledAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  endReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EnrollmentResponse = z.infer<typeof enrollmentResponse>;

// ── Parent links ───────────────────────────────────────────────────────────────

export const parentLinkStatus = z.enum([
  'initiated',
  'school_attested',
  'parent_verified',
  'active',
  'rejected',
  'revoked',
  'expired',
]);
export type ParentLinkStatus = z.infer<typeof parentLinkStatus>;

/** US-SIS-004. Admin Officer initiates; parent must verify via OTP. */
export const initiateParentLinkRequest = z.object({
  parentFullName: z.string().min(2).max(200),
  parentEmail: z.string().email(),
  parentPhone: z.string().min(7).max(20),
  relationship: guardianRelationship,
});
export type InitiateParentLinkRequest = z.infer<typeof initiateParentLinkRequest>;

/** US-SIS-005. Parent-only endpoint; Admin Officer cannot self-complete. */
export const acceptParentLinkRequest = z.object({
  otp: z.string().length(6).regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});
export type AcceptParentLinkRequest = z.infer<typeof acceptParentLinkRequest>;

export const parentLinkResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  parentIdentityId: z.string().uuid(),
  studentId: z.string().uuid(),
  relationship: guardianRelationship,
  status: parentLinkStatus,
  expiresAt: z.string().datetime(),
  activatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ParentLinkResponse = z.infer<typeof parentLinkResponse>;

export const parentIdentitySummary = z.object({
  id: z.string().uuid(),
  emailNormalized: z.string().email(),
  phoneE164: z.string().nullable(),
  fullName: z.string(),
  status: z.enum(['unverified', 'verified', 'recovery_locked', 'suspended']),
});
export type ParentIdentitySummary = z.infer<typeof parentIdentitySummary>;

// ── Transfer ───────────────────────────────────────────────────────────────────

/** US-SIS-006. Process a student transfer out. */
export const transferStudentOutRequest = z.object({
  destinationSchool: z.string().min(2).max(200),
  reason: z.string().min(3).max(500),
});
export type TransferStudentOutRequest = z.infer<typeof transferStudentOutRequest>;

export const transferStudentOutResponse = z.object({
  student: studentResponse,
  endedEnrollments: z.number().int().nonnegative(),
});
export type TransferStudentOutResponse = z.infer<typeof transferStudentOutResponse>;

// ── Profile ────────────────────────────────────────────────────────────────────

/** US-SIS-007. Aggregated student profile (separate queries, no cross-tenant joins). */
export const studentProfileResponse = z.object({
  student: studentResponse,
  admission: admissionResponse.nullable(),
  enrollments: z.array(enrollmentResponse),
  parentLinks: z.array(
    parentLinkResponse.extend({
      parentIdentity: parentIdentitySummary,
    }),
  ),
});
export type StudentProfileResponse = z.infer<typeof studentProfileResponse>;

export const setStudentPhotoRequest = z.object({
  storageObjectId: z.string().uuid(),
});
export type SetStudentPhotoRequest = z.infer<typeof setStudentPhotoRequest>;

/** Active enrollments in a term — used for year-end promotion staging (FR-ASM-007). */
export const termEnrollmentRosterEntry = z.object({
  enrollmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  admissionNo: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  classArmId: z.string().uuid(),
  classLevelId: z.string().uuid(),
  classArmName: z.string(),
  classLevelName: z.string(),
  classLevelCode: z.string(),
  status: enrollmentStatus,
});
export type TermEnrollmentRosterEntry = z.infer<typeof termEnrollmentRosterEntry>;

export const termEnrollmentRosterResponse = z.object({
  termId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  entries: z.array(termEnrollmentRosterEntry),
});
export type TermEnrollmentRosterResponse = z.infer<typeof termEnrollmentRosterResponse>;

// ── Certificates (US-ASM-006) ────────────────────────────────────────────────────

export const studentCertificateType = z.enum(['leaving', 'transfer']);
export type StudentCertificateType = z.infer<typeof studentCertificateType>;

/** Issued leaving or transfer certificate metadata (PDF stored in S3). */
export const studentCertificateResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  certificateType: studentCertificateType,
  certificateNumber: z.string(),
  academicYearId: z.string().uuid().nullable(),
  promotionRecordId: z.string().uuid().nullable(),
  storageObjectId: z.string().uuid(),
  issuedAt: z.string().datetime(),
  issuedById: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type StudentCertificateResponse = z.infer<typeof studentCertificateResponse>;

export const leavingCertificateListResponse = z.object({
  academicYearId: z.string().uuid(),
  certificates: z.array(studentCertificateResponse),
});
export type LeavingCertificateListResponse = z.infer<typeof leavingCertificateListResponse>;

export const studentCertificateListResponse = z.object({
  studentId: z.string().uuid(),
  certificates: z.array(studentCertificateResponse),
});
export type StudentCertificateListResponse = z.infer<typeof studentCertificateListResponse>;

/** On-demand leaving certificate generation when auto-issue failed or was skipped. */
export const generateLeavingCertificateRequest = z.object({
  academicYearId: z.string().uuid(),
});
export type GenerateLeavingCertificateRequest = z.infer<typeof generateLeavingCertificateRequest>;
