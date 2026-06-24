import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';

vi.mock('../shared/audit.js', () => ({
  assertAuditAvailable: vi.fn(),
}));

describe('requireAuditAvailable middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to assertAuditAvailable', async () => {
    const { assertAuditAvailable } = await import('../shared/audit.js');
    const { requireAuditAvailable } = await import('./require-audit-available.js');

    await requireAuditAvailable({} as FastifyRequest, {} as FastifyReply);
    expect(assertAuditAvailable).toHaveBeenCalledOnce();
  });

  it('propagates AUDIT_UNAVAILABLE errors', async () => {
    const { assertAuditAvailable } = await import('../shared/audit.js');
    const { LoomisError } = await import('../shared/errors.js');
    vi.mocked(assertAuditAvailable).mockRejectedValueOnce(
      new LoomisError('AUDIT_UNAVAILABLE', 503, 'down'),
    );

    const { requireAuditAvailable } = await import('./require-audit-available.js');
    await expect(
      requireAuditAvailable({} as FastifyRequest, {} as FastifyReply),
    ).rejects.toMatchObject({ code: 'AUDIT_UNAVAILABLE' });
  });
});
