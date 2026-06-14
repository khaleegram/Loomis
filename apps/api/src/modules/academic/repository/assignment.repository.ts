import { and, asc, eq } from 'drizzle-orm';
import { assignments, submissions } from '../../../../drizzle/schema/academic.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

interface CreateAssignmentInput {
  termId: string;
  classArmId: string;
  subjectId: string;
  teacherStaffProfileId: string;
  title: string;
  instructions: string;
  dueAt: Date;
  maxScore: number;
}

interface UpdateAssignmentFields {
  title?: string | undefined;
  instructions?: string | undefined;
  dueAt?: Date | undefined;
  maxScore?: number | undefined;
}

/** Assignment and submission persistence (FR-ACA-003 / US-ACA-007). */
export const assignmentRepository = {
  async createAssignment(tenantId: string, input: CreateAssignmentInput, createdById: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .insert(assignments)
        .values({ tenantId, ...input, createdById })
        .returning();
      if (!row) throw new Error('Failed to create assignment');
      return row;
    });
  },

  async findAssignmentById(tenantId: string, id: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(assignments)
        .where(and(eq(assignments.tenantId, tenantId), eq(assignments.id, id)))
        .limit(1);
      return row ?? null;
    });
  },

  async updateAssignment(tenantId: string, id: string, fields: UpdateAssignmentFields) {
    return withTenantContext(tenantId, async (tx) => {
      const updates: Partial<typeof assignments.$inferInsert> = { updatedAt: new Date() };
      if (fields.title !== undefined) updates.title = fields.title;
      if (fields.instructions !== undefined) updates.instructions = fields.instructions;
      if (fields.dueAt !== undefined) updates.dueAt = fields.dueAt;
      if (fields.maxScore !== undefined) updates.maxScore = fields.maxScore;
      const [row] = await tx
        .update(assignments)
        .set(updates)
        .where(and(eq(assignments.tenantId, tenantId), eq(assignments.id, id)))
        .returning();
      return row ?? null;
    });
  },

  async publishAssignment(tenantId: string, id: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .update(assignments)
        .set({ status: 'published', updatedAt: new Date() })
        .where(and(eq(assignments.tenantId, tenantId), eq(assignments.id, id)))
        .returning();
      return row ?? null;
    });
  },

  async listAssignments(
    tenantId: string,
    filter: { termId: string; classArmId: string; subjectId?: string | undefined },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const conditions = [
        eq(assignments.tenantId, tenantId),
        eq(assignments.termId, filter.termId),
        eq(assignments.classArmId, filter.classArmId),
      ];
      if (filter.subjectId) {
        conditions.push(eq(assignments.subjectId, filter.subjectId));
      }
      return tx
        .select()
        .from(assignments)
        .where(and(...conditions))
        .orderBy(asc(assignments.dueAt));
    });
  },

  async listPublishedForClassArm(tenantId: string, termId: string, classArmId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(assignments)
        .where(
          and(
            eq(assignments.tenantId, tenantId),
            eq(assignments.termId, termId),
            eq(assignments.classArmId, classArmId),
            eq(assignments.status, 'published'),
          ),
        )
        .orderBy(asc(assignments.dueAt)),
    );
  },

  async listSubmissionsForStudent(tenantId: string, studentId: string, assignmentIds: string[]) {
    if (assignmentIds.length === 0) return [];
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(submissions)
        .where(and(eq(submissions.tenantId, tenantId), eq(submissions.studentId, studentId))),
    );
  },

  async createSubmission(
    tenantId: string,
    input: {
      assignmentId: string;
      studentId: string;
      content: string | null;
      storageObjectId: string | null;
      isLate: boolean;
      status: string;
    },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .insert(submissions)
        .values({ tenantId, ...input })
        .returning();
      if (!row) throw new Error('Failed to create submission');
      return row;
    });
  },

  async findSubmissionById(tenantId: string, id: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(submissions)
        .where(and(eq(submissions.tenantId, tenantId), eq(submissions.id, id)))
        .limit(1);
      return row ?? null;
    });
  },

  async findSubmissionByStudent(tenantId: string, assignmentId: string, studentId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(submissions)
        .where(
          and(
            eq(submissions.tenantId, tenantId),
            eq(submissions.assignmentId, assignmentId),
            eq(submissions.studentId, studentId),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async gradeSubmission(
    tenantId: string,
    id: string,
    input: { score: number; feedback: string | null; gradedByStaffProfileId: string },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [row] = await tx
        .update(submissions)
        .set({
          score: input.score,
          feedback: input.feedback,
          gradedByStaffProfileId: input.gradedByStaffProfileId,
          gradedAt: now,
          status: 'graded',
          updatedAt: now,
        })
        .where(and(eq(submissions.tenantId, tenantId), eq(submissions.id, id)))
        .returning();
      return row ?? null;
    });
  },

  async listSubmissions(tenantId: string, assignmentId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(submissions)
        .where(and(eq(submissions.tenantId, tenantId), eq(submissions.assignmentId, assignmentId)))
        .orderBy(asc(submissions.submittedAt)),
    );
  },
};
