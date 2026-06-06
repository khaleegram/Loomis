import { paymentRepository } from '../../finance/repository/payment.repository.js';

/**
 * Term closure gate (FR-ASM-006 / US-ASM-004 / CON-021).
 *
 * Term closure is gated on conditions owned by modules that are NOT built yet
 * (Phase 1 stops at Student): unsettled PSF obligations and unverified offline
 * payments (FINANCIAL — can NEVER be overridden at the school level, CON-021),
 * plus locked gradebooks, published results, resolved grade-correction
 * workflows, and no open IVP case (OPERATIONAL — the Principal may override with
 * a documented reason).
 *
 * Per loomis-financial-integrity "Fail Closed" and loomis-implementation-
 * guardrails, we do NOT fabricate an "all clear". Until each source module's
 * read-model exists, its check is `unverifiable` and is treated as a blocker.
 * The financial blockers are unverifiable-and-unoverridable; closure stays
 * blocked rather than proceeding unsafely.
 */
export interface TermClosureEvaluation {
  /** Financial blockers — never overridable at school level (CON-021). */
  financialBlockers: string[];
  /** Operational blockers — overridable by the Principal with a reason. */
  operationalBlockers: string[];
}

export const termClosureGate = {
  async evaluate(tenantId: string, termId: string): Promise<TermClosureEvaluation> {
    const financialBlockers: string[] = [
      'PENDING_LEDGER: PSF obligation settlement status cannot be verified (Ledger module not built)',
    ];

    const unverifiedOffline = await paymentRepository.countUnverifiedOfflinePayments(
      tenantId,
      termId,
    );
    if (unverifiedOffline > 0) {
      financialBlockers.push(
        `FINANCE_UNVERIFIED_OFFLINE_PAYMENTS: ${unverifiedOffline} offline payment(s) await accountant verification`,
      );
    }

    return {
      financialBlockers,
      // Academic gradebook/exams + Workflow + Risk (IVP) — operational.
      operationalBlockers: [
        'PENDING_ACADEMIC: gradebook lock / result publication state cannot be verified',
        'PENDING_WORKFLOW: grade-correction workflow resolution cannot be verified',
        'PENDING_RISK: open IVP investigation state cannot be verified',
      ],
    };
  },
};
