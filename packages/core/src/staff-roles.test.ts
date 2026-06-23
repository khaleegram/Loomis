import { describe, expect, it } from 'vitest';

import {
  canActAsClassTeacher,
  canTeachSubjects,
  effectiveCanForRoles,
  hasMobileTeachingAccess,
  mergeEffectiveRoles,
  mobileHomeRole,
} from './staff-roles.js';

describe('mergeEffectiveRoles', () => {
  it('includes primary and extensions without duplicates', () => {
    expect(mergeEffectiveRoles('accountant', ['teacher', 'teacher'])).toEqual([
      'accountant',
      'teacher',
    ]);
  });
});

describe('teaching role helpers', () => {
  it('detects class teacher extension on non-teaching primary', () => {
    const roles = mergeEffectiveRoles('admin_officer', ['class_teacher']);
    expect(canActAsClassTeacher(roles)).toBe(true);
    expect(canTeachSubjects(roles)).toBe(true);
  });

  it('grants gradebook.write via teacher extension', () => {
    const roles = mergeEffectiveRoles('accountant', ['teacher']);
    expect(effectiveCanForRoles(roles, 'gradebook.write', 'combined')).toBe(true);
    expect(effectiveCanForRoles(roles, 'payment.verify', 'combined')).toBe(true);
  });
});

describe('mobile teaching access', () => {
  it('allows accountant with teacher extension on mobile', () => {
    expect(hasMobileTeachingAccess('accountant', ['teacher'])).toBe(true);
    expect(mobileHomeRole('accountant', ['teacher'])).toBe('teacher');
  });

  it('prefers class teacher stack when both extensions exist', () => {
    expect(mobileHomeRole('accountant', ['teacher', 'class_teacher'])).toBe('class_teacher');
  });
});
