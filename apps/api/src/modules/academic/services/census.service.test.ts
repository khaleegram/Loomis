import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LoomisError } from '../../../shared/errors.js';

vi.mock('../../student/repository/student.repository.js', () => ({
  studentRepository: {},
}));
vi.mock('../../student/repository/attestation.repository.js', () => ({
  attestationRepository: {},
}));
vi.mock('../../tenant/repository/configuration.repository.js', () => ({
  configurationRepository: {},
}));
vi.mock('../../tenant/services/psf-rate.service.js', () => ({
  psfRateService: {},
}));
vi.mock('../../tenant/repository/tenant.repository.js', () => ({
  tenantRepository: {},
}));
vi.mock('../repository/academic.repository.js', () => ({
  academicRepository: {},
}));
vi.mock('../repository/outbox.repository.js', () => ({
  outboxRepository: {},
}));
vi.mock('../services/_shared.js', () => ({
  requireTenant: vi.fn(),
  requireTerm: vi.fn().mockResolvedValue({ status: 'open', academicYearId: 'year-1' }),
}));
vi.mock('../../../shared/tenant-context.js', () => ({
  withTenantContext: vi.fn(),
}));

const { censusService } = await import('../services/census.service.js');

describe('censusService.lockCensus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects principal — only school owner may lock census', async () => {
    await expect(
      censusService.lockCensus(
        'tenant-1',
        'term-1',
        { declaredBillableCount: 10, belowMtcAcknowledged: false },
        { userId: 'user-1', role: 'principal', tenantId: 'tenant-1' },
      ),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    } satisfies Partial<LoomisError>);
  });
});
