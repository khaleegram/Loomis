import { describe, expect, it } from 'vitest';

import {
  CORE_SMS_REFUND_STEPUP_THRESHOLD_MINOR,
  coreLoginRequiresSms,
  refundApproveRequiresStepUp,
  stepUpUsesSms,
} from './core-mfa-policy.js';

describe('coreLoginRequiresSms', () => {
  it('requires SMS for Core principal', () => {
    expect(
      coreLoginRequiresSms('principal', 'core', {
        workflowsInbox: false,
        timetableDedicatedOfficer: false,
        deputyExamEnabled: false,
        totpOptional: false,
      }),
    ).toBe(true);
  });

  it('does not require SMS for teachers in Core', () => {
    expect(
      coreLoginRequiresSms('teacher', 'core', {
        workflowsInbox: false,
        timetableDedicatedOfficer: false,
        deputyExamEnabled: false,
        totpOptional: false,
      }),
    ).toBe(false);
  });
});

describe('stepUpUsesSms', () => {
  const coreFlags = {
    workflowsInbox: false,
    timetableDedicatedOfficer: false,
    deputyExamEnabled: false,
    totpOptional: false,
  };

  it('uses SMS for census lock in Core', () => {
    expect(stepUpUsesSms('census_lock', 'core', coreFlags)).toBe(true);
  });

  it('uses SMS for large refunds in Core', () => {
    expect(
      stepUpUsesSms('refund_approve', 'core', coreFlags, {
        refundAmountMinor: CORE_SMS_REFUND_STEPUP_THRESHOLD_MINOR,
      }),
    ).toBe(true);
  });

  it('skips SMS step-up for small refunds in Core', () => {
    expect(
      stepUpUsesSms('refund_approve', 'core', coreFlags, {
        refundAmountMinor: CORE_SMS_REFUND_STEPUP_THRESHOLD_MINOR - 1,
      }),
    ).toBe(false);
  });
});

describe('refundApproveRequiresStepUp', () => {
  const coreFlags = {
    workflowsInbox: false,
    timetableDedicatedOfficer: false,
    deputyExamEnabled: false,
    totpOptional: false,
  };

  it('skips step-up below threshold in Core', () => {
    expect(refundApproveRequiresStepUp('core', coreFlags, 100)).toBe(false);
  });

  it('requires step-up at threshold in Core', () => {
    expect(
      refundApproveRequiresStepUp('core', coreFlags, CORE_SMS_REFUND_STEPUP_THRESHOLD_MINOR),
    ).toBe(true);
  });
});
