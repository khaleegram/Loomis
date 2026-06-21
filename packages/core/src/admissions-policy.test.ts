import { describe, expect, it } from 'vitest';

import { canDecideAdmissions, shouldAutoApproveAdmissionOnCreate } from './admissions-policy.js';
import { mergeExperienceFlags } from './experience.js';

const coreFlags = mergeExperienceFlags({});
const principalRequiredFlags = mergeExperienceFlags({ admissionsRequirePrincipalApproval: true });

describe('canDecideAdmissions', () => {
  it('allows admin to decide on Core default', () => {
    expect(canDecideAdmissions('admin_officer', coreFlags)).toBe(true);
  });

  it('allows principal and owner on Core default', () => {
    expect(canDecideAdmissions('principal', coreFlags)).toBe(true);
    expect(canDecideAdmissions('school_owner', coreFlags)).toBe(true);
  });

  it('blocks admin when principal approval is required', () => {
    expect(canDecideAdmissions('admin_officer', principalRequiredFlags)).toBe(false);
  });

  it('still allows leadership when principal approval is required', () => {
    expect(canDecideAdmissions('principal', principalRequiredFlags)).toBe(true);
    expect(canDecideAdmissions('school_owner', principalRequiredFlags)).toBe(true);
  });

  it('denies teachers regardless of policy', () => {
    expect(canDecideAdmissions('teacher', coreFlags)).toBe(false);
    expect(canDecideAdmissions('teacher', principalRequiredFlags)).toBe(false);
  });
});

describe('shouldAutoApproveAdmissionOnCreate', () => {
  it('is true on Core default', () => {
    expect(shouldAutoApproveAdmissionOnCreate(coreFlags)).toBe(true);
  });

  it('is false when principal approval is required', () => {
    expect(shouldAutoApproveAdmissionOnCreate(principalRequiredFlags)).toBe(false);
  });
});
