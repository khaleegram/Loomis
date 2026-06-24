import type { RefundsQuery } from '@loomis/contracts';
import { PSF_REVERSAL_ELIGIBLE_REASONS } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import { idempotencyService } from '../../../shared/idempotency.service.js';
import { LoomisError } from '../../../shared/errors.js';
import { workflowService } from '../../workflow/index.js';
import { FINANCE_EVENT_TYPES } from '../events/types.js';
import { paymentRepository, refundRepository } from '../repository/index.js';
import type { ActorContext, AuditContext, CreateRefundInput, RequestPsfReversalInput } from '../types.js';
import { assertAuditAvailable, requireTenant, writeFinanceAudit } from './_shared.js';

/** Bulk refund threshold per term (FR-FIN-007 / Revenue Risk). */
const BULK_REFUND_THRESHOLD = 5;

function refundApprovedPayload(
  tenantId: string,
  refund: {
    id: string;
    paymentId: string;
    invoiceId: string;
    studentId: string;
    termId: string;
    amountMinor: number;
    reasonCode: string;
    psfTreatment: string;
  },
  approvedById: string,
) {
  return {
    tenantId,
    refundId: refund.id,
    paymentId: refund.paymentId,
    invoiceId: refund.invoiceId,
    studentId: refund.studentId,
    termId: refund.termId,
    amountMinor: refund.amountMinor,
    reasonCode: refund.reasonCode,
    psfTreatment: refund.psfTreatment,
    approvedById,
    executedAt: new Date().toISOString(),
  };
}

export const refundService = {
  /**
   * US-FIN-006. Cashier initiates a refund against a verified payment. Routes
   * through Workflow (Accountant → Principal → Owner). PSF is NOT reversed.
   */
  async initiateRefund(
    tenantId: string,
    input: CreateRefundInput,
    actor: ActorContext,
    audit: AuditContext,
    idempotencyKey: string,
  ) {
    requireTenant(actor, tenantId);
    if (actor.role !== 'cashier') {
      throw new LoomisError('FORBIDDEN', 403, 'Only cashiers may initiate refund requests');
    }
    await assertAuditAvailable();

    const { result } = await idempotencyService.wrap(
      idempotencyKey,
      actor.userId,
      'POST /refunds',
      async () => {
        const found = await paymentRepository.findPaymentById(tenantId, input.paymentId);
        if (!found) {
          throw new LoomisError('FINANCE_PAYMENT_NOT_FOUND', 404, 'Payment not found');
        }

        const { payment } = found;
        if (payment.status !== 'verified') {
          throw new LoomisError(
            'FINANCE_REFUND_PAYMENT_NOT_REFUNDABLE',
            409,
            'Only verified payments can be refunded',
          );
        }

        if (input.amountMinor > payment.amountMinor) {
          throw new LoomisError(
            'FINANCE_REFUND_AMOUNT_EXCEEDS_PAYMENT',
            422,
            'Refund amount cannot exceed the original payment amount',
            { paymentAmountMinor: payment.amountMinor },
          );
        }

        const refundId = uuidv7();
        const workflow = await workflowService.startWorkflow({
          workflowType: 'refund_request',
          tenantId,
          requestedById: actor.userId,
          requestedByRole: actor.role,
          subjectType: 'payment',
          subjectId: payment.id,
          title: `Refund request — ${input.reasonCode}`,
          payload: {
            refundId,
            paymentId: payment.id,
            invoiceId: payment.invoiceId,
            amountMinor: input.amountMinor,
            reasonCode: input.reasonCode,
            reasonNotes: input.reasonNotes,
          },
        });

        const refund = await refundRepository.createRefundRequest({
          id: refundId,
          tenantId,
          paymentId: payment.id,
          invoiceId: payment.invoiceId,
          termId: payment.termId,
          studentId: payment.studentId,
          amountMinor: input.amountMinor,
          reasonCode: input.reasonCode,
          reasonNotes: input.reasonNotes,
          workflowInstanceId: workflow.workflowInstanceId,
          requestedById: actor.userId,
          event: {
            aggregateType: 'refund_request',
            aggregateId: refundId,
            eventType: FINANCE_EVENT_TYPES.refundRequested,
            tenantId,
            payload: {
              tenantId,
              refundId,
              paymentId: payment.id,
              amountMinor: input.amountMinor,
              reasonCode: input.reasonCode,
              workflowInstanceId: workflow.workflowInstanceId,
              requestedById: actor.userId,
            },
          },
        });

        await writeFinanceAudit({
          tenantId,
          actorUserId: actor.userId,
          action: 'finance.refund.requested',
          resourceType: 'refund_request',
          resourceId: refundId,
          result: 'success',
          audit,
          metadata: { paymentId: payment.id, workflowInstanceId: workflow.workflowInstanceId },
        });

        return { refund, workflowInstanceId: workflow.workflowInstanceId };
      },
    );

    return result;
  },

  async getRefund(tenantId: string, refundId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const refund = await refundRepository.findById(tenantId, refundId);
    if (!refund) {
      throw new LoomisError('FINANCE_REFUND_NOT_FOUND', 404, 'Refund request not found');
    }
    return refund;
  },

  async listRefunds(tenantId: string, query: RefundsQuery, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const filters: { termId?: string; paymentId?: string; status?: string } = {};
    if (query.termId !== undefined) filters.termId = query.termId;
    if (query.paymentId !== undefined) filters.paymentId = query.paymentId;
    if (query.status !== undefined) filters.status = query.status;
    return refundRepository.listRefunds(tenantId, filters);
  },

  /**
   * Applies an approved refund AFTER the full workflow chain completes.
   * Called by the `workflow.completed` consumer — not reachable from a route.
   */
  async applyApprovedRefund(params: {
    tenantId: string;
    refundId: string;
    requestedById: string;
    approvedById: string;
    workflowInstanceId: string;
    eventId: string;
  }): Promise<void> {
    if (params.approvedById === params.requestedById) {
      throw new LoomisError(
        'WORKFLOW_APPROVER_IS_REQUESTER',
        403,
        'The approver of a refund cannot be the requester (CON-013)',
      );
    }

    const refund = await refundRepository.findById(params.tenantId, params.refundId);
    if (!refund || refund.status === 'executed') return;

    const executed = await refundRepository.executeRefund({
      tenantId: params.tenantId,
      refundId: params.refundId,
      approvedById: params.approvedById,
      event: {
        aggregateType: 'refund_request',
        aggregateId: params.refundId,
        eventType: FINANCE_EVENT_TYPES.refundApproved,
        tenantId: params.tenantId,
        payload: refundApprovedPayload(params.tenantId, refund, params.approvedById),
      },
    });

    await writeFinanceAudit({
      tenantId: params.tenantId,
      actorUserId: params.approvedById,
      actorType: 'system',
      action: 'finance.refund.executed',
      resourceType: 'refund_request',
      resourceId: params.refundId,
      result: 'success',
      audit: { requestId: params.eventId },
      metadata: {
        workflowInstanceId: params.workflowInstanceId,
        paymentId: executed.paymentId,
      },
    });

    const termRefundCount = await refundRepository.countRefundsInTerm(
      params.tenantId,
      executed.termId,
    );
    if (termRefundCount >= BULK_REFUND_THRESHOLD) {
      await writeFinanceAudit({
        tenantId: params.tenantId,
        actorUserId: null,
        actorType: 'job',
        action: 'finance.refund.bulk_threshold_exceeded',
        resourceType: 'tenant',
        resourceId: params.tenantId,
        result: 'success',
        audit: { requestId: params.eventId },
        metadata: { termId: executed.termId, executedRefundCount: termRefundCount },
      });
    }
  },

  async markRefundRejected(params: {
    tenantId: string;
    refundId: string;
    eventId: string;
  }): Promise<void> {
    await refundRepository.updateStatus({
      tenantId: params.tenantId,
      refundId: params.refundId,
      status: 'rejected',
    });
  },

  /**
   * Request platform PSF reversal for an executed refund (duplicate/error/
   * chargeback/legal only). Routes through `psf_reversal_on_refund` workflow.
   */
  async requestPsfReversal(
    tenantId: string,
    refundId: string,
    input: RequestPsfReversalInput,
    actor: ActorContext,
    audit: AuditContext,
    idempotencyKey: string,
  ) {
    if (actor.role !== 'platform_admin' && actor.role !== 'platform_owner') {
      throw new LoomisError('FORBIDDEN', 403, 'Only platform operations may request PSF reversal');
    }
    await assertAuditAvailable();

    const { result } = await idempotencyService.wrap(
      idempotencyKey,
      actor.userId,
      `POST /refunds/${refundId}/psf-reversal`,
      async () => {
        const refund = await refundRepository.findById(tenantId, refundId);
        if (!refund) {
          throw new LoomisError('FINANCE_REFUND_NOT_FOUND', 404, 'Refund request not found');
        }
        if (refund.status !== 'executed') {
          throw new LoomisError(
            'FINANCE_PSF_REVERSAL_NOT_ALLOWED',
            409,
            'PSF reversal can only be requested for executed refunds',
          );
        }
        if (refund.psfTreatment !== 'not_reversed') {
          throw new LoomisError(
            'FINANCE_PSF_REVERSAL_ALREADY_REQUESTED',
            409,
            'PSF reversal has already been requested or applied for this refund',
          );
        }
        if (!PSF_REVERSAL_ELIGIBLE_REASONS.includes(refund.reasonCode as never)) {
          throw new LoomisError(
            'FINANCE_PSF_REVERSAL_NOT_ELIGIBLE',
            422,
            'PSF reversal is only permitted for duplicate payment, platform error, chargeback, or legal compulsion',
          );
        }

        const workflow = await workflowService.startPrivilegedChange({
          workflowType: 'psf_reversal_on_refund',
          tenantId,
          requestedById: actor.userId,
          requestedByRole: actor.role,
          justification: input.justification,
          payload: {
            refundId,
            paymentId: refund.paymentId,
            termId: refund.termId,
            reasonCode: refund.reasonCode,
          },
          subjectType: 'refund_request',
          subjectId: refundId,
        });

        const updated = await refundRepository.attachPsfReversalWorkflow({
          tenantId,
          refundId,
          psfReversalWorkflowId: workflow.workflowInstanceId,
        });

        await writeFinanceAudit({
          tenantId,
          actorUserId: actor.userId,
          action: 'finance.psf_reversal.requested',
          resourceType: 'refund_request',
          resourceId: refundId,
          result: 'success',
          audit,
          metadata: { psfReversalWorkflowId: workflow.workflowInstanceId },
        });

        return { refund: updated!, psfReversalWorkflowId: workflow.workflowInstanceId };
      },
    );

    return result;
  },

  /** Called by workflow consumer when platform dual-approval completes. */
  async applyApprovedPsfReversal(params: {
    tenantId: string;
    refundId: string;
    requestedById: string;
    approvedById: string;
    workflowInstanceId: string;
    eventId: string;
  }): Promise<void> {
    if (params.approvedById === params.requestedById) {
      throw new LoomisError(
        'WORKFLOW_APPROVER_IS_REQUESTER',
        403,
        'The PSF reversal approver cannot be the requester (CON-013)',
      );
    }

    const refund = await refundRepository.findById(params.tenantId, params.refundId);
    if (!refund || refund.psfTreatment === 'reversed') return;

    await refundRepository.markPsfReversed({
      tenantId: params.tenantId,
      refundId: params.refundId,
      event: {
        aggregateType: 'refund_request',
        aggregateId: params.refundId,
        eventType: FINANCE_EVENT_TYPES.psfReversalApproved,
        tenantId: params.tenantId,
        payload: {
          tenantId: params.tenantId,
          refundId: params.refundId,
          paymentId: refund.paymentId,
          termId: refund.termId,
          reasonCode: refund.reasonCode,
          approvedById: params.approvedById,
          workflowInstanceId: params.workflowInstanceId,
        },
      },
    });

    await writeFinanceAudit({
      tenantId: params.tenantId,
      actorUserId: params.approvedById,
      actorType: 'system',
      action: 'finance.psf_reversal.applied',
      resourceType: 'refund_request',
      resourceId: params.refundId,
      result: 'success',
      audit: { requestId: params.eventId },
      metadata: { workflowInstanceId: params.workflowInstanceId },
    });
  },
};
