import type { LedgerBalanceCheckResult } from '@loomis/contracts';
import { LEDGER_ACCOUNT_CODES } from '../events/types.js';
import { ledgerEntryRepository, obligationRepository } from '../repository/index.js';

/**
 * Nightly platform ledger integrity checks (System Design §8.3).
 * Failure triggers a P1 alert to Revenue Operations.
 */
export const balanceCheckService = {
  async runBalanceCheck(): Promise<LedgerBalanceCheckResult> {
    const checkedAt = new Date().toISOString();
    const { debitTotalMinor, creditTotalMinor } = await ledgerEntryRepository.sumDebitsAndCredits();
    const psfRevenueMinor = await ledgerEntryRepository.sumAccountCredits(
      LEDGER_ACCOUNT_CODES.loomisPsfRevenue,
    );

    // Check 1: platform-wide debits equal credits.
    const debitsEqualCredits = debitTotalMinor === creditTotalMinor;

    // Check 2: PSF revenue credits equal total PSF obligations created (accrual model §8.1).
    const settledObligationsMinor = await obligationRepository.sumAllObligationAmounts();
    const revenueMatchesObligations = psfRevenueMinor === settledObligationsMinor;

    const passed = debitsEqualCredits && revenueMatchesObligations;

    const result: LedgerBalanceCheckResult = {
      passed,
      debitTotalMinor,
      creditTotalMinor,
      psfRevenueMinor,
      settledObligationsMinor,
      checkedAt,
    };

    if (!passed) {
      console.error('ledger.balance_check.failed', {
        debitTotalMinor,
        creditTotalMinor,
        psfRevenueMinor,
        severity: 'P1',
      });
    }

    return result;
  },
};
