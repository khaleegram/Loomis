import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  invoices,
  payments,
  receipts,
  webhookEvents,
} from '../../../../drizzle/schema/finance.js';
import { db, type DbTransaction } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { OutboxEventInput } from '../types.js';
import { financeOutboxRepository } from './outbox.repository.js';

type PaymentRow = typeof payments.$inferSelect;
type ReceiptRow = typeof receipts.$inferSelect;
type WebhookEventRow = typeof webhookEvents.$inferSelect;

export interface PaymentWithReceipt {
  payment: PaymentRow;
  receipt: ReceiptRow | null;
}

function deriveInvoiceStatus(amountChargedMinor: number, amountPaidMinor: number): string {
  if (amountPaidMinor <= 0) return 'issued';
  if (amountPaidMinor >= amountChargedMinor) return 'paid';
  return 'partially_paid';
}

async function nextReceiptSequence(tx: DbTransaction, tenantId: string, termId: string): Promise<number> {
  const [row] = await tx
    .select({ maxSeq: sql<number>`coalesce(max(${receipts.sequenceNumber}), 0)` })
    .from(receipts)
    .where(and(eq(receipts.tenantId, tenantId), eq(receipts.termId, termId)));
  return (row?.maxSeq ?? 0) + 1;
}

export const paymentRepository = {
  async findPaymentById(tenantId: string, paymentId: string): Promise<PaymentWithReceipt | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.tenantId, tenantId), eq(payments.id, paymentId)))
        .limit(1);
      if (!payment) return null;
      const [receipt] = await tx
        .select()
        .from(receipts)
        .where(and(eq(receipts.tenantId, tenantId), eq(receipts.paymentId, paymentId)))
        .limit(1);
      return { payment, receipt: receipt ?? null };
    });
  },

  async findPaymentByIdempotencyKey(tenantId: string, idempotencyKey: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(
          and(eq(payments.tenantId, tenantId), eq(payments.idempotencyKey, idempotencyKey)),
        )
        .limit(1);
      return payment ?? null;
    });
  },

  async findPaymentByGatewayReference(
    provider: string,
    gatewayReference: string,
  ): Promise<PaymentRow | null> {
    // Gateway webhooks are global — search without tenant RLS by using a direct
    // connection query on the global payments table with provider+reference index.
    const [payment] = await db
      .select()
      .from(payments)
      .where(
        and(eq(payments.gatewayProvider, provider), eq(payments.gatewayReference, gatewayReference)),
      )
      .limit(1);
    return payment ?? null;
  },

  async listPayments(
    tenantId: string,
    filters: {
      termId?: string;
      studentId?: string;
      status?: string;
      channel?: string;
    },
  ): Promise<PaymentWithReceipt[]> {
    return withTenantContext(tenantId, async (tx) => {
      const conditions = [eq(payments.tenantId, tenantId)];
      if (filters.termId) conditions.push(eq(payments.termId, filters.termId));
      if (filters.studentId) conditions.push(eq(payments.studentId, filters.studentId));
      if (filters.status) conditions.push(eq(payments.status, filters.status));
      if (filters.channel) conditions.push(eq(payments.channel, filters.channel));

      const rows = await tx
        .select()
        .from(payments)
        .where(and(...conditions))
        .orderBy(desc(payments.createdAt));
      if (rows.length === 0) return [];

      const receiptRows = await tx
        .select()
        .from(receipts)
        .where(
          and(eq(receipts.tenantId, tenantId), inArray(receipts.paymentId, rows.map((r) => r.id))),
        );

      return rows.map((payment) => ({
        payment,
        receipt: receiptRows.find((r) => r.paymentId === payment.id) ?? null,
      }));
    });
  },

  async createOfflinePayment(params: {
    id: string;
    tenantId: string;
    invoiceId: string;
    termId: string;
    studentId: string;
    amountMinor: number;
    method: string;
    idempotencyKey: string;
    loggedById: string;
    paymentDate: string;
    channelReference: string | null;
    evidenceStorageObjectId: string | null;
    receiptId: string;
    lineItems: Array<Record<string, unknown>>;
    event: OutboxEventInput;
  }): Promise<PaymentWithReceipt> {
    return withTenantContext(params.tenantId, async (tx) => {
      const [payment] = await tx
        .insert(payments)
        .values({
          id: params.id,
          tenantId: params.tenantId,
          invoiceId: params.invoiceId,
          termId: params.termId,
          studentId: params.studentId,
          channel: 'offline',
          method: params.method,
          amountMinor: params.amountMinor,
          status: 'pending_verification',
          idempotencyKey: params.idempotencyKey,
          loggedById: params.loggedById,
          paymentDate: params.paymentDate,
          channelReference: params.channelReference,
          evidenceStorageObjectId: params.evidenceStorageObjectId,
        })
        .returning();
      if (!payment) throw new Error('Failed to create offline payment');

      const sequenceNumber = await nextReceiptSequence(tx, params.tenantId, params.termId);
      const [receipt] = await tx
        .insert(receipts)
        .values({
          id: params.receiptId,
          tenantId: params.tenantId,
          paymentId: payment.id,
          termId: params.termId,
          sequenceNumber,
          status: 'provisional',
          amountMinor: params.amountMinor,
          lineItems: params.lineItems,
          issuedById: params.loggedById,
        })
        .returning();
      if (!receipt) throw new Error('Failed to create provisional receipt');

      await financeOutboxRepository.append(tx, params.event);
      return { payment, receipt };
    });
  },

  async createOnlinePayment(params: {
    id: string;
    tenantId: string;
    invoiceId: string;
    termId: string;
    studentId: string;
    amountMinor: number;
    method: string;
    idempotencyKey: string;
    loggedById: string;
    paymentDate: string;
    gatewayProvider: string;
    gatewayReference: string;
    gatewayAuthorizationUrl: string;
    metadata: Record<string, unknown>;
    event: OutboxEventInput;
  }): Promise<PaymentRow> {
    return withTenantContext(params.tenantId, async (tx) => {
      const [payment] = await tx
        .insert(payments)
        .values({
          id: params.id,
          tenantId: params.tenantId,
          invoiceId: params.invoiceId,
          termId: params.termId,
          studentId: params.studentId,
          channel: 'online',
          method: params.method,
          amountMinor: params.amountMinor,
          status: 'pending',
          idempotencyKey: params.idempotencyKey,
          loggedById: params.loggedById,
          paymentDate: params.paymentDate,
          gatewayProvider: params.gatewayProvider,
          gatewayReference: params.gatewayReference,
          gatewayAuthorizationUrl: params.gatewayAuthorizationUrl,
          metadata: params.metadata,
        })
        .returning();
      if (!payment) throw new Error('Failed to create online payment');

      await financeOutboxRepository.append(tx, params.event);
      return payment;
    });
  },

  /**
   * Verifies a payment, applies it to the invoice balance, finalizes the receipt,
   * and appends `payment.verified` to the outbox — all in one transaction.
   */
  async verifyPayment(params: {
    tenantId: string;
    paymentId: string;
    verifiedById: string | null;
    verifiedAt: Date;
    receiptFinalizedById: string;
    event: OutboxEventInput;
  }): Promise<PaymentWithReceipt> {
    return withTenantContext(params.tenantId, async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.tenantId, params.tenantId), eq(payments.id, params.paymentId)))
        .limit(1);
      if (!payment) throw new Error('Payment not found');

      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.tenantId, params.tenantId), eq(invoices.id, payment.invoiceId)))
        .limit(1);
      if (!invoice) throw new Error('Invoice not found');

      const newPaid = invoice.amountPaidMinor + payment.amountMinor;
      const newBalance = invoice.amountChargedMinor - newPaid;
      const invoiceStatus = deriveInvoiceStatus(invoice.amountChargedMinor, newPaid);

      await tx
        .update(invoices)
        .set({
          amountPaidMinor: newPaid,
          balanceMinor: newBalance,
          status: invoiceStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.tenantId, params.tenantId), eq(invoices.id, invoice.id)));

      const [updatedPayment] = await tx
        .update(payments)
        .set({
          status: 'verified',
          verifiedById: params.verifiedById,
          verifiedAt: params.verifiedAt,
          updatedAt: new Date(),
        })
        .where(and(eq(payments.tenantId, params.tenantId), eq(payments.id, payment.id)))
        .returning();
      if (!updatedPayment) throw new Error('Failed to verify payment');

      let receipt: ReceiptRow | null;
      const [existingReceipt] = await tx
        .select()
        .from(receipts)
        .where(and(eq(receipts.tenantId, params.tenantId), eq(receipts.paymentId, payment.id)))
        .limit(1);

      if (existingReceipt) {
        const [finalized] = await tx
          .update(receipts)
          .set({
            status: 'final',
            finalizedAt: params.verifiedAt,
          })
          .where(eq(receipts.id, existingReceipt.id))
          .returning();
        receipt = finalized ?? null;
      } else {
        const sequenceNumber = await nextReceiptSequence(tx, params.tenantId, payment.termId);
        const [created] = await tx
          .insert(receipts)
          .values({
            tenantId: params.tenantId,
            paymentId: payment.id,
            termId: payment.termId,
            sequenceNumber,
            status: 'final',
            amountMinor: payment.amountMinor,
            lineItems: [{ description: 'School fee payment', amountMinor: payment.amountMinor }],
            issuedById: params.receiptFinalizedById,
            finalizedAt: params.verifiedAt,
          })
          .returning();
        receipt = created ?? null;
      }

      await financeOutboxRepository.append(tx, params.event);
      return { payment: updatedPayment, receipt };
    });
  },

  /** Global webhook log — no tenant RLS (SRS Data Model §6). */
  async upsertWebhookEvent(params: {
    id: string;
    provider: string;
    providerEventId: string;
    eventType: string;
    signatureValid: boolean;
    payload: Record<string, unknown>;
    providerTimestamp: Date | null;
    tenantId: string | null;
    paymentId: string | null;
    outboxEvent?: OutboxEventInput;
  }): Promise<{ row: WebhookEventRow; isDuplicate: boolean }> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(webhookEvents)
        .where(
          and(
            eq(webhookEvents.provider, params.provider),
            eq(webhookEvents.providerEventId, params.providerEventId),
          ),
        )
        .limit(1);

      if (existing) {
        return { row: existing, isDuplicate: true };
      }

      const [row] = await tx
        .insert(webhookEvents)
        .values({
          id: params.id,
          provider: params.provider,
          providerEventId: params.providerEventId,
          eventType: params.eventType,
          signatureValid: params.signatureValid,
          payload: params.payload,
          status: params.signatureValid ? 'received' : 'rejected',
          providerTimestamp: params.providerTimestamp,
          tenantId: params.tenantId,
          paymentId: params.paymentId,
        })
        .returning();
      if (!row) throw new Error('Failed to store webhook event');

      if (params.outboxEvent && params.signatureValid) {
        await financeOutboxRepository.append(tx, params.outboxEvent);
      }

      return { row, isDuplicate: false };
    });
  },

  async markWebhookProcessed(webhookEventId: string): Promise<void> {
    await db
      .update(webhookEvents)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(webhookEvents.id, webhookEventId));
  },

  async findWebhookEventById(webhookEventId: string): Promise<WebhookEventRow | null> {
    const [row] = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.id, webhookEventId))
      .limit(1);
    return row ?? null;
  },

  async countUnverifiedOfflinePayments(tenantId: string, termId: string): Promise<number> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, tenantId),
            eq(payments.termId, termId),
            eq(payments.channel, 'offline'),
            eq(payments.status, 'pending_verification'),
          ),
        );
      return row?.count ?? 0;
    });
  },

  async listUnverifiedOfflineByTerm(tenantId: string, termId: string): Promise<PaymentRow[]> {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, tenantId),
            eq(payments.termId, termId),
            eq(payments.channel, 'offline'),
            eq(payments.status, 'pending_verification'),
          ),
        )
        .orderBy(asc(payments.paymentDate)),
    );
  },
};
