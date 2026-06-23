import { describe, expect, it } from 'vitest';

import { resolveEffectiveStaffRoles } from './resolve-effective-staff-roles';

describe('resolveEffectiveStaffRoles', () => {
  it('uses session extensions before teaching context loads', () => {
    expect(resolveEffectiveStaffRoles('accountant', ['teacher'], undefined)).toEqual([
      'accountant',
      'teacher',
    ]);
  });

  it('merges session extensions with term teaching duties', () => {
    expect(
      resolveEffectiveStaffRoles('accountant', ['teacher'], {
        staffProfileId: '019c0000-0000-7000-8000-000000000099',
        subjectAssignments: [
          {
            assignmentId: '019c0000-0000-7000-8000-000000000001',
            termId: '019c0000-0000-7000-8000-000000000002',
            classArmId: '019c0000-0000-7000-8000-000000000003',
            classArmLabel: 'JSS1 A',
            subjectId: '019c0000-0000-7000-8000-000000000004',
          },
        ],
        classTeacherAssignment: null,
      }),
    ).toEqual(['accountant', 'teacher']);
  });

  it('adds class_teacher from teaching context when not in session', () => {
    expect(
      resolveEffectiveStaffRoles('admin_officer', [], {
        staffProfileId: '019c0000-0000-7000-8000-000000000099',
        subjectAssignments: [],
        classTeacherAssignment: {
          termId: '019c0000-0000-7000-8000-000000000002',
          classArmId: '019c0000-0000-7000-8000-000000000003',
          classArmLabel: 'JSS1 A',
        },
      }),
    ).toEqual(['admin_officer', 'class_teacher']);
  });
});
