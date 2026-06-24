import type { PaymentsQuery } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import { getEnv } from '../../../config/env.js';
import { idempotencyService } from '../../../shared/idempotency.service.js';
import { LoomisError } from '../../../shared/errors.js';
import { studentRepository } from '../../student/repository/student.repository.js';
import { FINANCE_EVENT_TYPES } from '../events/types.js';
import { gatewayAbstractionLayer } from '../gateway/index.js';
import { financeRepository, paymentRepository, type PaymentWithReceipt } from '../repository/index.js';
import type {
  ActorContext,
  AuditContext,
  InitializeOnlinePaymentInput,
  LogOfflinePaymentInput,
  VerifyOfflinePaymentInput,
} from '../types.js';
import { assertAuditAvailable, requireTenant, writeFinanceAudit } from './_shared.js';
import {
  buildFifoAllocations,
  totalOpenBalance,
  type OpenInvoiceSlice,
} from './payment-allocation.utils.js';

const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

function paymentDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildReceiptLineItems(
  invoice: Awaited<ReturnType<typeof financeRepository.findInvoiceById>>,
  amountMinor: number,
) {
  if (!invoice) return [{ description: 'School fee payment', amountMinor }];
  return invoice.items.map((item) => ({
    name: item.name,
    category: item.category,
    amountMinor: item.amountMinor,
  }));
}

function paymentVerifiedPayload(
  tenantId: string,
  payment: PaymentWithReceipt['payment'],
  verifiedById: string | null,
  verifiedAt: Date,
) {
  return {
    tenantId,
    paymentId: payment.id,
    invoiceId: payment.invoiceId,
    studentId: payment.studentId,
    termId: payment.termId,
    amountMinor: payment.amountMinor,
    channel: payment.channel,
    verifiedAt: verifiedAt.toISOString(),
    verifiedById,
  };
}

async function assertInvoicePayable(
  tenantId: string,
  invoiceId: string,
  amountMinor: number,
) {
  const invoice = await financeRepository.findInvoiceById(tenantId, invoiceId);
  if (!invoice) {
    throw new LoomisError('FINANCE_INVOICE_NOT_FOUND', 404, 'Invoice not found');
  }
  if (invoice.invoice.status === 'void' || invoice.invoice.status === 'paid') {
    throw new LoomisError(
      'FINANCE_PAYMENT_NOT_VERIFIABLE',
      409,
      'This invoice cannot accept further payments',
    );
  }
  if (amountMinor > invoice.invoice.balanceMinor) {
    throw new LoomisError(
      'FINANCE_PAYMENT_AMOUNT_EXCEEDS_BALANCE',
      422,
      'Payment amount exceeds the outstanding invoice balance',
      { balanceMinor: invoice.invoice.balanceMinor },
    );
  }
  return invoice;
}

async function assertParentLinkedToStudent(
  tenantId: string,
  studentId: string,
  parentUserId: string,
): Promise<void> {
  const linked = await studentRepository.hasActiveParentLink(tenantId, parentUserId, studentId);
  if (!linked) {
    throw new LoomisError(
      'FINANCE_PARENT_NOT_LINKED',
      403,
      'You are not linked to this student in this school',
    );
  }
}

export const paymentService = {
  /**
   * US-FIN-002. Cashier logs an offline payment. Creates a provisional receipt;
   * does NOT settle invoice balances or PSF until verification.
   */
  async logOfflinePayment(
    tenantId: string,
    input: LogOfflinePaymentInput,
    actor: ActorContext,
    audit: AuditContext,
    idempotencyKey: string,
  ): Promise<PaymentWithReceipt> {
    requireTenant(actor, tenantId);
    await assertAuditAvailable();

    const { result } = await idempotencyService.wrap(
      idempotencyKey,
      actor.userId,
      'POST /payments/offline',
      async () => {
        const existing = await paymentRepository.findPaymentByIdempotencyKey(
          tenantId,
          idempotencyKey,
        );
        if (existing) {
          const withReceipt = await paymentRepository.findPaymentById(tenantId, existing.id);
          if (withReceipt) return withReceipt;
        }

        const invoice = await assertInvoicePayable(tenantId, input.invoiceId, input.amountMinor);
        const paymentId = uuidv7();
        const receiptId = uuidv7();

        const created = await paymentRepository.createOfflinePayment({
          id: paymentId,
          tenantId,
          invoiceId: input.invoiceId,
          termId: invoice.invoice.termId,
          studentId: invoice.invoice.studentId,
          amountMinor: input.amountMinor,
          method: input.method,
          idempotencyKey,
          loggedById: actor.userId,
          paymentDate: input.paymentDate,
          channelReference: input.channelReference ?? null,
          evidenceStorageObjectId: input.evidenceStorageObjectId ?? null,
          receiptId,
          lineItems: buildReceiptLineItems(invoice, input.amountMinor),
          event: {
            aggregateType: 'payment',
            aggregateId: paymentId,
            eventType: FINANCE_EVENT_TYPES.paymentLogged,
            tenantId,
            payload: {
              tenantId,
              paymentId,
              invoiceId: input.invoiceId,
              amountMinor: input.amountMinor,
              channel: 'offline',
              loggedById: actor.userId,
            },
          },
        });

        await writeFinanceAudit({
          tenantId,
          actorUserId: actor.userId,
          action: 'payment.offline.logged',
          resourceType: 'payment',
          resourceId: paymentId,
          result: 'success',
          audit,
        });

        return created;
      },
    );

    return result;
  },

  /**
   * US-FIN-003. Accountant verifies an offline payment. Segregation of duties:
   * the Cashier who logged CANNOT verify the same payment (CON-014).
   */
  async verifyOfflinePayment(
    tenantId: string,
    paymentId: string,
    _input: VerifyOfflinePaymentInput,
    actor: ActorContext,
    audit: AuditContext,
    idempotencyKey: string,
  ): Promise<PaymentWithReceipt> {
    requireTenant(actor, tenantId);
    await assertAuditAvailable();

    const { result } = await idempotencyService.wrap(
      idempotencyKey,
      actor.userId,
      `POST /payments/${paymentId}/verify`,
      async () => {
        const found = await paymentRepository.findPaymentById(tenantId, paymentId);
        if (!found) {
          throw new LoomisError('FINANCE_PAYMENT_NOT_FOUND', 404, 'Payment not found');
        }

        const { payment } = found;
        if (payment.channel !== 'offline' || payment.status !== 'pending_verification') {
          throw new LoomisError(
            'FINANCE_PAYMENT_NOT_VERIFIABLE',
            409,
            'Only pending offline payments can be verified',
          );
        }

        if (payment.loggedById === actor.userId) {
          throw new LoomisError(
            'FINANCE_CANNOT_VERIFY_OWN_PAYMENT',
            403,
            'The cashier who logged this payment cannot verify it',
          );
        }

        const verifiedAt = new Date();
        const verified = await paymentRepository.verifyPayment({
          tenantId,
          paymentId,
          verifiedById: actor.userId,
          verifiedAt,
          receiptFinalizedById: actor.userId,
          event: {
            aggregateType: 'payment',
            aggregateId: paymentId,
            eventType: FINANCE_EVENT_TYPES.paymentVerified,
            tenantId,
            payload: paymentVerifiedPayload(tenantId, payment, actor.userId, verifiedAt),
          },
        });

        await writeFinanceAudit({
          tenantId,
          actorUserId: actor.userId,
          action: 'payment.offline.verified',
          resourceType: 'payment',
          resourceId: paymentId,
          result: 'success',
          audit,
        });

        return verified;
      },
    );

    return result;
  },

  /**
   * US-FIN-004. Parent initiates an online payment through the GAL. Returns the
   * gateway authorization URL; settlement happens on verified webhook.
   */
  async initializeOnlinePayment(
    tenantId: string,
    input: InitializeOnlinePaymentInput,
    actor: ActorContext,
    audit: AuditContext,
    idempotencyKey: string,
  ): Promise<{ payment: PaymentWithReceipt['payment']; authorizationUrl: string }> {
    if (actor.role !== 'parent') {
      throw new LoomisError('FORBIDDEN', 403, 'Only parents may initiate online fee payments');
    }
    await assertAuditAvailable();

    const { result } = await idempotencyService.wrap(
      idempotencyKey,
      actor.userId,
      'POST /payments/online/initialize',
      async () => {
        const existing = await paymentRepository.findPaymentByIdempotencyKey(
          tenantId,
          idempotencyKey,
        );
        if (existing?.gatewayAuthorizationUrl) {
          return {
            payment: existing,
            authorizationUrl: existing.gatewayAuthorizationUrl,
          };
        }

        let invoiceId = input.invoiceId;
        let termId: string;
        let studentId: string;
        let paymentMetadata: Record<string, unknown> = { payerEmail: input.payerEmail };

        if (input.payAllOwed) {
          if (!input.studentId) {
            throw new LoomisError('VALIDATION_ERROR', 400, 'studentId is required when payAllOwed is true');
          }
          await assertParentLinkedToStudent(tenantId, input.studentId, actor.userId);
          const slices: OpenInvoiceSlice[] = (
            await financeRepository.listOutstandingInvoicesWithTerm(tenantId)
          )
            .filter((slice) => slice.studentId === input.studentId)
            .map((slice) => ({
              invoiceId: slice.invoiceId,
              termId: slice.termId,
              balanceMinor: slice.balanceMinor,
              termStartDate: slice.termStartDate,
              termSequence: slice.termSequence,
            }));

          const openTotal = totalOpenBalance(slices);
          const payAhead = input.payAhead === true;

          if (openTotal <= 0) {
            if (!payAhead) {
              throw new LoomisError('VALIDATION_ERROR', 422, 'No outstanding balance to pay');
            }
            const anchor = await financeRepository.findLatestInvoiceForStudent(
              tenantId,
              input.studentId,
            );
            if (!anchor) {
              throw new LoomisError(
                'VALIDATION_ERROR',
                422,
                'No fee invoice on record yet — pay ahead is available after the school issues fees',
              );
            }
            invoiceId = anchor.invoiceId;
            termId = anchor.termId;
            studentId = input.studentId;
            paymentMetadata = { ...paymentMetadata, creditMinor: input.amountMinor };
          } else {
            if (!payAhead && input.amountMinor > openTotal) {
              throw new LoomisError(
                'FINANCE_PAYMENT_AMOUNT_EXCEEDS_BALANCE',
                422,
                'Payment amount exceeds the total outstanding balance',
                { balanceMinor: openTotal },
              );
            }

            const allocateAmount = Math.min(input.amountMinor, openTotal);
            let allocations: ReturnType<typeof buildFifoAllocations> = [];
            if (allocateAmount > 0) {
              try {
                allocations = buildFifoAllocations(slices, allocateAmount);
              } catch {
                throw new LoomisError(
                  'FINANCE_PAYMENT_AMOUNT_EXCEEDS_BALANCE',
                  422,
                  'Payment amount exceeds the total outstanding balance',
                  { balanceMinor: openTotal },
                );
              }
            }

            const creditMinor = payAhead ? input.amountMinor - allocateAmount : 0;
            if (creditMinor > 0 && !payAhead) {
              throw new LoomisError(
                'FINANCE_PAYMENT_AMOUNT_EXCEEDS_BALANCE',
                422,
                'Payment amount exceeds the total outstanding balance',
                { balanceMinor: openTotal },
              );
            }

            invoiceId = allocations[0]!.invoiceId;
            termId = allocations[0]!.termId;
            studentId = input.studentId;
            paymentMetadata = {
              ...paymentMetadata,
              allocations,
              ...(creditMinor > 0 ? { creditMinor } : {}),
            };
          }
        } else {
          const invoice = await assertInvoicePayable(tenantId, input.invoiceId!, input.amountMinor);
          await assertParentLinkedToStudent(tenantId, invoice.invoice.studentId, actor.userId);
          invoiceId = input.invoiceId!;
          termId = invoice.invoice.termId;
          studentId = invoice.invoice.studentId;
        }

        const gateway = gatewayAbstractionLayer.get(input.provider);
        const paymentId = uuidv7();
        const env = getEnv();
        const redirectBase =
          input.clientPlatform === 'mobile'
            ? (env.PAYMENT_REDIRECT_MOBILE_URL ?? 'loomis://payments/complete')
            : (env.PAYMENT_REDIRECT_BASE_URL ?? 'http://localhost:3000/payments/complete');
        const redirectUrl = `${redirectBase}?paymentId=${paymentId}&tenantId=${tenantId}`;

        const initialized = await gateway.initializePayment({
          reference: paymentId,
          amountMinor: input.amountMinor,
          payerEmail: input.payerEmail,
          redirectUrl,
          metadata: {
            tenant_id: tenantId,
            payment_id: paymentId,
            invoice_id: invoiceId,
            student_id: studentId,
          },
        });

        const payment = await paymentRepository.createOnlinePayment({
          id: paymentId,
          tenantId,
          invoiceId,
          termId,
          studentId,
          amountMinor: input.amountMinor,
          method: input.method,
          idempotencyKey,
          loggedById: actor.userId,
          paymentDate: paymentDateToday(),
          gatewayProvider: input.provider,
          gatewayReference: initialized.gatewayReference,
          gatewayAuthorizationUrl: initialized.authorizationUrl,
          metadata: paymentMetadata,
          event: {
            aggregateType: 'payment',
            aggregateId: paymentId,
            eventType: FINANCE_EVENT_TYPES.paymentLogged,
            tenantId,
            payload: {
              tenantId,
              paymentId,
              invoiceId,
              amountMinor: input.amountMinor,
              channel: 'online',
              gatewayProvider: input.provider,
              loggedById: actor.userId,
            },
          },
        });

        await writeFinanceAudit({
          tenantId,
          actorUserId: actor.userId,
          action: 'payment.online.initialized',
          resourceType: 'payment',
          resourceId: paymentId,
          result: 'success',
          audit,
        });

        return { payment, authorizationUrl: initialized.authorizationUrl };
      },
    );

    return result;
  },

  async getPayment(
    tenantId: string,
    paymentId: string,
    actor: ActorContext,
  ): Promise<PaymentWithReceipt> {
    requireTenant(actor, tenantId);
    const found = await paymentRepository.findPaymentById(tenantId, paymentId);
    if (!found) {
      throw new LoomisError('FINANCE_PAYMENT_NOT_FOUND', 404, 'Payment not found');
    }

    if (actor.role === 'parent') {
      const linked = await studentRepository.hasActiveParentLink(
        tenantId,
        actor.userId,
        found.payment.studentId,
      );
      if (!linked) {
        throw new LoomisError('FORBIDDEN', 403, 'You are not linked to this student');
      }
    }

    return found;
  },

  /** US-PAR-004. Payment history for a linked child (all channels). */
  async listParentChildPayments(
    tenantId: string,
    studentId: string,
    termId: string,
    actor: ActorContext,
  ): Promise<PaymentWithReceipt[]> {
    if (actor.role !== 'parent') {
      throw new LoomisError('FORBIDDEN', 403, 'Parent role required');
    }

    const linked = await studentRepository.hasActiveParentLink(tenantId, actor.userId, studentId);
    if (!linked) {
      throw new LoomisError('FORBIDDEN', 403, 'You are not linked to this student');
    }

    return paymentRepository.listPayments(tenantId, { studentId, termId });
  },

  async listPayments(
    tenantId: string,
    query: PaymentsQuery,
    actor: ActorContext,
  ): Promise<PaymentWithReceipt[]> {
    requireTenant(actor, tenantId);
    const filters: {
      termId?: string;
      studentId?: string;
      status?: string;
      channel?: string;
    } = {};
    if (query.termId !== undefined) filters.termId = query.termId;
    if (query.studentId !== undefined) filters.studentId = query.studentId;
    if (query.status !== undefined) filters.status = query.status;
    if (query.channel !== undefined) filters.channel = query.channel;
    return paymentRepository.listPayments(tenantId, filters);
  },

  /** Called by the webhook consumer after a verified gateway event. */
  async settleOnlinePayment(
    tenantId: string,
    paymentId: string,
    webhookEventId: string,
  ): Promise<PaymentWithReceipt> {
    const found = await paymentRepository.findPaymentById(tenantId, paymentId);
    if (!found) {
      throw new LoomisError('FINANCE_PAYMENT_NOT_FOUND', 404, 'Payment not found');
    }

    if (found.payment.status === 'verified') {
      await paymentRepository.markWebhookProcessed(webhookEventId);
      return found;
    }

    if (found.payment.status !== 'pending') {
      throw new LoomisError(
        'FINANCE_PAYMENT_NOT_VERIFIABLE',
        409,
        'Payment is not in a settleable state',
      );
    }

    const verifiedAt = new Date();
    const verified = await paymentRepository.verifyPayment({
      tenantId,
      paymentId,
      verifiedById: null,
      verifiedAt,
      receiptFinalizedById: found.payment.loggedById,
      event: {
        aggregateType: 'payment',
        aggregateId: paymentId,
        eventType: FINANCE_EVENT_TYPES.paymentVerified,
        tenantId,
        payload: paymentVerifiedPayload(tenantId, found.payment, null, verifiedAt),
      },
    });

    await paymentRepository.markWebhookProcessed(webhookEventId);
    return verified;
  },

  isWebhookTimestampValid(timestamp: Date | null): boolean {
    if (!timestamp) return true;
    return Math.abs(Date.now() - timestamp.getTime()) <= WEBHOOK_TOLERANCE_MS;
  },
};
