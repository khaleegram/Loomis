import { and, eq } from 'drizzle-orm';
import { studentVirtualAccounts } from '../../../../drizzle/schema/finance.js';
import { db } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export type StudentVirtualAccountRow = typeof studentVirtualAccounts.$inferSelect;

export const virtualAccountRepository = {
  async findByStudent(tenantId: string, studentId: string): Promise<StudentVirtualAccountRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(studentVirtualAccounts)
        .where(
          and(
            eq(studentVirtualAccounts.tenantId, tenantId),
            eq(studentVirtualAccounts.studentId, studentId),
            eq(studentVirtualAccounts.status, 'active'),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async findByAccountRef(accountRef: string): Promise<StudentVirtualAccountRow | null> {
    const [row] = await db
      .select()
      .from(studentVirtualAccounts)
      .where(
        and(
          eq(studentVirtualAccounts.accountRef, accountRef),
          eq(studentVirtualAccounts.status, 'active'),
        ),
      )
      .limit(1);
    return row ?? null;
  },

  async insert(params: {
    id: string;
    tenantId: string;
    studentId: string;
    accountRef: string;
    accountNumber: string;
    bankName: string;
    accountName: string;
    nombaAccountHolderId: string | null;
  }): Promise<StudentVirtualAccountRow> {
    return withTenantContext(params.tenantId, async (tx) => {
      const [row] = await tx
        .insert(studentVirtualAccounts)
        .values({
          id: params.id,
          tenantId: params.tenantId,
          studentId: params.studentId,
          provider: 'nomba',
          accountRef: params.accountRef,
          accountNumber: params.accountNumber,
          bankName: params.bankName,
          accountName: params.accountName,
          nombaAccountHolderId: params.nombaAccountHolderId,
          status: 'active',
        })
        .returning();
      if (!row) throw new Error('Failed to store student virtual account');
      return row;
    });
  },
};
