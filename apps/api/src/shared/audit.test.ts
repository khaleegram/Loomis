import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('postgres', () => {
  const client = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => mockQuery(strings, ...values),
    { end: vi.fn() },
  );
  return { default: vi.fn(() => client) };
});

vi.mock('../config/env.js', () => ({
  getEnv: vi.fn(() => ({
    DATABASE_AUDIT_URL: 'postgresql://loomis:loomis@localhost:15432/loomis_audit',
  })),
}));

describe('audit', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { resetAuditClientForTests } = await import('./audit.js');
    resetAuditClientForTests();
  });

  it('isAuditAvailable returns true when audit DB responds', async () => {
    mockQuery.mockResolvedValueOnce([{ '?column?': 1 }]);
    const { isAuditAvailable } = await import('./audit.js');
    await expect(isAuditAvailable()).resolves.toBe(true);
  });

  it('isAuditAvailable returns false when audit DB is down', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'));
    const { isAuditAvailable } = await import('./audit.js');
    await expect(isAuditAvailable()).resolves.toBe(false);
  });

  it('assertAuditAvailable throws AUDIT_UNAVAILABLE when audit is down', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'));
    const { assertAuditAvailable } = await import('./audit.js');
    await expect(assertAuditAvailable()).rejects.toMatchObject({
      code: 'AUDIT_UNAVAILABLE',
      statusCode: 503,
    });
  });

  it('writeAudit inserts with hash chain', async () => {
    mockQuery
      .mockResolvedValueOnce([{ entry_hash: 'abc123' }])
      .mockResolvedValueOnce([]);

    const { writeAudit } = await import('./audit.js');
    await writeAudit({
      tenantId: '01930000000070000000000000000001',
      actorUserId: '01930000000070000000000000000002',
      action: 'payment.offline.logged',
      resourceType: 'payment',
      resourceId: '01930000000070000000000000000003',
      sensitivity: 'financial',
      result: 'success',
      requestId: '01930000000070000000000000000004',
    });

    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('performAuditedWrite runs mutation then writes audit', async () => {
    mockQuery
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { performAuditedWrite } = await import('./audit.js');
    const mutate = vi.fn().mockResolvedValue({ id: 'result-id' });

    const result = await performAuditedWrite(
      {
        tenantId: null,
        actorUserId: '01930000000070000000000000000002',
        action: 'test.action',
        resourceType: 'test',
        resourceId: '01930000000070000000000000000003',
        sensitivity: 'standard',
        result: 'success',
        requestId: '01930000000070000000000000000004',
      },
      mutate,
    );

    expect(result).toEqual({ id: 'result-id' });
    expect(mutate).toHaveBeenCalledOnce();
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });
});
