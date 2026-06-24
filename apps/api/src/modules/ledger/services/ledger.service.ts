import { LEDGER_EVENT_TYPES } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import type { Executor } from '../../../shared/db.js';
import { LoomisError } from '../../../shared/errors.js';
import { LEDGER_ACCOUNT_CODES } from '../events/types.js';
import { ledgerEntryRepository, ledgerOutboxRepository } from '../repository/index.js';
import type { LedgerPostInput } from '../types.js';

function assertBalanced(entries: LedgerPostInput['entries'], currency: string): void {
  const totals = new Map<string, { debit: number; credit: number }>();

  for (const leg of entries) {
    if (!Number.isInteger(leg.amountMinor) || leg.amountMinor <= 0) {
      throw new LoomisError('LEDGER_UNBALANCED_TRANSACTION', 422, 'Ledger amounts must be positive integers in kobo');
    }
    const bucket = totals.get(currency) ?? { debit: 0, credit: 0 };
    if (leg.direction === 'debit') bucket.debit += leg.amountMinor;
    else bucket.credit += leg.amountMinor;
    totals.set(currency, bucket);
  }

  for (const [code, { debit, credit }] of totals) {
    if (debit !== credit) {
      throw new LoomisError(
        'LEDGER_UNBALANCED_TRANSACTION',
        422,
        `Ledger transaction for ${code} does not net to zero`,
        { debitTotalMinor: debit, creditTotalMinor: credit },
      );
    }
  }
}

export const ledgerService = {
  /**
   * Posts an immutable double-entry transaction. Every `ledger_txn_id` group nets
   * to zero per currency (System Design §8.3). Call only from within a DB
   * transaction that also commits the source state change + outbox row.
   */
  async post(tx: Executor, input: LedgerPostInput): Promise<string> {
    const currency = input.currency ?? 'NGN';
    if (input.entries.length < 2) {
      throw new LoomisError(
        'LEDGER_UNBALANCED_TRANSACTION',
        422,
        'A ledger transaction requires at least one debit and one credit leg',
      );
    }
    assertBalanced(input.entries, currency);

    const ledgerTxnId = uuidv7();
    await ledgerEntryRepository.insertPosting(tx, ledgerTxnId, input);

    await ledgerOutboxRepository.append(tx, {
      aggregateType: 'ledger_transaction',
      aggregateId: ledgerTxnId,
      eventType: LEDGER_EVENT_TYPES.transactionPosted,
      tenantId: input.tenantId,
      payload: {
        ledgerTxnId,
        tenantId: input.tenantId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        currency,
        legs: input.entries,
      },
    });

    return ledgerTxnId;
  },

  /** DR school_psf_receivable / CR loomis_psf_revenue for a new PSF obligation. */
  async postObligationCreated(
    tx: Executor,
    params: { tenantId: string; obligationId: string; amountMinor: number },
  ): Promise<string> {
    return this.post(tx, {
      tenantId: params.tenantId,
      sourceType: 'psf_obligation',
      sourceId: params.obligationId,
      entries: [
        {
          accountCode: LEDGER_ACCOUNT_CODES.schoolPsfReceivable,
          direction: 'debit',
          amountMinor: params.amountMinor,
        },
        {
          accountCode: LEDGER_ACCOUNT_CODES.loomisPsfRevenue,
          direction: 'credit',
          amountMinor: params.amountMinor,
        },
      ],
    });
  },

  /** Reversal of a PSF obligation via platform adjustment (DR revenue / CR receivable). */
  async postObligationReversal(
    tx: Executor,
    params: { tenantId: string; sourceId: string; amountMinor: number },
  ): Promise<string> {
    return this.post(tx, {
      tenantId: params.tenantId,
      sourceType: 'admin_adjustment',
      sourceId: params.sourceId,
      entries: [
        {
          accountCode: LEDGER_ACCOUNT_CODES.loomisPsfRevenue,
          direction: 'debit',
          amountMinor: params.amountMinor,
        },
        {
          accountCode: LEDGER_ACCOUNT_CODES.schoolPsfReceivable,
          direction: 'credit',
          amountMinor: params.amountMinor,
        },
      ],
    });
  },

  /** DR cash_gateway_clearing / CR school_psf_receivable for a PSF settlement. */
  async postSettlement(
    tx: Executor,
    params: { tenantId: string; settlementId: string; amountMinor: number },
  ): Promise<string> {
    return this.post(tx, {
      tenantId: params.tenantId,
      sourceType: 'payment',
      sourceId: params.settlementId,
      entries: [
        {
          accountCode: LEDGER_ACCOUNT_CODES.cashGatewayClearing,
          direction: 'debit',
          amountMinor: params.amountMinor,
        },
        {
          accountCode: LEDGER_ACCOUNT_CODES.schoolPsfReceivable,
          direction: 'credit',
          amountMinor: params.amountMinor,
        },
      ],
    });
  },
};
