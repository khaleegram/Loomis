import { and, desc, eq } from 'drizzle-orm';
import { payments, reconciliationExceptions } from '../../../../drizzle/schema/finance.js';
import { db } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

type ExceptionRow = typeof reconciliationExceptions.$inferSelect;
type PaymentRow = typeof payments.$inferSelect;

export const reconciliationRepository = {
  async listExceptions(
    tenantId: string | null,
    filters: { status?: string; provider?: string },
  ): Promise<ExceptionRow[]> {
    if (tenantId) {
      return withTenantContext(tenantId, async (tx) => {
        const conditions = [eq(reconciliationExceptions.tenantId, tenantId)];
        if (filters.status) conditions.push(eq(reconciliationExceptions.status, filters.status));
        if (filters.provider) conditions.push(eq(reconciliationExceptions.provider, filters.provider));
        return tx
          .select()
          .from(reconciliationExceptions)
          .where(and(...conditions))
          .orderBy(desc(reconciliationExceptions.createdAt));
      });
    }

    const conditions = [];
    if (filters.status) conditions.push(eq(reconciliationExceptions.status, filters.status));
    if (filters.provider) conditions.push(eq(reconciliationExceptions.provider, filters.provider));

    const query = db.select().from(reconciliationExceptions).orderBy(desc(reconciliationExceptions.createdAt));
    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    return query;
  },

  async findExceptionById(tenantId: string | null, exceptionId: string): Promise<ExceptionRow | null> {
    if (tenantId) {
      return withTenantContext(tenantId, async (tx) => {
        const [row] = await tx
          .select()
          .from(reconciliationExceptions)
          .where(
            and(
              eq(reconciliationExceptions.id, exceptionId),
              eq(reconciliationExceptions.tenantId, tenantId),
            ),
          )
          .limit(1);
        return row ?? null;
      });
    }

    const [row] = await db
      .select()
      .from(reconciliationExceptions)
      .where(eq(reconciliationExceptions.id, exceptionId))
      .limit(1);
    return row ?? null;
  },

  async insertExceptions(rows: Array<{
    id: string;
    tenantId: string | null;
    provider: string;
    exceptionType: string;
    gatewayReference: string | null;
    paymentId: string | null;
    gatewayAmountMinor: number | null;
    platformAmountMinor: number | null;
    settlementDate: string;
    reconciliationRunId: string;
  }>): Promise<number> {
    if (rows.length === 0) return 0;

    await db.insert(reconciliationExceptions).values(
      rows.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        provider: row.provider,
        exceptionType: row.exceptionType,
        gatewayReference: row.gatewayReference,
        paymentId: row.paymentId,
        gatewayAmountMinor: row.gatewayAmountMinor,
        platformAmountMinor: row.platformAmountMinor,
        settlementDate: row.settlementDate,
        reconciliationRunId: row.reconciliationRunId,
        status: 'open',
      })),
    );
    return rows.length;
  },

  async resolveException(params: {
    tenantId: string | null;
    exceptionId: string;
    status: 'resolved' | 'ignored';
    resolutionNotes: string;
    resolvedById: string;
  }): Promise<ExceptionRow | null> {
    const resolvedAt = new Date();
    const updateValues = {
      status: params.status,
      resolutionNotes: params.resolutionNotes,
      resolvedById: params.resolvedById,
      resolvedAt,
      updatedAt: resolvedAt,
    };

    if (params.tenantId) {
      return withTenantContext(params.tenantId, async (tx) => {
        const [row] = await tx
          .update(reconciliationExceptions)
          .set(updateValues)
          .where(
            and(
              eq(reconciliationExceptions.id, params.exceptionId),
              eq(reconciliationExceptions.tenantId, params.tenantId!),
            ),
          )
          .returning();
        return row ?? null;
      });
    }

    const [row] = await db
      .update(reconciliationExceptions)
      .set(updateValues)
      .where(eq(reconciliationExceptions.id, params.exceptionId))
      .returning();
    return row ?? null;
  },

  /** Verified online payments for a settlement date (global scan for reconciliation). */
  async listVerifiedOnlinePaymentsByDate(settlementDate: string): Promise<PaymentRow[]> {
    return db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.channel, 'online'),
          eq(payments.status, 'verified'),
          eq(payments.paymentDate, settlementDate),
        ),
      );
  },

  async findOpenExceptionByReference(
    provider: string,
    gatewayReference: string,
  ): Promise<ExceptionRow | null> {
    const [row] = await db
      .select()
      .from(reconciliationExceptions)
      .where(
        and(
          eq(reconciliationExceptions.provider, provider),
          eq(reconciliationExceptions.gatewayReference, gatewayReference),
          eq(reconciliationExceptions.status, 'open'),
        ),
      )
      .limit(1);
    return row ?? null;
  },
};
