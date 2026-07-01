import { describe, expect, it } from 'vitest';

import {
  CORE_SMS_REFUND_STEPUP_THRESHOLD_MINOR,
  advancedOptionalTotpLogin,
  coreLoginRequiresSms,
  enterpriseMandatoryTotpStepUp,
  refundApproveRequiresStepUp,
  stepUpUsesSms,
} from './core-mfa-policy.js';

describe('coreLoginRequiresSms', () => {
  it('never requires SMS at login (platform-only login MFA)', () => {
    expect(
      coreLoginRequiresSms('principal', 'core', {
        workflowsInbox: false,
        timetableDedicatedOfficer: false,
        deputyExamEnabled: false,
        totpOptional: false,
      }),
    ).toBe(false);
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

describe('advancedOptionalTotpLogin', () => {
  const advancedFlags = {
    workflowsInbox: true,
    timetableDedicatedOfficer: true,
    deputyExamEnabled: true,
    totpOptional: true,
  };

  it('enables optional TOTP login for Advanced finance roles when flag is on', () => {
    expect(advancedOptionalTotpLogin('accountant', 'advanced', advancedFlags)).toBe(true);
  });

  it('does not apply on Core tier', () => {
    expect(advancedOptionalTotpLogin('principal', 'core', advancedFlags)).toBe(false);
  });

  it('does not apply when totpOptional is off', () => {
    expect(
      advancedOptionalTotpLogin('principal', 'advanced', {
        ...advancedFlags,
        totpOptional: false,
      }),
    ).toBe(false);
  });
});

describe('enterpriseMandatoryTotpStepUp', () => {
  it('requires TOTP for result publish in Enterprise', () => {
    expect(enterpriseMandatoryTotpStepUp('result_publish', 'enterprise')).toBe(true);
  });

  it('does not apply on Core tier', () => {
    expect(enterpriseMandatoryTotpStepUp('result_publish', 'core')).toBe(false);
  });
});

describe('Enterprise step-up channel', () => {
  const enterpriseFlags = {
    workflowsInbox: true,
    timetableDedicatedOfficer: true,
    deputyExamEnabled: true,
    totpOptional: true,
    admissionsRequirePrincipalApproval: true,
    admissionsRequireOwnerApproval: true,
  };

  it('uses TOTP (not SMS) for all refund amounts', () => {
    expect(
      stepUpUsesSms('refund_approve', 'enterprise', enterpriseFlags, {
        refundAmountMinor: 1,
      }),
    ).toBe(false);
    expect(refundApproveRequiresStepUp('enterprise', enterpriseFlags, 1)).toBe(true);
  });
});
