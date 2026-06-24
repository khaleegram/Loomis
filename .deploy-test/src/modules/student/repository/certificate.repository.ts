import { and, desc, eq } from 'drizzle-orm';
import { studentCertificates } from '../../../../drizzle/schema/student.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const certificateRepository = {
  async findLeavingCertificate(
    tenantId: string,
    studentId: string,
    academicYearId: string,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(studentCertificates)
        .where(
          and(
            eq(studentCertificates.tenantId, tenantId),
            eq(studentCertificates.studentId, studentId),
            eq(studentCertificates.certificateType, 'leaving'),
            eq(studentCertificates.academicYearId, academicYearId),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async listLeavingCertificatesForYear(tenantId: string, academicYearId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(studentCertificates)
        .where(
          and(
            eq(studentCertificates.tenantId, tenantId),
            eq(studentCertificates.academicYearId, academicYearId),
            eq(studentCertificates.certificateType, 'leaving'),
          ),
        )
        .orderBy(desc(studentCertificates.issuedAt)),
    );
  },

  async listForStudent(tenantId: string, studentId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(studentCertificates)
        .where(
          and(
            eq(studentCertificates.tenantId, tenantId),
            eq(studentCertificates.studentId, studentId),
          ),
        )
        .orderBy(desc(studentCertificates.issuedAt)),
    );
  },

  async create(
    tenantId: string,
    input: {
      studentId: string;
      certificateType: 'leaving' | 'transfer';
      certificateNumber: string;
      academicYearId?: string | null;
      promotionRecordId?: string | null;
      storageObjectId: string;
      issuedById: string;
    },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .insert(studentCertificates)
        .values({
          tenantId,
          studentId: input.studentId,
          certificateType: input.certificateType,
          certificateNumber: input.certificateNumber,
          academicYearId: input.academicYearId ?? null,
          promotionRecordId: input.promotionRecordId ?? null,
          storageObjectId: input.storageObjectId,
          issuedById: input.issuedById,
        })
        .returning();
      if (!row) throw new Error('Failed to create student certificate');
      return row;
    });
  },
};
