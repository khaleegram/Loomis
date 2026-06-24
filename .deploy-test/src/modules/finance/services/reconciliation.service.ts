import type { ReconciliationExceptionsQuery } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';
import { financeOutboxRepository } from '../repository/outbox.repository.js';
import { reconciliationRepository } from '../repository/index.js';
import { FINANCE_EVENT_TYPES } from '../events/types.js';
import { gatewayAbstractionLayer } from '../gateway/index.js';
import type { ActorContext, AuditContext, ResolveReconciliationExceptionInput } from '../types.js';
import { assertAuditAvailable, requireTenant, writeFinanceAudit } from './_shared.js';

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const reconciliationService = {
  /**
   * US-FIN-007. Compares gateway settlement records against internal verified
   * online payments for a settlement date and flags discrepancies.
   */
  async runGatewayReconciliation(settlementDate?: string): Promise<{
    runId: string;
    exceptionsCreated: number;
    settlementDate: string;
  }> {
    const date = settlementDate ?? yesterdayUtc();
    const runId = uuidv7();
    const env = getEnv();

    if (!env.PAYSTACK_SECRET_KEY) {
      throw new LoomisError(
        'FINANCE_GATEWAY_NOT_CONFIGURED',
        503,
        'PAYSTACK_SECRET_KEY is not configured — reconciliation cannot run',
      );
    }

    const gateway = gatewayAbstractionLayer.get('paystack');
    const gatewayRecords = await gateway.fetchSuccessfulTransactions(date, date);

    const platformPayments = await reconciliationRepository.listVerifiedOnlinePaymentsByDate(date);
    const platformByRef = new Map<string, (typeof platformPayments)[number]>();
    for (const payment of platformPayments) {
      if (payment.gatewayReference) {
        platformByRef.set(payment.gatewayReference, payment);
      }
    }

    const gatewayByRef = new Map(gatewayRecords.map((r) => [r.gatewayReference, r]));
    const exceptions: Array<{
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
    }> = [];

    for (const record of gatewayRecords) {
      const platform = platformByRef.get(record.gatewayReference);
      if (!platform) {
        const existing = await reconciliationRepository.findOpenExceptionByReference(
          'paystack',
          record.gatewayReference,
        );
        if (!existing) {
          exceptions.push({
            id: uuidv7(),
            tenantId: null,
            provider: 'paystack',
            exceptionType: 'gateway_only',
            gatewayReference: record.gatewayReference,
            paymentId: null,
            gatewayAmountMinor: record.amountMinor,
            platformAmountMinor: null,
            settlementDate: date,
            reconciliationRunId: runId,
          });
        }
        continue;
      }

      if (platform.amountMinor !== record.amountMinor) {
        const existing = await reconciliationRepository.findOpenExceptionByReference(
          'paystack',
          record.gatewayReference,
        );
        if (!existing) {
          exceptions.push({
            id: uuidv7(),
            tenantId: platform.tenantId,
            provider: 'paystack',
            exceptionType: 'amount_mismatch',
            gatewayReference: record.gatewayReference,
            paymentId: platform.id,
            gatewayAmountMinor: record.amountMinor,
            platformAmountMinor: platform.amountMinor,
            settlementDate: date,
            reconciliationRunId: runId,
          });
        }
      }
    }

    for (const payment of platformPayments) {
      if (!payment.gatewayReference) continue;
      if (!gatewayByRef.has(payment.gatewayReference)) {
        const existing = await reconciliationRepository.findOpenExceptionByReference(
          'paystack',
          payment.gatewayReference,
        );
        if (!existing) {
          exceptions.push({
            id: uuidv7(),
            tenantId: payment.tenantId,
            provider: 'paystack',
            exceptionType: 'platform_only',
            gatewayReference: payment.gatewayReference,
            paymentId: payment.id,
            gatewayAmountMinor: null,
            platformAmountMinor: payment.amountMinor,
            settlementDate: date,
            reconciliationRunId: runId,
          });
        }
      }
    }

    const exceptionsCreated = await reconciliationRepository.insertExceptions(exceptions);

    await financeOutboxRepository.publish({
      aggregateType: 'reconciliation_run',
      aggregateId: runId,
      eventType: FINANCE_EVENT_TYPES.reconciliationRunCompleted,
      tenantId: null,
      payload: {
        runId,
        settlementDate: date,
        exceptionsCreated,
        gatewayRecordCount: gatewayRecords.length,
        platformPaymentCount: platformPayments.length,
      },
    });

    return { runId, exceptionsCreated, settlementDate: date };
  },

  async listExceptions(
    tenantId: string | null,
    query: ReconciliationExceptionsQuery,
    actor: ActorContext,
  ) {
    if (tenantId) requireTenant(actor, tenantId);

    const filters: { status?: string; provider?: string } = {};
    if (query.status !== undefined) filters.status = query.status;
    if (query.provider !== undefined) filters.provider = query.provider;

    return reconciliationRepository.listExceptions(tenantId, filters);
  },

  async resolveException(
    tenantId: string | null,
    exceptionId: string,
    input: ResolveReconciliationExceptionInput,
    actor: ActorContext,
    audit: AuditContext,
  ) {
    if (tenantId) requireTenant(actor, tenantId);
    await assertAuditAvailable();

    const exception = await reconciliationRepository.findExceptionById(tenantId, exceptionId);
    if (!exception) {
      throw new LoomisError(
        'FINANCE_RECONCILIATION_EXCEPTION_NOT_FOUND',
        404,
        'Reconciliation exception not found',
      );
    }
    if (exception.status !== 'open') {
      throw new LoomisError(
        'FINANCE_RECONCILIATION_EXCEPTION_CLOSED',
        409,
        'This reconciliation exception has already been resolved',
      );
    }

    const resolved = await reconciliationRepository.resolveException({
      tenantId,
      exceptionId,
      status: input.status,
      resolutionNotes: input.resolutionNotes,
      resolvedById: actor.userId,
    });

    await writeFinanceAudit({
      tenantId: tenantId ?? exception.tenantId ?? '00000000-0000-0000-0000-000000000000',
      actorUserId: actor.userId,
      action: 'finance.reconciliation.exception_resolved',
      resourceType: 'reconciliation_exception',
      resourceId: exceptionId,
      result: 'success',
      audit,
      metadata: { status: input.status },
    });

    return resolved!;
  },
};
