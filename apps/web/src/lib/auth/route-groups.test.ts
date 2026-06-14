import { describe, expect, it } from 'vitest';

import {
  GROUP_PREFIX,
  ROLE_GROUP,
  groupForPath,
  homePathForRole,
  roleCanAccessPath,
} from './route-groups';

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
    expect(groupForPath('/platformx')).toBeNull(); // not a prefix boundary
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

  it('returns the home path for a role', () => {
    expect(homePathForRole('principal')).toBe('/school');
    expect(homePathForRole('regional_manager')).toBe('/regional');
    expect(homePathForRole('platform_owner')).toBe('/platform');
    expect(homePathForRole('dpo')).toBe('/platform/compliance');
    expect(homePathForRole('parent')).toBe('/parent');
    expect(homePathForRole('timetable_officer')).toBe('/school/timetable');
    expect(homePathForRole('teacher')).toBe('/school/timetable');
    expect(homePathForRole('class_teacher')).toBe('/school/dashboard');
  });
});
