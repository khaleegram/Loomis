import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LoomisError } from '../../../shared/errors.js';

vi.mock('../../comms/services/delivery.service.js', () => ({
  deliveryService: { createManyInApp: vi.fn() },
}));
vi.mock('../../comms/services/transactional-email.service.js', () => ({
  transactionalEmailService: {
    sendPlatformBillingSnapshotEmail: vi.fn(),
    sendMtcBelowCommitmentWarningEmail: vi.fn(),
  },
}));
vi.mock('../../hrm/repository/staff.repository.js', () => ({
  staffRepository: { findActiveUserIdsByRole: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../student/repository/student.repository.js', () => ({
  studentRepository: {},
}));
vi.mock('../../student/repository/attestation.repository.js', () => ({
  attestationRepository: { findByTerm: vi.fn() },
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
  requireTerm: vi.fn().mockResolvedValue({ status: 'open', academicYearId: 'year-1', name: 'Term 1' }),
}));
vi.mock('../../../shared/tenant-context.js', () => ({
  withTenantContext: vi.fn(),
}));

const { censusService } = await import('../services/census.service.js');

describe('censusService.snapshotNow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects principal — only school owner may take an early snapshot', async () => {
    await expect(
      censusService.snapshotNow('tenant-1', 'term-1', {
        userId: 'user-1',
        role: 'principal',
        tenantId: 'tenant-1',
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    } satisfies Partial<LoomisError>);
  });
});
