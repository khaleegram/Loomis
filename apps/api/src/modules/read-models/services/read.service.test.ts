import { describe, expect, it, vi } from 'vitest';
import { LoomisError } from '../../../shared/errors.js';

vi.mock('../repository/index.js', () => ({
  parentDashboardRepository: {
    listForParent: vi.fn().mockResolvedValue([]),
  },
  regionalAnalyticsRepository: {
    listByRegion: vi.fn().mockResolvedValue([
      {
        tenantId: 't1',
        region: 'south-west',
        snapshotDate: '2026-06-07',
        totalStudents: 100,
        activeEnrollments: 95,
        attendanceRateMilli: 900,
        feeCollectionRateMilli: 800,
        feeCollectedMinor: 1_000_000,
        psfCollectedMinor: 50_000,
      },
    ]),
  },
}));

describe('read model read services', () => {
  it('parent dashboard requires parent role', async () => {
    const { parentDashboardReadService } = await import('./read.service.js');
    await expect(
      parentDashboardReadService.getDashboard({
        userId: 'u1',
        role: 'teacher',
        tenantId: null,
      }),
    ).rejects.toBeInstanceOf(LoomisError);
  });

  it('regional analytics aggregates tenant totals', async () => {
    const { regionalAnalyticsReadService } = await import('./read.service.js');
    const result = await regionalAnalyticsReadService.getDashboard(
      { userId: 'u1', role: 'regional_manager', tenantId: null },
      'south-west',
    );

    expect(result.totals.totalStudents).toBe(100);
    expect(result.totals.feeCollectedMinor).toBe(1_000_000);
    expect(result.tenants).toHaveLength(1);
  });
});
