import { describe, expect, it } from 'vitest';

import { homePathForRole, landingPathForRole } from '@/lib/auth/home-path';
import {
  GROUP_PREFIX,
  ROLE_GROUP,
  groupForPath,
  roleCanAccessPath,
} from '@/lib/auth/route-groups';

describe('route-groups', () => {
  it('maps every role to a console group', () => {
    for (const group of Object.values(ROLE_GROUP)) {
      expect(GROUP_PREFIX[group]).toBeDefined();
    }
  });

  it('resolves the owning group for a console path', () => {
    expect(groupForPath('/platform')).toBe('platform');
    expect(groupForPath('/platform/revenue')).toBe('platform');
    expect(groupForPath('/school/students')).toBe('school');
    expect(groupForPath('/parent/children')).toBe('parent');
  });

  it('treats non-console paths as public', () => {
    expect(groupForPath('/')).toBeNull();
    expect(groupForPath('/login')).toBeNull();
    expect(groupForPath('/platformx')).toBeNull();
  });

  it('allows a role only within its own group', () => {
    expect(roleCanAccessPath('principal', '/school/students')).toBe(true);
    expect(roleCanAccessPath('principal', '/platform/revenue')).toBe(false);
    expect(roleCanAccessPath('platform_admin', '/platform/tenants')).toBe(true);
    expect(roleCanAccessPath('teacher', '/parent/children')).toBe(false);
  });

  it('permits any role on a public path', () => {
    expect(roleCanAccessPath('student', '/')).toBe(true);
  });
});

describe('homePathForRole', () => {
  it('routes finance and leadership roles per Sprint 3/4', () => {
    expect(homePathForRole('principal')).toBe('/school/dashboard');
    expect(homePathForRole('school_owner')).toBe('/school/dashboard');
    expect(homePathForRole('admin_officer')).toBe('/school/dashboard');
    expect(homePathForRole('accountant')).toBe('/school/finance/payments/verify');
    expect(homePathForRole('cashier', { financeMode: 'combined' })).toBe(
      '/school/finance/payments/verify',
    );
    expect(homePathForRole('cashier', { financeMode: 'split' })).toBe('/school/finance/payments/log');
    expect(homePathForRole('exam_officer')).toBe('/school/exams');
    expect(homePathForRole('dpo')).toBe('/platform/compliance');
    expect(homePathForRole('timetable_officer', { experienceTier: 'core' })).toBe('/school/academic');
  });
});

describe('landingPathForRole', () => {
  it('routes school roles through /school for tier-aware redirect', () => {
    expect(landingPathForRole('principal')).toBe('/school');
    expect(landingPathForRole('cashier')).toBe('/school');
    expect(landingPathForRole('accountant')).toBe('/school');
    expect(landingPathForRole('platform_admin')).toBe('/platform/dashboard');
    expect(landingPathForRole('parent')).toBe('/parent/dashboard');
  });
});
