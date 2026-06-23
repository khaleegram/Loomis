import { paymentRepository } from '../../finance/repository/payment.repository.js';
import { obligationRepository } from '../../ledger/repository/index.js';
import { caseRepository } from '../../risk/repository/case.repository.js';
import { academicRepository } from '../repository/academic.repository.js';

/**
 * Term closure gate (FR-ASM-006 / US-ASM-004 / CON-021).
 *
 * Financial blockers (unsettled PSF, unverified offline payments) can NEVER be
 * overridden at the school level. Operational blockers (gradebook lock,
 * published results, pending grade corrections, open IVP case) may be overridden
 * by the Principal with a documented reason.
 */
export interface TermClosureEvaluation {
  /** Financial blockers — never overridable at school level (CON-021). */
  financialBlockers: string[];
  /** Operational blockers — overridable by the Principal with a reason. */
  operationalBlockers: string[];
}

export const termClosureGate = {
  async evaluate(tenantId: string, termId: string): Promise<TermClosureEvaluation> {
    const financialBlockers: string[] = [];
    const operationalBlockers: string[] = [];

    const [
      unsettledObligations,
      unverifiedOffline,
      unlockedGradebook,
      unpublishedResults,
      pendingCorrections,
      ivpActive,
    ] = await Promise.all([
      obligationRepository.countUnsettledForTerm(tenantId, termId),
      paymentRepository.countUnverifiedOfflinePayments(tenantId, termId),
      academicRepository.countUnlockedGradebookEntries(tenantId, termId),
      academicRepository.countEnrolledStudentsWithoutPublishedResults(tenantId, termId),
      academicRepository.countPendingGradeCorrectionsForTerm(tenantId, termId),
      caseRepository.hasActiveCaseForTerm(tenantId, termId),
    ]);

    if (unsettledObligations > 0) {
      financialBlockers.push(
        `LEDGER_UNSETTLED_PSF_OBLIGATIONS: ${unsettledObligations} PSF obligation(s) remain unsettled for this term`,
      );
    }

    if (unverifiedOffline > 0) {
      financialBlockers.push(
        `FINANCE_UNVERIFIED_OFFLINE_PAYMENTS: ${unverifiedOffline} offline payment(s) await accountant verification`,
      );
    }

    if (unlockedGradebook > 0) {
      operationalBlockers.push(
        `ACADEMIC_GRADEBOOK_UNLOCKED: ${unlockedGradebook} gradebook entr${unlockedGradebook === 1 ? 'y is' : 'ies are'} not locked for this term`,
      );
    }

    if (unpublishedResults > 0) {
      operationalBlockers.push(
        `ACADEMIC_RESULTS_UNPUBLISHED: ${unpublishedResults} enrolled student${unpublishedResults === 1 ? ' lacks' : 's lack'} published results for this term`,
      );
    }

    if (pendingCorrections > 0) {
      operationalBlockers.push(
        `ACADEMIC_GRADE_CORRECTION_PENDING: ${pendingCorrections} grade correction${pendingCorrections === 1 ? '' : 's'} await workflow resolution`,
      );
    }

    if (ivpActive) {
      operationalBlockers.push(
        'RISK_IVP_ACTIVE: An open IVP investigation exists for this term',
      );
    }

    return { financialBlockers, operationalBlockers };
  },
};
