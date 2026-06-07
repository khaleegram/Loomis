import { and, eq, inArray, sql } from 'drizzle-orm';
import { classTeacherAssignments, staffProfiles } from '../../../../drizzle/schema/hrm.js';
import { users } from '../../../../drizzle/schema/identity.js';
import { enrollments, parentIdentities, parentLinks } from '../../../../drizzle/schema/student.js';
import type { Executor } from '../../../shared/db.js';

export const recipientRepository = {
  async parentUserIdsForClassArm(
    tx: Executor,
    tenantId: string,
    termId: string,
    classArmId: string,
  ): Promise<string[]> {
    const rows = await tx
      .selectDistinct({ userId: parentIdentities.userId })
      .from(enrollments)
      .innerJoin(parentLinks, eq(parentLinks.studentId, enrollments.studentId))
      .innerJoin(parentIdentities, eq(parentIdentities.id, parentLinks.parentIdentityId))
      .where(
        and(
          eq(enrollments.tenantId, tenantId),
          eq(enrollments.termId, termId),
          eq(enrollments.classArmId, classArmId),
          inArray(enrollments.status, ['active', 'active_billable']),
          eq(parentLinks.tenantId, tenantId),
          eq(parentLinks.status, 'active'),
          sql`${parentIdentities.userId} IS NOT NULL`,
        ),
      );

    return rows.map((r) => r.userId).filter((id): id is string => Boolean(id));
  },

  async parentUserIdsForClassArmOnly(
    tx: Executor,
    tenantId: string,
    classArmId: string,
  ): Promise<string[]> {
    const rows = await tx
      .selectDistinct({ userId: parentIdentities.userId })
      .from(enrollments)
      .innerJoin(parentLinks, eq(parentLinks.studentId, enrollments.studentId))
      .innerJoin(parentIdentities, eq(parentIdentities.id, parentLinks.parentIdentityId))
      .where(
        and(
          eq(enrollments.tenantId, tenantId),
          eq(enrollments.classArmId, classArmId),
          inArray(enrollments.status, ['active', 'active_billable']),
          eq(parentLinks.tenantId, tenantId),
          eq(parentLinks.status, 'active'),
          sql`${parentIdentities.userId} IS NOT NULL`,
        ),
      );

    return rows.map((r) => r.userId).filter((id): id is string => Boolean(id));
  },

  async parentUserIdsForStudent(
    tx: Executor,
    tenantId: string,
    studentId: string,
  ): Promise<string[]> {
    const rows = await tx
      .selectDistinct({ userId: parentIdentities.userId })
      .from(parentLinks)
      .innerJoin(parentIdentities, eq(parentIdentities.id, parentLinks.parentIdentityId))
      .where(
        and(
          eq(parentLinks.tenantId, tenantId),
          eq(parentLinks.studentId, studentId),
          eq(parentLinks.status, 'active'),
          sql`${parentIdentities.userId} IS NOT NULL`,
        ),
      );

    return rows.map((r) => r.userId).filter((id): id is string => Boolean(id));
  },

  async isClassTeacherForArm(
    tx: Executor,
    tenantId: string,
    userId: string,
    termId: string,
    classArmId: string,
  ): Promise<boolean> {
    const [row] = await tx
      .select({ id: classTeacherAssignments.id })
      .from(classTeacherAssignments)
      .innerJoin(staffProfiles, eq(staffProfiles.id, classTeacherAssignments.staffProfileId))
      .where(
        and(
          eq(classTeacherAssignments.tenantId, tenantId),
          eq(staffProfiles.userId, userId),
          eq(classTeacherAssignments.termId, termId),
          eq(classTeacherAssignments.classArmId, classArmId),
          eq(classTeacherAssignments.active, true),
        ),
      )
      .limit(1);
    return Boolean(row);
  },

  async announcementRecipientUserIds(
    tx: Executor,
    tenantId: string,
    audience: 'all' | 'staff_and_parents',
  ): Promise<string[]> {
    const staffRoles =
      audience === 'all'
        ? [
            'school_owner',
            'principal',
            'admin_officer',
            'accountant',
            'cashier',
            'exam_officer',
            'deputy_exam_officer',
            'timetable_officer',
            'teacher',
            'class_teacher',
            'student',
          ]
        : [
            'school_owner',
            'principal',
            'admin_officer',
            'accountant',
            'cashier',
            'exam_officer',
            'deputy_exam_officer',
            'timetable_officer',
            'teacher',
            'class_teacher',
          ];

    const staffRows = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), inArray(users.role, staffRoles)));

    const parentRows = await tx
      .selectDistinct({ userId: parentIdentities.userId })
      .from(parentLinks)
      .innerJoin(parentIdentities, eq(parentIdentities.id, parentLinks.parentIdentityId))
      .where(
        and(
          eq(parentLinks.tenantId, tenantId),
          eq(parentLinks.status, 'active'),
          sql`${parentIdentities.userId} IS NOT NULL`,
        ),
      );

    const ids = new Set<string>();
    for (const row of staffRows) ids.add(row.id);
    for (const row of parentRows) {
      if (row.userId) ids.add(row.userId);
    }
    if (audience === 'all') {
      const studentRows = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.role, 'student')));
      for (const row of studentRows) ids.add(row.id);
    }
    return [...ids];
  },

  async getUserEmail(tx: Executor, userId: string): Promise<string | null> {
    const [row] = await tx
      .select({ email: users.email, phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row?.email ?? null;
  },

  async getUserPhone(tx: Executor, userId: string): Promise<string | null> {
    const [row] = await tx
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row?.phone ?? null;
  },
};
