import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import {
  classTeacherAssignments,
  roleAssignments,
  staffInvitations,
  staffProfiles,
  subjectAssignments,
} from '../../../../drizzle/schema/hrm.js';
import { users } from '../../../../drizzle/schema/identity.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type {
  CreateInvitationInput,
  CreateRoleAssignmentInput,
  CreateStaffProfileInput,
} from '../types.js';

export const staffRepository = {
  async listProfiles(tenantId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select({
          profile: staffProfiles,
          userPhotoStorageObjectId: users.photoStorageObjectId,
        })
        .from(staffProfiles)
        .innerJoin(users, eq(staffProfiles.userId, users.id))
        .where(eq(staffProfiles.tenantId, tenantId)),
    );
  },

  async findProfileById(tenantId: string, staffProfileId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [profile] = await tx
        .select()
        .from(staffProfiles)
        .where(and(eq(staffProfiles.tenantId, tenantId), eq(staffProfiles.id, staffProfileId)))
        .limit(1);
      return profile ?? null;
    });
  },

  async findProfileWithUserPhoto(tenantId: string, staffProfileId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({
          profile: staffProfiles,
          userPhotoStorageObjectId: users.photoStorageObjectId,
        })
        .from(staffProfiles)
        .innerJoin(users, eq(staffProfiles.userId, users.id))
        .where(and(eq(staffProfiles.tenantId, tenantId), eq(staffProfiles.id, staffProfileId)))
        .limit(1);
      return row ?? null;
    });
  },

  async findProfileByUserId(tenantId: string, userId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [profile] = await tx
        .select()
        .from(staffProfiles)
        .where(and(eq(staffProfiles.tenantId, tenantId), eq(staffProfiles.userId, userId)))
        .limit(1);
      return profile ?? null;
    });
  },

  /** Updates a staff member's contact fields (used when correcting an owner's email/phone). */
  async updateProfileContact(
    tenantId: string,
    userId: string,
    fields: { email?: string; phone?: string; fullName?: string },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (fields.email !== undefined) set.email = fields.email.toLowerCase();
      if (fields.phone !== undefined) set.phone = fields.phone;
      if (fields.fullName !== undefined) set.fullName = fields.fullName;
      const [profile] = await tx
        .update(staffProfiles)
        .set(set)
        .where(and(eq(staffProfiles.tenantId, tenantId), eq(staffProfiles.userId, userId)))
        .returning();
      return profile ?? null;
    });
  },

  async createStaffWithInvitation(input: {
    profile: CreateStaffProfileInput;
    roleAssignment: Omit<CreateRoleAssignmentInput, 'staffProfileId'>;
    invitation: Omit<CreateInvitationInput, 'staffProfileId'>;
  }) {
    return withTenantContext(input.profile.tenantId, async (tx) => {
      const [profile] = await tx.insert(staffProfiles).values(input.profile).returning();
      if (!profile) throw new Error('Failed to create staff profile');

      const [roleAssignment] = await tx
        .insert(roleAssignments)
        .values({ ...input.roleAssignment, staffProfileId: profile.id })
        .returning();
      if (!roleAssignment) throw new Error('Failed to assign role');

      const [invitation] = await tx
        .insert(staffInvitations)
        .values({ ...input.invitation, staffProfileId: profile.id })
        .returning();
      if (!invitation) throw new Error('Failed to create invitation');

      return { profile, roleAssignment, invitation };
    });
  },

  async createStaffProfile(input: {
    profile: CreateStaffProfileInput & { status: 'active'; joinedAt: Date };
    roleAssignment: Omit<CreateRoleAssignmentInput, 'staffProfileId'>;
  }) {
    return withTenantContext(input.profile.tenantId, async (tx) => {
      const [profile] = await tx.insert(staffProfiles).values(input.profile).returning();
      if (!profile) throw new Error('Failed to create staff profile');

      const [roleAssignment] = await tx
        .insert(roleAssignments)
        .values({ ...input.roleAssignment, staffProfileId: profile.id })
        .returning();
      if (!roleAssignment) throw new Error('Failed to assign role');

      return { profile, roleAssignment };
    });
  },

  async findInvitationByTokenHash(tokenHash: string, tenantIdHint?: string) {
    if (tenantIdHint) {
      return withTenantContext(tenantIdHint, async (tx) => {
        const [invitation] = await tx
          .select()
          .from(staffInvitations)
          .where(eq(staffInvitations.tokenHash, tokenHash))
          .limit(1);
        return invitation ?? null;
      });
    }

    const invitations = await this.listProfilesByInvitationTokenAcrossTenants(tokenHash);
    return invitations[0] ?? null;
  },

  async listProfilesByInvitationTokenAcrossTenants(_tokenHash: string) {
    // BLOCKED: accepting invitations without a tenant hint needs a non-RLS lookup
    // projection or signed token tenant claims. We require X-Tenant-Id for now.
    return [];
  },

  async acceptInvitation(tenantId: string, invitationId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [invitation] = await tx
        .update(staffInvitations)
        .set({ acceptedAt: now, updatedAt: now })
        .where(and(eq(staffInvitations.tenantId, tenantId), eq(staffInvitations.id, invitationId)))
        .returning();
      if (!invitation) throw new Error('Failed to accept invitation');

      const [profile] = await tx
        .update(staffProfiles)
        .set({ status: 'active', joinedAt: now, updatedAt: now })
        .where(and(eq(staffProfiles.tenantId, tenantId), eq(staffProfiles.id, invitation.staffProfileId)))
        .returning();
      if (!profile) throw new Error('Failed to activate staff profile');

      return { invitation, profile };
    });
  },

  async listActiveRoles(tenantId: string, staffProfileId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.tenantId, tenantId),
            eq(roleAssignments.staffProfileId, staffProfileId),
            eq(roleAssignments.active, true),
          ),
        ),
    );
  },

  async findActivePrimaryUserIdForRole(tenantId: string, role: string): Promise<string | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({ userId: staffProfiles.userId })
        .from(staffProfiles)
        .innerJoin(
          roleAssignments,
          and(
            eq(roleAssignments.staffProfileId, staffProfiles.id),
            eq(roleAssignments.tenantId, staffProfiles.tenantId),
          ),
        )
        .where(
          and(
            eq(staffProfiles.tenantId, tenantId),
            eq(staffProfiles.status, 'active'),
            eq(roleAssignments.assignmentType, 'primary'),
            eq(roleAssignments.role, role),
            eq(roleAssignments.active, true),
          ),
        )
        .limit(1);
      return row?.userId ?? null;
    });
  },

  async countActivePrimaryRoleHolders(tenantId: string, role: string): Promise<number> {
    return withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({ userId: staffProfiles.userId })
        .from(staffProfiles)
        .innerJoin(
          roleAssignments,
          and(
            eq(roleAssignments.staffProfileId, staffProfiles.id),
            eq(roleAssignments.tenantId, staffProfiles.tenantId),
          ),
        )
        .where(
          and(
            eq(staffProfiles.tenantId, tenantId),
            eq(staffProfiles.status, 'active'),
            eq(roleAssignments.assignmentType, 'primary'),
            eq(roleAssignments.role, role),
            eq(roleAssignments.active, true),
          ),
        );
      return rows.length;
    });
  },

  async replacePrimaryRole(input: {
    tenantId: string;
    staffProfileId: string;
    newRole: string;
    approvedById: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const now = new Date();
      const previous = await tx
        .update(roleAssignments)
        .set({ active: false, effectiveTo: now, updatedAt: now })
        .where(
          and(
            eq(roleAssignments.tenantId, input.tenantId),
            eq(roleAssignments.staffProfileId, input.staffProfileId),
            eq(roleAssignments.assignmentType, 'primary'),
            eq(roleAssignments.active, true),
          ),
        )
        .returning();

      const [next] = await tx
        .insert(roleAssignments)
        .values({
          tenantId: input.tenantId,
          staffProfileId: input.staffProfileId,
          role: input.newRole,
          assignmentType: 'primary',
          approvedById: input.approvedById,
        })
        .returning();
      if (!next) throw new Error('Failed to replace primary role');
      return { previous: previous[0] ?? null, next };
    });
  },

  async addRoleExtension(
    tenantId: string,
    staffProfileId: string,
    role: 'teacher' | 'class_teacher',
    approvedById: string,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const [existing] = await tx
        .select()
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.tenantId, tenantId),
            eq(roleAssignments.staffProfileId, staffProfileId),
            eq(roleAssignments.role, role),
            eq(roleAssignments.active, true),
          ),
        )
        .limit(1);
      if (existing) return existing;

      const [assignment] = await tx
        .insert(roleAssignments)
        .values({
          tenantId,
          staffProfileId,
          role,
          assignmentType: 'extension',
          approvedById,
        })
        .returning();
      if (!assignment) throw new Error(`Failed to add ${role} extension`);
      return assignment;
    });
  },

  async addClassTeacherExtension(tenantId: string, staffProfileId: string, approvedById: string) {
    return staffRepository.addRoleExtension(
      tenantId,
      staffProfileId,
      'class_teacher',
      approvedById,
    );
  },

  async createSubjectAssignment(input: {
    tenantId: string;
    staffProfileId: string;
    termId: string;
    classArmId: string;
    subjectId: string;
    actorUserId: string;
    approvedById: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const [assignment] = await tx
        .insert(subjectAssignments)
        .values({
          tenantId: input.tenantId,
          staffProfileId: input.staffProfileId,
          termId: input.termId,
          classArmId: input.classArmId,
          subjectId: input.subjectId,
          assignedById: input.actorUserId,
          approvedById: input.approvedById,
        })
        .returning();
      if (!assignment) throw new Error('Failed to create subject assignment');
      return assignment;
    });
  },

  async findActiveSubjectAssignment(input: {
    tenantId: string;
    staffProfileId: string;
    termId: string;
    classArmId: string;
    subjectId: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const [assignment] = await tx
        .select()
        .from(subjectAssignments)
        .where(
          and(
            eq(subjectAssignments.tenantId, input.tenantId),
            eq(subjectAssignments.staffProfileId, input.staffProfileId),
            eq(subjectAssignments.termId, input.termId),
            eq(subjectAssignments.classArmId, input.classArmId),
            eq(subjectAssignments.subjectId, input.subjectId),
            eq(subjectAssignments.active, true),
          ),
        )
        .limit(1);
      return assignment ?? null;
    });
  },

  async removeSubjectAssignment(tenantId: string, assignmentId: string, actorUserId: string, reason: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [assignment] = await tx
        .update(subjectAssignments)
        .set({
          active: false,
          effectiveTo: now,
          removedAt: now,
          removedById: actorUserId,
          removalReason: reason,
          updatedAt: now,
        })
        .where(and(eq(subjectAssignments.tenantId, tenantId), eq(subjectAssignments.id, assignmentId)))
        .returning();
      return assignment ?? null;
    });
  },

  async findActiveClassTeacherForArm(tenantId: string, termId: string, classArmId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [assignment] = await tx
        .select()
        .from(classTeacherAssignments)
        .where(
          and(
            eq(classTeacherAssignments.tenantId, tenantId),
            eq(classTeacherAssignments.termId, termId),
            eq(classTeacherAssignments.classArmId, classArmId),
            eq(classTeacherAssignments.active, true),
          ),
        )
        .limit(1);
      return assignment ?? null;
    });
  },

  async findActiveClassTeacherForStaffTerm(tenantId: string, staffProfileId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [assignment] = await tx
        .select()
        .from(classTeacherAssignments)
        .where(
          and(
            eq(classTeacherAssignments.tenantId, tenantId),
            eq(classTeacherAssignments.staffProfileId, staffProfileId),
            eq(classTeacherAssignments.termId, termId),
            eq(classTeacherAssignments.active, true),
          ),
        )
        .limit(1);
      return assignment ?? null;
    });
  },

  async assignClassTeacher(input: {
    tenantId: string;
    staffProfileId: string;
    termId: string;
    classArmId: string;
    actorUserId: string;
    replacedAssignmentId?: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const now = new Date();
      if (input.replacedAssignmentId) {
        await tx
          .update(classTeacherAssignments)
          .set({ active: false, effectiveTo: now, updatedAt: now })
          .where(
            and(
              eq(classTeacherAssignments.tenantId, input.tenantId),
              eq(classTeacherAssignments.id, input.replacedAssignmentId),
            ),
          );
      }

      await tx
        .update(classTeacherAssignments)
        .set({ active: false, effectiveTo: now, updatedAt: now })
        .where(
          and(
            eq(classTeacherAssignments.tenantId, input.tenantId),
            eq(classTeacherAssignments.staffProfileId, input.staffProfileId),
            eq(classTeacherAssignments.termId, input.termId),
            eq(classTeacherAssignments.active, true),
            ne(classTeacherAssignments.classArmId, input.classArmId),
          ),
        );

      const [assignment] = await tx
        .insert(classTeacherAssignments)
        .values({
          tenantId: input.tenantId,
          staffProfileId: input.staffProfileId,
          termId: input.termId,
          classArmId: input.classArmId,
          assignedById: input.actorUserId,
          replacedAssignmentId: input.replacedAssignmentId ?? null,
        })
        .returning();
      if (!assignment) throw new Error('Failed to assign class teacher');
      return assignment;
    });
  },

  async createBackupDesignation(input: {
    tenantId: string;
    primaryStaffProfileId: string;
    backupStaffProfileId: string;
    role: string;
    approvedById: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const now = new Date();
      await tx
        .update(roleAssignments)
        .set({ active: false, effectiveTo: now, updatedAt: now })
        .where(
          and(
            eq(roleAssignments.tenantId, input.tenantId),
            eq(roleAssignments.primaryStaffProfileId, input.primaryStaffProfileId),
            eq(roleAssignments.role, input.role),
            eq(roleAssignments.active, true),
          ),
        );

      const [assignment] = await tx
        .insert(roleAssignments)
        .values({
          tenantId: input.tenantId,
          staffProfileId: input.backupStaffProfileId,
          primaryStaffProfileId: input.primaryStaffProfileId,
          role: input.role,
          assignmentType: input.role === 'exam_officer' ? 'deputy' : 'backup',
          approvedById: input.approvedById,
        })
        .returning();
      if (!assignment) throw new Error('Failed to create backup designation');
      return assignment;
    });
  },

  async listActiveBackupDesignations(tenantId: string, primaryStaffProfileId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.tenantId, tenantId),
            eq(roleAssignments.primaryStaffProfileId, primaryStaffProfileId),
            eq(roleAssignments.active, true),
          ),
        ),
    );
  },

  async deactivateProfile(input: {
    tenantId: string;
    staffProfileId: string;
    actorUserId: string;
    reason: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const now = new Date();
      const [profile] = await tx
        .update(staffProfiles)
        .set({
          status: 'deactivated',
          deactivatedAt: now,
          deactivatedById: input.actorUserId,
          deactivationReason: input.reason,
          updatedAt: now,
        })
        .where(and(eq(staffProfiles.tenantId, input.tenantId), eq(staffProfiles.id, input.staffProfileId)))
        .returning();
      if (!profile) return null;

      await tx
        .update(roleAssignments)
        .set({ active: false, effectiveTo: now, updatedAt: now })
        .where(
          and(
            eq(roleAssignments.tenantId, input.tenantId),
            eq(roleAssignments.staffProfileId, input.staffProfileId),
            eq(roleAssignments.active, true),
          ),
        );
      await tx
        .update(subjectAssignments)
        .set({ active: false, effectiveTo: now, removedAt: now, removedById: input.actorUserId, updatedAt: now })
        .where(
          and(
            eq(subjectAssignments.tenantId, input.tenantId),
            eq(subjectAssignments.staffProfileId, input.staffProfileId),
            eq(subjectAssignments.active, true),
          ),
        );
      await tx
        .update(classTeacherAssignments)
        .set({ active: false, effectiveTo: now, updatedAt: now })
        .where(
          and(
            eq(classTeacherAssignments.tenantId, input.tenantId),
            eq(classTeacherAssignments.staffProfileId, input.staffProfileId),
            eq(classTeacherAssignments.active, true),
          ),
        );
      return profile;
    });
  },

  async reactivateProfile(input: {
    tenantId: string;
    staffProfileId: string;
    actorUserId: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const now = new Date();
      const [profile] = await tx
        .update(staffProfiles)
        .set({
          status: 'active',
          reactivatedAt: now,
          reactivatedById: input.actorUserId,
          updatedAt: now,
        })
        .where(and(eq(staffProfiles.tenantId, input.tenantId), eq(staffProfiles.id, input.staffProfileId)))
        .returning();
      return profile ?? null;
    });
  },

  async listActiveSubjectAssignments(tenantId: string, staffProfileId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(subjectAssignments)
        .where(
          and(
            eq(subjectAssignments.tenantId, tenantId),
            eq(subjectAssignments.staffProfileId, staffProfileId),
            eq(subjectAssignments.active, true),
          ),
        ),
    );
  },

  /** Active subject assignments for a class arm — used by the timetable builder (US-ACA-006). */
  async listSubjectAssignmentsForClassArm(
    tenantId: string,
    termId: string,
    classArmId: string,
  ) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select({
          assignmentId: subjectAssignments.id,
          subjectId: subjectAssignments.subjectId,
          teacherStaffProfileId: subjectAssignments.staffProfileId,
          teacherName: staffProfiles.fullName,
        })
        .from(subjectAssignments)
        .innerJoin(staffProfiles, eq(staffProfiles.id, subjectAssignments.staffProfileId))
        .where(
          and(
            eq(subjectAssignments.tenantId, tenantId),
            eq(subjectAssignments.termId, termId),
            eq(subjectAssignments.classArmId, classArmId),
            eq(subjectAssignments.active, true),
          ),
        )
        .orderBy(asc(subjectAssignments.subjectId)),
    );
  },

  async listSubjectAssignmentsForTerm(tenantId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select({
          assignmentId: subjectAssignments.id,
          classArmId: subjectAssignments.classArmId,
          subjectId: subjectAssignments.subjectId,
          staffProfileId: subjectAssignments.staffProfileId,
          staffName: staffProfiles.fullName,
        })
        .from(subjectAssignments)
        .innerJoin(staffProfiles, eq(staffProfiles.id, subjectAssignments.staffProfileId))
        .where(
          and(
            eq(subjectAssignments.tenantId, tenantId),
            eq(subjectAssignments.termId, termId),
            eq(subjectAssignments.active, true),
          ),
        )
        .orderBy(asc(subjectAssignments.classArmId), asc(subjectAssignments.subjectId)),
    );
  },

  async listClassTeacherAssignmentsForTerm(tenantId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select({
          assignmentId: classTeacherAssignments.id,
          classArmId: classTeacherAssignments.classArmId,
          staffProfileId: classTeacherAssignments.staffProfileId,
          staffName: staffProfiles.fullName,
        })
        .from(classTeacherAssignments)
        .innerJoin(staffProfiles, eq(staffProfiles.id, classTeacherAssignments.staffProfileId))
        .where(
          and(
            eq(classTeacherAssignments.tenantId, tenantId),
            eq(classTeacherAssignments.termId, termId),
            eq(classTeacherAssignments.active, true),
          ),
        )
        .orderBy(asc(classTeacherAssignments.classArmId)),
    );
  },

  async listActiveClassTeacherAssignments(tenantId: string, staffProfileId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(classTeacherAssignments)
        .where(
          and(
            eq(classTeacherAssignments.tenantId, tenantId),
            eq(classTeacherAssignments.staffProfileId, staffProfileId),
            eq(classTeacherAssignments.active, true),
          ),
        ),
    );
  },

  async findActiveInvitationForProfile(tenantId: string, staffProfileId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [invitation] = await tx
        .select()
        .from(staffInvitations)
        .where(
          and(
            eq(staffInvitations.tenantId, tenantId),
            eq(staffInvitations.staffProfileId, staffProfileId),
            isNull(staffInvitations.acceptedAt),
            isNull(staffInvitations.revokedAt),
          ),
        )
        .limit(1);
      return invitation ?? null;
    });
  },

  async findInvitationById(tenantId: string, invitationId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [invitation] = await tx
        .select()
        .from(staffInvitations)
        .where(
          and(eq(staffInvitations.tenantId, tenantId), eq(staffInvitations.id, invitationId)),
        )
        .limit(1);
      return invitation ?? null;
    });
  },

  async rotateInvitationToken(
    tenantId: string,
    invitationId: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const [invitation] = await tx
        .update(staffInvitations)
        .set({ tokenHash, expiresAt, updatedAt: new Date() })
        .where(
          and(
            eq(staffInvitations.tenantId, tenantId),
            eq(staffInvitations.id, invitationId),
            isNull(staffInvitations.acceptedAt),
            isNull(staffInvitations.revokedAt),
          ),
        )
        .returning();
      return invitation ?? null;
    });
  },

  async setPhoto(tenantId: string, staffProfileId: string, storageObjectId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [updated] = await tx
        .update(staffProfiles)
        .set({ photoStorageObjectId: storageObjectId, updatedAt: new Date() })
        .where(
          and(
            eq(staffProfiles.tenantId, tenantId),
            eq(staffProfiles.id, staffProfileId),
          ),
        )
        .returning();
      return updated ?? null;
    });
  },

  async findActiveUserIdsByRole(
    tenantId: string,
    role: string,
  ): Promise<Array<{ userId: string; email: string | null }>> {
    return withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({
          userId: staffProfiles.userId,
          email: users.email,
        })
        .from(roleAssignments)
        .innerJoin(staffProfiles, eq(roleAssignments.staffProfileId, staffProfiles.id))
        .innerJoin(users, eq(staffProfiles.userId, users.id))
        .where(
          and(
            eq(roleAssignments.tenantId, tenantId),
            eq(roleAssignments.role, role),
            eq(roleAssignments.active, true),
          ),
        );
      return rows;
    });
  },
};
