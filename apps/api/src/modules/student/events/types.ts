/** Student module outbox event types (System Design §7). */
export const STUDENT_EVENT_TYPES = {
  ADMITTED: 'student.admitted',
  ENROLLED: 'student.enrolled',
  /** Post-census billable enrollment — Ledger creates a PSF obligation immediately. */
  LATE_ENROLLED: 'student.late_enrolled',
  TRANSFERRED_OUT: 'student.transferred_out',
  PARENT_LINK_INITIATED: 'parent.link.initiated',
  PARENT_LINK_VERIFIED: 'parent.link.verified',
} as const;

export interface StudentAdmittedPayload {
  tenantId: string;
  studentId: string;
  admissionId: string;
  admissionNo: string;
  admittedById: string;
  admittedAt: string;
}

export interface StudentEnrolledPayload {
  tenantId: string;
  studentId: string;
  enrollmentId: string;
  termId: string;
  classArmId: string;
  status: string;
  enrolledById: string;
  enrolledAt: string;
}

export interface StudentLateEnrolledPayload extends Record<string, unknown> {
  tenantId: string;
  studentId: string;
  enrollmentId: string;
  termId: string;
  classArmId: string;
  rateSnapshotId: string;
  psfRateMinor: number;
  enrolledById: string;
  enrolledAt: string;
}

export interface StudentTransferredOutPayload {
  tenantId: string;
  studentId: string;
  destinationSchool: string;
  reason: string;
  transferredById: string;
  transferredAt: string;
}

export interface ParentLinkInitiatedPayload {
  tenantId: string;
  parentLinkId: string;
  parentIdentityId: string;
  studentId: string;
  initiatedById: string;
  expiresAt: string;
}

export interface ParentLinkVerifiedPayload {
  tenantId: string;
  parentLinkId: string;
  parentIdentityId: string;
  studentId: string;
  verifiedByFactor: string;
  activatedAt: string;
}
