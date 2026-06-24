import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRunScheduledSnapshots = vi.fn();
const mockRunMtcWarnings = vi.fn();

vi.mock('../services/census.service.js', () => ({
  censusService: {
    runScheduledSnapshots: mockRunScheduledSnapshots,
    runMtcWarnings: mockRunMtcWarnings,
  },
}));

describe('enrollment-snapshot job handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunScheduledSnapshots.mockResolvedValue({ snapshotted: 2, skipped: 1 });
    mockRunMtcWarnings.mockResolvedValue({ notified: 1 });
  });

  it('runs scheduled snapshots and MTC warnings', async () => {
    const { censusService } = await import('../services/census.service.js');
    const snapshotResult = await censusService.runScheduledSnapshots();
    const mtcResult = await censusService.runMtcWarnings();
    expect(snapshotResult).toEqual({ snapshotted: 2, skipped: 1 });
    expect(mtcResult).toEqual({ notified: 1 });
    expect(mockRunScheduledSnapshots).toHaveBeenCalledOnce();
    expect(mockRunMtcWarnings).toHaveBeenCalledOnce();
  });
});
