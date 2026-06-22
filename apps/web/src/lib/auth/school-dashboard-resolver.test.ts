import { describe, expect, it } from 'vitest';

import { resolveSchoolDashboardVariant } from '@/lib/auth/school-dashboard-resolver';

describe('resolveSchoolDashboardVariant', () => {
  it('maps leadership by tier', () => {
    expect(resolveSchoolDashboardVariant('school_owner', true)).toBe('core_owner');
    expect(resolveSchoolDashboardVariant('school_owner', false)).toBe('advanced_owner');
    expect(resolveSchoolDashboardVariant('principal', true)).toBe('core_principal');
    expect(resolveSchoolDashboardVariant('principal', false)).toBe('advanced_principal');
  });

  it('maps operational teaching roles', () => {
    expect(resolveSchoolDashboardVariant('admin_officer', true)).toBe('admin_officer');
    expect(resolveSchoolDashboardVariant('teacher', false)).toBe('teacher');
    expect(resolveSchoolDashboardVariant('class_teacher', true)).toBe('class_teacher');
  });

  it('redirects finance and exam roles', () => {
    expect(resolveSchoolDashboardVariant('accountant', false)).toBe('redirect');
    expect(resolveSchoolDashboardVariant('exam_officer', true)).toBe('redirect');
  });
});
