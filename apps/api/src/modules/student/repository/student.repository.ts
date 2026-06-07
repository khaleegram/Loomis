import { and, asc, count, eq, inArray } from 'drizzle-orm';
import {
  admissions,
  enrollments,
  parentIdentities,
  parentLinks,
  students,
} from '../../../../drizzle/schema/student.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type {
  AdmissionDecisionInput,
  CreateAdmissionInput,
  CreateEnrollmentInput,
  InitiateParentLinkInput,
} from '../types.js';
import { studentOutboxRepository } from './outbox.repository.js';
import { STUDENT_EVENT_TYPES, type StudentAdmittedPayload } from '../events/types.js';

const PARENT_LINK_TTL_MS = 48 * 60 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const studentRepository = {
  // ── Admissions ───────────────────────────────────────────────────────────────

  async createAdmission(tenantId: string, input: CreateAdmissionInput, createdById: string) {
    return withTenantContext(tenantId, async (tx) => {
      const referenceNumber = `ADM-${Date.now().toString(36).toUpperCase()}`;
      const [row] = await tx
        .insert(admissions)
        .values({
          tenantId,
          referenceNumber,
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          intendedClassLevelId: input.intendedClassLevelId,
          guardianName: input.guardianName,
          guardianEmail: normalizeEmail(input.guardianEmail),
          guardianPhone: input.guardianPhone,
          guardianRelationship: input.guardianRelationship,
          createdById,
        })
        .returning();
      if (!row) throw new Error('Failed to create admission');
      return row;
    });
  },

  async findAdmissionById(tenantId: string, admissionId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(admissions)
        .where(and(eq(admissions.tenantId, tenantId), eq(admissions.id, admissionId)))
        .limit(1);
      return row ?? null;
    });
  },

  async listAdmissions(tenantId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(admissions)
        .where(eq(admissions.tenantId, tenantId))
        .orderBy(asc(admissions.createdAt)),
    );
  },

  async admissionNoExists(tenantId: string, admissionNo: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({ id: students.id })
        .from(students)
        .where(and(eq(students.tenantId, tenantId), eq(students.admissionNo, admissionNo)))
        .limit(1);
      return row !== undefined;
    });
  },

  /**
   * Approves an admission and creates the student record in one transaction
   * (US-SIS-002). Decline only updates the admission row.
   */
  async decideAdmission(
    tenantId: string,
    admissionId: string,
    input: AdmissionDecisionInput,
    decidedById: string,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [admission] = await tx
        .select()
        .from(admissions)
        .where(and(eq(admissions.tenantId, tenantId), eq(admissions.id, admissionId)))
        .limit(1);
      if (!admission) return null;

      if (input.decision === 'decline') {
        const [updated] = await tx
          .update(admissions)
          .set({
            status: 'declined',
            declineReason: input.declineReason ?? null,
            decidedById,
            decidedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(admissions.tenantId, tenantId),
              eq(admissions.id, admissionId),
              eq(admissions.status, 'pending'),
            ),
          )
          .returning();
        return updated ? { admission: updated, student: null } : null;
      }

      const admissionNo =
        input.admissionNo ?? `STU-${admission.referenceNumber.replace(/^ADM-/, '')}`;
      const [student] = await tx
        .insert(students)
        .values({
          tenantId,
          admissionId,
          admissionNo,
          firstName: admission.firstName,
          lastName: admission.lastName,
          dateOfBirth: admission.dateOfBirth,
          gender: admission.gender,
          status: 'admitted',
          createdById: decidedById,
        })
        .returning();
      if (!student) throw new Error('Failed to create student');

      const [updatedAdmission] = await tx
        .update(admissions)
        .set({
          status: 'approved',
          studentId: student.id,
          decidedById,
          decidedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(admissions.tenantId, tenantId),
            eq(admissions.id, admissionId),
            eq(admissions.status, 'pending'),
          ),
        )
        .returning();
      if (!updatedAdmission) return null;

      const eventPayload: StudentAdmittedPayload = {
        tenantId,
        studentId: student.id,
        admissionId,
        admissionNo,
        admittedById: decidedById,
        admittedAt: now.toISOString(),
      };
      await studentOutboxRepository.append(tx, {
        tenantId,
        aggregateType: 'student',
        aggregateId: student.id,
        eventType: STUDENT_EVENT_TYPES.ADMITTED,
        payload: eventPayload as unknown as Record<string, unknown>,
      });

      return { admission: updatedAdmission, student };
    });
  },

  // ── Students ─────────────────────────────────────────────────────────────────

  async findStudentById(tenantId: string, studentId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(students)
        .where(and(eq(students.tenantId, tenantId), eq(students.id, studentId)))
        .limit(1);
      return row ?? null;
    });
  },

  async listStudents(tenantId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(students)
        .where(eq(students.tenantId, tenantId))
        .orderBy(asc(students.lastName), asc(students.firstName)),
    );
  },

  async recordIdentityAttestation(
    tenantId: string,
    studentId: string,
    attestationType: string,
    attestedById: string,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [row] = await tx
        .update(students)
        .set({
          identityAttestationType: attestationType,
          identityAttestedAt: now,
          identityAttestedById: attestedById,
          updatedAt: now,
        })
        .where(and(eq(students.tenantId, tenantId), eq(students.id, studentId)))
        .returning();
      return row ?? null;
    });
  },

  async updateStudentStatus(tenantId: string, studentId: string, status: string) {
    return withTenantContext(tenantId, async (tx) =>
      this.updateStudentStatusTx(tx, tenantId, studentId, status),
    );
  },

  async updateStudentStatusTx(
    tx: import('../../../shared/db.js').Executor,
    tenantId: string,
    studentId: string,
    status: string,
  ) {
    const now = new Date();
    const [row] = await tx
      .update(students)
      .set({ status, updatedAt: now })
      .where(and(eq(students.tenantId, tenantId), eq(students.id, studentId)))
      .returning();
    return row ?? null;
  },

  async markTransferredOut(
    tenantId: string,
    studentId: string,
    destinationSchool: string,
    reason: string,
    transferredById: string,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [row] = await tx
        .update(students)
        .set({
          status: 'transferred_out',
          transferDestination: destinationSchool,
          transferReason: reason,
          transferredAt: now,
          transferredById,
          updatedAt: now,
        })
        .where(and(eq(students.tenantId, tenantId), eq(students.id, studentId)))
        .returning();
      return row ?? null;
    });
  },

  // ── Enrollments ──────────────────────────────────────────────────────────────

  async findEnrollmentForTerm(tenantId: string, studentId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.tenantId, tenantId),
            eq(enrollments.studentId, studentId),
            eq(enrollments.termId, termId),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async listEnrollmentsForStudent(tenantId: string, studentId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(enrollments)
        .where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.studentId, studentId)))
        .orderBy(asc(enrollments.enrolledAt)),
    );
  },

  async createEnrollment(
    tenantId: string,
    studentId: string,
    input: CreateEnrollmentInput,
    enrolledById: string,
    billable: boolean,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [row] = await tx
        .insert(enrollments)
        .values({
          tenantId,
          studentId,
          termId: input.termId,
          classArmId: input.classArmId,
          status: billable ? 'active_billable' : 'active',
          enrolledById,
          enrolledAt: now,
        })
        .returning();
      if (!row) throw new Error('Failed to create enrollment');
      return row;
    });
  },

  async endActiveEnrollments(tenantId: string, studentId: string, endReason: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const rows = await tx
        .update(enrollments)
        .set({
          status: 'transferred',
          endedAt: now,
          endReason,
          updatedAt: now,
        })
        .where(
          and(
            eq(enrollments.tenantId, tenantId),
            eq(enrollments.studentId, studentId),
            inArray(enrollments.status, ['active', 'active_billable']),
          ),
        )
        .returning();
      return rows;
    });
  },

  /** Billable count for census lock (System Design §8.1 step 2). */
  async countBillableEnrollments(tenantId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({ total: count() })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.tenantId, tenantId),
            eq(enrollments.termId, termId),
            eq(enrollments.status, 'active_billable'),
          ),
        );
      return Number(row?.total ?? 0);
    });
  },

  /** Student IDs with active billable enrollment for a term (Ledger census consumer). */
  async listBillableStudentIds(tenantId: string, termId: string): Promise<string[]> {
    return withTenantContext(tenantId, async (tx) =>
      this.listBillableStudentIdsTx(tx, tenantId, termId),
    );
  },

  async listBillableStudentIdsTx(
    tx: import('../../../shared/db.js').Executor,
    tenantId: string,
    termId: string,
  ): Promise<string[]> {
    const rows = await tx
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.tenantId, tenantId),
          eq(enrollments.termId, termId),
          eq(enrollments.status, 'active_billable'),
        ),
      );
    return rows.map((row) => row.studentId);
  },

  async createEnrollmentTx(
    tx: import('../../../shared/db.js').Executor,
    tenantId: string,
    studentId: string,
    input: CreateEnrollmentInput,
    enrolledById: string,
    billable: boolean,
  ) {
    const now = new Date();
    const [row] = await tx
      .insert(enrollments)
      .values({
        tenantId,
        studentId,
        termId: input.termId,
        classArmId: input.classArmId,
        status: billable ? 'active_billable' : 'active',
        enrolledById,
        enrolledAt: now,
      })
      .returning();
    if (!row) throw new Error('Failed to create enrollment');
    return row;
  },

  // ── Parent identities (global — no tenant context) ───────────────────────────

  async findParentIdentityByEmail(emailNormalized: string) {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select()
        .from(parentIdentities)
        .where(eq(parentIdentities.emailNormalized, emailNormalized))
        .limit(1);
      return row ?? null;
    });
  },

  async findParentIdentitiesByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return withTenantContext(null, async (tx) =>
      tx.select().from(parentIdentities).where(inArray(parentIdentities.id, ids)),
    );
  },

  async findParentIdentityById(id: string) {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select()
        .from(parentIdentities)
        .where(eq(parentIdentities.id, id))
        .limit(1);
      return row ?? null;
    });
  },

  async upsertParentIdentity(input: {
    emailNormalized: string;
    phoneE164: string;
    fullName: string;
    userId?: string | null;
  }) {
    return withTenantContext(null, async (tx) => {
      const existing = await tx
        .select()
        .from(parentIdentities)
        .where(eq(parentIdentities.emailNormalized, input.emailNormalized))
        .limit(1);
      if (existing[0]) {
        const now = new Date();
        const [updated] = await tx
          .update(parentIdentities)
          .set({
            fullName: input.fullName,
            phoneE164: input.phoneE164,
            userId: input.userId ?? existing[0].userId,
            updatedAt: now,
          })
          .where(eq(parentIdentities.id, existing[0].id))
          .returning();
        return updated ?? existing[0];
      }

      const [created] = await tx
        .insert(parentIdentities)
        .values({
          emailNormalized: input.emailNormalized,
          phoneE164: input.phoneE164,
          fullName: input.fullName,
          userId: input.userId ?? null,
        })
        .returning();
      if (!created) throw new Error('Failed to create parent identity');
      return created;
    });
  },

  async markParentIdentityVerified(parentIdentityId: string, factor: 'email_otp' | 'phone_otp') {
    return withTenantContext(null, async (tx) => {
      const now = new Date();
      const [existing] = await tx
        .select()
        .from(parentIdentities)
        .where(eq(parentIdentities.id, parentIdentityId))
        .limit(1);
      if (!existing) return null;

      const [row] = await tx
        .update(parentIdentities)
        .set({
          status: 'verified',
          emailVerifiedAt: factor === 'email_otp' ? now : existing.emailVerifiedAt,
          phoneVerifiedAt: factor === 'phone_otp' ? now : existing.phoneVerifiedAt,
          updatedAt: now,
        })
        .where(eq(parentIdentities.id, parentIdentityId))
        .returning();
      return row ?? null;
    });
  },

  // ── Parent links (per-tenant) ────────────────────────────────────────────────

  async findParentLinkById(tenantId: string, linkId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(parentLinks)
        .where(and(eq(parentLinks.tenantId, tenantId), eq(parentLinks.id, linkId)))
        .limit(1);
      return row ?? null;
    });
  },

  async listParentLinksForStudent(tenantId: string, studentId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(parentLinks)
        .where(and(eq(parentLinks.tenantId, tenantId), eq(parentLinks.studentId, studentId)))
        .orderBy(asc(parentLinks.createdAt)),
    );
  },

  async createParentLink(
    tenantId: string,
    parentIdentityId: string,
    studentId: string,
    input: InitiateParentLinkInput,
    initiatedById: string,
    otpHash: string,
    otpExpiresAt: Date,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + PARENT_LINK_TTL_MS);
      const [row] = await tx
        .insert(parentLinks)
        .values({
          tenantId,
          parentIdentityId,
          studentId,
          relationship: input.relationship,
          status: 'school_attested',
          otpHash,
          otpExpiresAt,
          initiatedById,
          schoolAttestedById: initiatedById,
          schoolAttestedAt: now,
          expiresAt,
        })
        .returning();
      if (!row) throw new Error('Failed to create parent link');
      return row;
    });
  },

  async activateParentLink(tenantId: string, linkId: string, verifiedByFactor: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [row] = await tx
        .update(parentLinks)
        .set({
          status: 'active',
          verifiedByFactor,
          activatedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(parentLinks.tenantId, tenantId),
            eq(parentLinks.id, linkId),
            inArray(parentLinks.status, ['initiated', 'school_attested', 'parent_verified']),
          ),
        )
        .returning();
      return row ?? null;
    });
  },
};
