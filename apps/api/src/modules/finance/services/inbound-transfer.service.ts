import { uuidv7 } from 'uuidv7';
import { studentRepository } from '../../student/repository/student.repository.js';
import { FINANCE_EVENT_TYPES } from '../events/types.js';
import { financeRepository, paymentRepository, virtualAccountRepository } from '../repository/index.js';
import {
  buildFifoAllocations,
  totalOpenBalance,
  type OpenInvoiceSlice,
} from './payment-allocation.utils.js';

function paymentDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function paymentVerifiedPayload(
  tenantId: string,
  payment: { id: string; invoiceId: string; studentId: string; termId: string; amountMinor: number; channel: string },
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
    verifiedById: null,
  };
}

function buildInboundMetadata(amountMinor: number, slices: OpenInvoiceSlice[]) {
  const openTotal = totalOpenBalance(slices);
  const allocateAmount = Math.min(amountMinor, openTotal);
  const allocations = allocateAmount > 0 ? buildFifoAllocations(slices, allocateAmount) : [];
  const creditMinor = amountMinor - allocateAmount;
  return {
    allocations,
    creditMinor: creditMinor > 0 ? creditMinor : undefined,
    source: 'nomba_virtual_account',
  };
}

export const inboundTransferService = {
  async settleFromWebhook(params: {
    virtualAccountRef: string;
    gatewayReference: string;
    amountMinor: number;
    webhookEventId: string;
  }): Promise<{ status: 'settled' | 'duplicate' | 'ignored' }> {
    if (!params.virtualAccountRef || params.amountMinor <= 0) {
      return { status: 'ignored' };
    }

    const existing = await paymentRepository.findPaymentByGatewayReference('nomba', params.gatewayReference);
    if (existing) {
      await paymentRepository.markWebhookProcessed(params.webhookEventId);
      return { status: 'duplicate' };
    }

    const virtualAccount = await virtualAccountRepository.findByAccountRef(params.virtualAccountRef);
    if (!virtualAccount) {
      await paymentRepository.markWebhookProcessed(params.webhookEventId);
      return { status: 'ignored' };
    }

    const { tenantId, studentId } = virtualAccount;
    const loggedById = await studentRepository.findFirstParentUserIdForStudent(tenantId, studentId);
    if (!loggedById) {
      await paymentRepository.markWebhookProcessed(params.webhookEventId);
      return { status: 'ignored' };
    }

    const slices: OpenInvoiceSlice[] = (
      await financeRepository.listOutstandingInvoicesWithTerm(tenantId)
    )
      .filter((slice) => slice.studentId === studentId)
      .map((slice) => ({
        invoiceId: slice.invoiceId,
        termId: slice.termId,
        balanceMinor: slice.balanceMinor,
        termStartDate: slice.termStartDate,
        termSequence: slice.termSequence,
      }));

    const metadata = buildInboundMetadata(params.amountMinor, slices);
    let invoiceId: string;
    let termId: string;

    const firstAllocation = metadata.allocations[0];
    if (firstAllocation) {
      invoiceId = firstAllocation.invoiceId;
      termId = firstAllocation.termId;
    } else {
      const anchor = await financeRepository.findLatestInvoiceForStudent(tenantId, studentId);
      if (!anchor) {
        await paymentRepository.markWebhookProcessed(params.webhookEventId);
        return { status: 'ignored' };
      }
      invoiceId = anchor.invoiceId;
      termId = anchor.termId;
    }

    const paymentId = uuidv7();

    await paymentRepository.createVerifiedInboundPayment({
      id: paymentId,
      tenantId,
      invoiceId,
      termId,
      studentId,
      amountMinor: params.amountMinor,
      loggedById,
      paymentDate: paymentDateToday(),
      gatewayProvider: 'nomba',
      gatewayReference: params.gatewayReference,
      metadata,
      receiptLineItems: [{ description: 'School fee — bank transfer', amountMinor: params.amountMinor }],
      event: {
        aggregateType: 'payment',
        aggregateId: paymentId,
        eventType: FINANCE_EVENT_TYPES.paymentVerified,
        tenantId,
        payload: paymentVerifiedPayload(
          tenantId,
          {
            id: paymentId,
            invoiceId,
            studentId,
            termId,
            amountMinor: params.amountMinor,
            channel: 'online',
          },
          new Date(),
        ),
      },
    });

    await paymentRepository.markWebhookProcessed(params.webhookEventId);
    return { status: 'settled' };
  },
};
