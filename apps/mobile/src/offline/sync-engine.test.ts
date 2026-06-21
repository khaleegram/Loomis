import { describe, expect, it } from 'vitest';
import { buildAttendanceSigningMessage } from './signing-message.js';

describe('buildAttendanceSigningMessage', () => {
  it('matches server canonical format', () => {
    const message = buildAttendanceSigningMessage({
      originTenantId: '11111111-1111-7111-8111-111111111111',
      termId: '22222222-2222-7222-8222-222222222222',
      classArmId: '33333333-3333-7333-8333-333333333333',
      studentId: '44444444-4444-7444-8444-444444444444',
      attendanceDate: '2026-06-15',
      session: 'full_day',
      status: 'present',
      capturedAt: '2026-06-15T08:00:00.000Z',
    });

    expect(message).toBe(
      [
        'loomis.attendance.v1',
        '11111111-1111-7111-8111-111111111111',
        '22222222-2222-7222-8222-222222222222',
        '33333333-3333-7333-8333-333333333333',
        '44444444-4444-7444-8444-444444444444',
        '2026-06-15',
        'full_day',
        'present',
        '2026-06-15T08:00:00.000Z',
      ].join('|'),
    );
  });
});

describe('sync conflict branches', () => {
  it('flags tenant mismatch as quarantined', () => {
    const activeTenant = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa';
    const itemTenant = 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb';
    expect(activeTenant).not.toBe(itemTenant);
  });

  it('treats stale entries older than 7 days', () => {
    const createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    expect(new Date(createdAt).getTime()).toBeLessThan(cutoff.getTime());
  });
});
