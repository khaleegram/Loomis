import { describe, expect, it } from 'vitest';
import { assertTenantScopedKey, queryKeys } from './keys.js';

describe('queryKeys', () => {
  const tenantA = '11111111-1111-4111-8111-111111111111';
  const tenantB = '22222222-2222-4222-8222-222222222222';
  const studentId = '33333333-3333-4333-8333-333333333333';

  it('places tenantId as the second element on student keys', () => {
    expect(queryKeys.students.all(tenantA)).toEqual(['students', tenantA]);
    expect(queryKeys.students.list(tenantA, { status: 'enrolled' })).toEqual([
      'students',
      tenantA,
      'list',
      { status: 'enrolled' },
    ]);
    expect(queryKeys.students.detail(tenantA, studentId)).toEqual([
      'students',
      tenantA,
      'detail',
      studentId,
    ]);
    expect(queryKeys.students.profile(tenantA, studentId)).toEqual([
      'students',
      tenantA,
      'profile',
      studentId,
    ]);
  });

  it('partitions cache entries per tenant', () => {
    const keyA = queryKeys.students.all(tenantA);
    const keyB = queryKeys.students.all(tenantB);
    expect(keyA).not.toEqual(keyB);
    expect(keyA[1]).toBe(tenantA);
    expect(keyB[1]).toBe(tenantB);
  });

  it('keeps identity keys user-scoped without tenantId', () => {
    expect(queryKeys.identity.sessions()).toEqual(['identity', 'sessions']);
    expect(queryKeys.identity.devices()).toEqual(['identity', 'devices']);
  });

  it('assertTenantScopedKey rejects mismatched tenant', () => {
    expect(() => assertTenantScopedKey(['students', tenantB], tenantA)).toThrow(
      /tenantId/,
    );
  });
});
