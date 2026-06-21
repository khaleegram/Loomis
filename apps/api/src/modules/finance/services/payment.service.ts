import type { PaymentsQuery } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import { getEnv } from '../../../config/env.js';
import { idempotencyService } from '../../../shared/idempotency.service.js';
import { LoomisError } from '../../../shared/errors.js';
import { studentRepository } from '../../student/repository/student.repository.js';
import { userRepository } from '../../identity/repository/user.repository.js';
import { smsOtpService } from '../../identity/services/sms-otp.service.js';
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
   * Sends an SMS OTP before a parent initiates an online fee payment (tier plan §4).
   */
  async sendParentPaymentOtp(actor: ActorContext): Promise<{ maskedPhone: string; devBypass: boolean }> {
    if (actor.role !== 'parent') {
      throw new LoomisError('FORBIDDEN', 403, 'Only parents may request payment verification codes');
    }
    const user = await userRepository.findById(actor.userId);
    if (!user?.phone) {
      throw new LoomisError(
        'IDENTITY_SMS_PHONE_REQUIRED',
        422,
        'A phone number is required on your account before paying online',
      );
    }
    return smsOtpService.sendOtp({
      userId: actor.userId,
      phoneE164: user.phone,
      purpose: 'parent_payment',
    });
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

    if (!input.smsOtpCode) {
      throw new LoomisError(
        'IDENTITY_STEPUP_REQUIRED',
        401,
        'SMS verification is required before initiating a fee payment',
      );
    }
    await smsOtpService.verifyOtp({
      userId: actor.userId,
      purpose: 'parent_payment',
      code: input.smsOtpCode,
    });

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

        const invoice = await assertInvoicePayable(tenantId, input.invoiceId, input.amountMinor);
        await assertParentLinkedToStudent(tenantId, invoice.invoice.studentId, actor.userId);

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
            invoice_id: input.invoiceId,
            student_id: invoice.invoice.studentId,
          },
        });

        const payment = await paymentRepository.createOnlinePayment({
          id: paymentId,
          tenantId,
          invoiceId: input.invoiceId,
          termId: invoice.invoice.termId,
          studentId: invoice.invoice.studentId,
          amountMinor: input.amountMinor,
          method: input.method,
          idempotencyKey,
          loggedById: actor.userId,
          paymentDate: paymentDateToday(),
          gatewayProvider: input.provider,
          gatewayReference: initialized.gatewayReference,
          gatewayAuthorizationUrl: initialized.authorizationUrl,
          metadata: { payerEmail: input.payerEmail },
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
      if (found.payment.loggedById !== actor.userId) {
        throw new LoomisError('FORBIDDEN', 403, 'You can only view your own payments');
      }
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
