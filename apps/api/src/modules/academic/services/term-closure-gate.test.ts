import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../finance/repository/payment.repository.js', () => ({
  paymentRepository: {
    countUnverifiedOfflinePayments: vi.fn(),
  },
}));
vi.mock('../../ledger/repository/index.js', () => ({
  obligationRepository: {
    countUnsettledForTerm: vi.fn(),
  },
}));
vi.mock('../../risk/repository/case.repository.js', () => ({
  caseRepository: {
    hasActiveCaseForTerm: vi.fn(),
  },
}));
vi.mock('../repository/academic.repository.js', () => ({
  academicRepository: {
    countUnlockedGradebookEntries: vi.fn(),
    countEnrolledStudentsWithoutPublishedResults: vi.fn(),
    countPendingGradeCorrectionsForTerm: vi.fn(),
  },
}));

const { paymentRepository } = await import('../../finance/repository/payment.repository.js');
const { obligationRepository } = await import('../../ledger/repository/index.js');
const { caseRepository } = await import('../../risk/repository/case.repository.js');
const { academicRepository } = await import('../repository/academic.repository.js');
const { termClosureGate } = await import('./term-closure-gate.js');

describe('termClosureGate.evaluate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(obligationRepository.countUnsettledForTerm).mockResolvedValue(0);
    vi.mocked(paymentRepository.countUnverifiedOfflinePayments).mockResolvedValue(0);
    vi.mocked(academicRepository.countUnlockedGradebookEntries).mockResolvedValue(0);
    vi.mocked(academicRepository.countEnrolledStudentsWithoutPublishedResults).mockResolvedValue(0);
    vi.mocked(academicRepository.countPendingGradeCorrectionsForTerm).mockResolvedValue(0);
    vi.mocked(caseRepository.hasActiveCaseForTerm).mockResolvedValue(false);
  });

  it('returns no blockers when all checks pass', async () => {
    const result = await termClosureGate.evaluate('tenant-1', 'term-1');
    expect(result.financialBlockers).toEqual([]);
    expect(result.operationalBlockers).toEqual([]);
  });

  it('reports financial blockers that cannot be overridden', async () => {
    vi.mocked(obligationRepository.countUnsettledForTerm).mockResolvedValue(2);
    vi.mocked(paymentRepository.countUnverifiedOfflinePayments).mockResolvedValue(1);

    const result = await termClosureGate.evaluate('tenant-1', 'term-1');
    expect(result.financialBlockers).toHaveLength(2);
    expect(result.financialBlockers[0]).toContain('LEDGER_UNSETTLED_PSF_OBLIGATIONS');
    expect(result.financialBlockers[1]).toContain('FINANCE_UNVERIFIED_OFFLINE_PAYMENTS');
  });

  it('reports operational blockers from academic and risk modules', async () => {
    vi.mocked(academicRepository.countUnlockedGradebookEntries).mockResolvedValue(3);
    vi.mocked(academicRepository.countEnrolledStudentsWithoutPublishedResults).mockResolvedValue(5);
    vi.mocked(academicRepository.countPendingGradeCorrectionsForTerm).mockResolvedValue(1);
    vi.mocked(caseRepository.hasActiveCaseForTerm).mockResolvedValue(true);

    const result = await termClosureGate.evaluate('tenant-1', 'term-1');
    expect(result.operationalBlockers).toHaveLength(4);
    expect(result.operationalBlockers.some((b) => b.startsWith('ACADEMIC_GRADEBOOK_UNLOCKED'))).toBe(
      true,
    );
    expect(result.operationalBlockers.some((b) => b.startsWith('ACADEMIC_RESULTS_UNPUBLISHED'))).toBe(
      true,
    );
    expect(
      result.operationalBlockers.some((b) => b.startsWith('ACADEMIC_GRADE_CORRECTION_PENDING')),
    ).toBe(true);
    expect(result.operationalBlockers.some((b) => b.startsWith('RISK_IVP_ACTIVE'))).toBe(true);
  });
});
