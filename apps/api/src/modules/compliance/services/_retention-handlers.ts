import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { staffProfiles } from '../../../../drizzle/schema/hrm.js';
import { users } from '../../../../drizzle/schema/identity.js';
import {
  admissions,
  parentIdentities,
  students,
} from '../../../../drizzle/schema/student.js';
import type { Executor } from '../../../shared/db.js';
import { uuidv7 } from 'uuidv7';

function anonToken(): string {
  return `ANON-${uuidv7()}`;
}

/** Category-specific PII anonymisation handlers (System Design §19.2). */
export const retentionHandlers = {
  async anonymiseParentPii(tx: Executor, retentionDays: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const rows = await tx
      .select({ id: parentIdentities.id })
      .from(parentIdentities)
      .where(lt(parentIdentities.updatedAt, cutoff))
      .limit(500);

    const results: Array<{ id: string; tenantId: null }> = [];
    for (const row of rows) {
      const token = anonToken();
      await tx
        .update(parentIdentities)
        .set({
          fullName: token,
          emailNormalized: `${token}@anonymised.local`,
          phoneE164: null,
          updatedAt: new Date(),
        })
        .where(eq(parentIdentities.id, row.id));
      results.push({ id: row.id, tenantId: null });
    }
    return results;
  },

  async anonymiseStaffPii(tx: Executor, retentionDays: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const rows = await tx
      .select({ id: staffProfiles.id, tenantId: staffProfiles.tenantId })
      .from(staffProfiles)
      .where(
        and(
          eq(staffProfiles.status, 'deactivated'),
          sql`${staffProfiles.deactivatedAt} IS NOT NULL`,
          lt(staffProfiles.deactivatedAt, cutoff),
        ),
      )
      .limit(500);

    const results: Array<{ id: string; tenantId: string }> = [];
    for (const row of rows) {
      const token = anonToken();
      await tx
        .update(staffProfiles)
        .set({
          fullName: token,
          email: `${token}@anonymised.local`,
          phone: null,
          updatedAt: new Date(),
        })
        .where(eq(staffProfiles.id, row.id));
      results.push({ id: row.id, tenantId: row.tenantId });
    }
    return results;
  },

  async anonymiseStudentRecords(tx: Executor, retentionDays: number, anonymiseOnly: boolean) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const rows = await tx
      .select({ id: students.id, tenantId: students.tenantId })
      .from(students)
      .where(
        and(
          inArray(students.status, ['graduated', 'transferred_out', 'withdrawn']),
          lt(students.updatedAt, cutoff),
        ),
      )
      .limit(500);

    const results: Array<{ id: string; tenantId: string; hardDelete: boolean }> = [];
    for (const row of rows) {
      const token = anonToken();
      await tx
        .update(students)
        .set({
          firstName: token,
          lastName: 'ANON',
          updatedAt: new Date(),
        })
        .where(eq(students.id, row.id));
      results.push({ id: row.id, tenantId: row.tenantId, hardDelete: !anonymiseOnly });
    }
    return results;
  },

  async anonymiseAdmissionRecords(tx: Executor, retentionDays: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const rows = await tx
      .select({ id: admissions.id, tenantId: admissions.tenantId })
      .from(admissions)
      .where(
        and(
          inArray(admissions.status, ['declined', 'withdrawn']),
          lt(admissions.updatedAt, cutoff),
        ),
      )
      .limit(500);

    const results: Array<{ id: string; tenantId: string }> = [];
    for (const row of rows) {
      const token = anonToken();
      await tx
        .update(admissions)
        .set({
          firstName: token,
          lastName: 'ANON',
          guardianName: token,
          guardianEmail: `${token}@anonymised.local`,
          guardianPhone: '0000000000',
          updatedAt: new Date(),
        })
        .where(eq(admissions.id, row.id));
      results.push({ id: row.id, tenantId: row.tenantId });
    }
    return results;
  },

  async hardDeleteEligible(
    tx: Executor,
    targetSchema: string,
    targetTable: string,
    recordId: string,
  ): Promise<boolean> {
    if (targetSchema === 'student' && targetTable === 'admissions') {
      await tx.delete(admissions).where(eq(admissions.id, recordId));
      return true;
    }
    if (targetSchema === 'student' && targetTable === 'students') {
      await tx.delete(students).where(eq(students.id, recordId));
      return true;
    }
    return false;
  },
};

export async function collectDsarDataPackage(
  tx: Executor,
  input: {
    tenantId: string | null;
    subjectUserId: string | null;
    subjectIdentifiers: Record<string, string>;
  },
): Promise<Record<string, unknown>> {
  const package_: Record<string, unknown> = {
    collectedAt: new Date().toISOString(),
    schemas: {} as Record<string, unknown>,
  };

  const email = input.subjectIdentifiers.email?.toLowerCase();
  const phone = input.subjectIdentifiers.phone;
  const studentId = input.subjectIdentifiers.studentId;

  if (input.subjectUserId) {
    const [user] = await tx
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        role: users.role,
        tenantId: users.tenantId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, input.subjectUserId))
      .limit(1);
    if (user) {
      (package_.schemas as Record<string, unknown>).identity = { user };
    }
  }

  if (email) {
    const parentRows = await tx
      .select({
        id: parentIdentities.id,
        fullName: parentIdentities.fullName,
        emailNormalized: parentIdentities.emailNormalized,
        phoneE164: parentIdentities.phoneE164,
        status: parentIdentities.status,
        createdAt: parentIdentities.createdAt,
      })
      .from(parentIdentities)
      .where(eq(parentIdentities.emailNormalized, email));
    if (parentRows.length > 0) {
      (package_.schemas as Record<string, unknown>).parent_identities = parentRows;
    }
  }

  if (studentId && input.tenantId) {
    const [student] = await tx
      .select({
        id: students.id,
        admissionNo: students.admissionNo,
        firstName: students.firstName,
        lastName: students.lastName,
        dateOfBirth: students.dateOfBirth,
        gender: students.gender,
        status: students.status,
        createdAt: students.createdAt,
      })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.tenantId, input.tenantId)))
      .limit(1);
    if (student) {
      (package_.schemas as Record<string, unknown>).student = student;
    }
  }

  if (input.tenantId && (email || phone)) {
    const staffConditions = email
      ? [eq(staffProfiles.email, email)]
      : phone
        ? [eq(staffProfiles.phone, phone)]
        : [];
    if (staffConditions.length > 0) {
      const staffRows = await tx
        .select({
          id: staffProfiles.id,
          fullName: staffProfiles.fullName,
          email: staffProfiles.email,
          phone: staffProfiles.phone,
          status: staffProfiles.status,
          joinedAt: staffProfiles.joinedAt,
        })
        .from(staffProfiles)
        .where(and(eq(staffProfiles.tenantId, input.tenantId), ...staffConditions));
      if (staffRows.length > 0) {
        (package_.schemas as Record<string, unknown>).staff_profiles = staffRows;
      }
    }
  }

  return package_;
}
