import { describe, expect, it } from 'vitest';
import { shouldCollapseApproval } from './approval-collapse.js';

describe('shouldCollapseApproval', () => {
  it('returns true when actor satisfies a single approver', () => {
    expect(shouldCollapseApproval('school_owner', ['school_owner'])).toBe(true);
  });

  it('returns false when multiple distinct approvers are required', () => {
    expect(shouldCollapseApproval('principal', ['school_owner', 'principal'])).toBe(false);
  });

  it('returns true when actor role matches every required approver', () => {
    expect(shouldCollapseApproval('school_owner', ['school_owner', 'school_owner'])).toBe(true);
  });
});
