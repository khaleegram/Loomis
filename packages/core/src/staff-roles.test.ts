import { describe, expect, it } from 'vitest';

import {
  canActAsClassTeacher,
  canTeachSubjects,
  effectiveCanForRoles,
  mergeEffectiveRoles,
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
