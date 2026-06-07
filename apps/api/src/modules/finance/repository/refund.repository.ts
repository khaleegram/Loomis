import { and, desc, eq } from 'drizzle-orm';
import { invoices, payments, refundRequests } from '../../../../drizzle/schema/finance.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { OutboxEventInput } from '../types.js';
import { financeOutboxRepository } from './outbox.repository.js';

type RefundRow = typeof refundRequests.$inferSelect;

export const refundRepository = {
  async findById(tenantId: string, refundId: string): Promise<RefundRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(refundRequests)
        .where(and(eq(refundRequests.tenantId, tenantId), eq(refundRequests.id, refundId)))
        .limit(1);
      return row ?? null;
    });
  },

  async findByWorkflowInstanceId(tenantId: string, workflowInstanceId: string): Promise<RefundRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(refundRequests)
        .where(
          and(
            eq(refundRequests.tenantId, tenantId),
            eq(refundRequests.workflowInstanceId, workflowInstanceId),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async listRefunds(
    tenantId: string,
    filters: { termId?: string; paymentId?: string; status?: string },
  ): Promise<RefundRow[]> {
    return withTenantContext(tenantId, async (tx) => {
      const conditions = [eq(refundRequests.tenantId, tenantId)];
      if (filters.termId) conditions.push(eq(refundRequests.termId, filters.termId));
      if (filters.paymentId) conditions.push(eq(refundRequests.paymentId, filters.paymentId));
      if (filters.status) conditions.push(eq(refundRequests.status, filters.status));
      return tx
        .select()
        .from(refundRequests)
        .where(and(...conditions))
        .orderBy(desc(refundRequests.createdAt));
    });
  },

  async countRefundsInTerm(tenantId: string, termId: string): Promise<number> {
    return withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({ id: refundRequests.id })
        .from(refundRequests)
        .where(
          and(
            eq(refundRequests.tenantId, tenantId),
            eq(refundRequests.termId, termId),
            eq(refundRequests.status, 'executed'),
          ),
        );
      return rows.length;
    });
  },

  async createRefundRequest(params: {
    id: string;
    tenantId: string;
    paymentId: string;
    invoiceId: string;
    termId: string;
    studentId: string;
    amountMinor: number;
    reasonCode: string;
    reasonNotes: string;
    workflowInstanceId: string;
    requestedById: string;
    event: OutboxEventInput;
  }): Promise<RefundRow> {
    return withTenantContext(params.tenantId, async (tx) => {
      const [row] = await tx
        .insert(refundRequests)
        .values({
          id: params.id,
          tenantId: params.tenantId,
          paymentId: params.paymentId,
          invoiceId: params.invoiceId,
          termId: params.termId,
          studentId: params.studentId,
          amountMinor: params.amountMinor,
          reasonCode: params.reasonCode,
          reasonNotes: params.reasonNotes,
          psfTreatment: 'not_reversed',
          status: 'pending',
          workflowInstanceId: params.workflowInstanceId,
          requestedById: params.requestedById,
        })
        .returning();
      if (!row) throw new Error('Failed to create refund request');

      await financeOutboxRepository.append(tx, params.event);
      return row;
    });
  },

  async updateStatus(params: {
    tenantId: string;
    refundId: string;
    status: string;
    approvedById?: string | null;
  }): Promise<RefundRow | null> {
    return withTenantContext(params.tenantId, async (tx) => {
      const [row] = await tx
        .update(refundRequests)
        .set({
          status: params.status,
          ...(params.approvedById !== undefined ? { approvedById: params.approvedById } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(refundRequests.tenantId, params.tenantId), eq(refundRequests.id, params.refundId)))
        .returning();
      return row ?? null;
    });
  },

  /**
   * Executes an approved refund: reverses invoice balance and emits `refund.approved`
   * for the Ledger module to post the negative double-entry transaction.
   */
  async executeRefund(params: {
    tenantId: string;
    refundId: string;
    approvedById: string;
    event: OutboxEventInput;
  }): Promise<RefundRow> {
    return withTenantContext(params.tenantId, async (tx) => {
      const [refund] = await tx
        .select()
        .from(refundRequests)
        .where(and(eq(refundRequests.tenantId, params.tenantId), eq(refundRequests.id, params.refundId)))
        .limit(1);
      if (!refund) throw new Error('Refund request not found');
      if (refund.status === 'executed') return refund;

      const [payment] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.tenantId, params.tenantId), eq(payments.id, refund.paymentId)))
        .limit(1);
      if (!payment) throw new Error('Payment not found');

      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.tenantId, params.tenantId), eq(invoices.id, refund.invoiceId)))
        .limit(1);
      if (!invoice) throw new Error('Invoice not found');

      const newPaid = Math.max(0, invoice.amountPaidMinor - refund.amountMinor);
      const newBalance = invoice.amountChargedMinor - newPaid;
      const invoiceStatus =
        newPaid <= 0 ? 'issued' : newPaid >= invoice.amountChargedMinor ? 'paid' : 'partially_paid';

      await tx
        .update(invoices)
        .set({
          amountPaidMinor: newPaid,
          balanceMinor: newBalance,
          status: invoiceStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.tenantId, params.tenantId), eq(invoices.id, invoice.id)));

      const executedAt = new Date();
      const [updated] = await tx
        .update(refundRequests)
        .set({
          status: 'executed',
          approvedById: params.approvedById,
          executedAt,
          updatedAt: executedAt,
        })
        .where(and(eq(refundRequests.tenantId, params.tenantId), eq(refundRequests.id, refund.id)))
        .returning();
      if (!updated) throw new Error('Failed to execute refund');

      await financeOutboxRepository.append(tx, params.event);
      return updated;
    });
  },

  async attachPsfReversalWorkflow(params: {
    tenantId: string;
    refundId: string;
    psfReversalWorkflowId: string;
  }): Promise<RefundRow | null> {
    return withTenantContext(params.tenantId, async (tx) => {
      const [row] = await tx
        .update(refundRequests)
        .set({
          psfTreatment: 'reversal_pending',
          psfReversalWorkflowId: params.psfReversalWorkflowId,
          updatedAt: new Date(),
        })
        .where(and(eq(refundRequests.tenantId, params.tenantId), eq(refundRequests.id, params.refundId)))
        .returning();
      return row ?? null;
    });
  },

  async markPsfReversed(params: {
    tenantId: string;
    refundId: string;
    event: OutboxEventInput;
  }): Promise<RefundRow | null> {
    return withTenantContext(params.tenantId, async (tx) => {
      const [row] = await tx
        .update(refundRequests)
        .set({
          psfTreatment: 'reversed',
          updatedAt: new Date(),
        })
        .where(and(eq(refundRequests.tenantId, params.tenantId), eq(refundRequests.id, params.refundId)))
        .returning();
      if (!row) return null;

      await financeOutboxRepository.append(tx, params.event);
      return row;
    });
  },
};
