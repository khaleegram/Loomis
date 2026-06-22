import { describe, expect, it } from 'vitest';

import {
  CORE_OWNER_REFUND_THRESHOLD_MINOR,
  refundApproverRolesFromChain,
  resolveCoreRefundChain,
  resolveEffectiveWorkflowChain,
  shouldSkipLeadershipStep,
} from './core-workflow-chains.js';

describe('resolveCoreRefundChain', () => {
  it('uses Principal only below threshold', () => {
    const chain = resolveCoreRefundChain(CORE_OWNER_REFUND_THRESHOLD_MINOR - 1, {});
    expect(refundApproverRolesFromChain(chain)).toEqual(['principal']);
  });

  it('uses Owner at or above threshold', () => {
    const chain = resolveCoreRefundChain(CORE_OWNER_REFUND_THRESHOLD_MINOR, {});
    expect(refundApproverRolesFromChain(chain)).toEqual(['school_owner']);
  });

  it('honours tenant single-approver override to Principal', () => {
    const chain = resolveCoreRefundChain(CORE_OWNER_REFUND_THRESHOLD_MINOR, {
      coreRefundSingleApprover: 'principal',
    });
    expect(refundApproverRolesFromChain(chain)).toEqual(['principal']);
  });

  it('honours tenant single-approver override to Owner', () => {
    const chain = resolveCoreRefundChain(100, { coreRefundSingleApprover: 'owner' });
    expect(refundApproverRolesFromChain(chain)).toEqual(['school_owner']);
  });
});

describe('resolveEffectiveWorkflowChain', () => {
  const defaultRefundChain = [
    { role: 'accountant' as const, timeoutHours: 48 },
    { role: 'principal' as const, timeoutHours: 48 },
    { role: 'school_owner' as const, timeoutHours: 72 },
  ];

  it('uses Core refund chain for core tier', () => {
    const chain = resolveEffectiveWorkflowChain({
      workflowType: 'refund_request',
      experienceTier: 'core',
      financeMode: 'combined',
      flags: {},
      payload: { amountMinor: 100 },
      defaultChain: defaultRefundChain,
    });
    expect(refundApproverRolesFromChain(chain)).toEqual(['principal']);
  });

  it('uses default chain when Advanced workflows inbox enabled', () => {
    const chain = resolveEffectiveWorkflowChain({
      workflowType: 'refund_request',
      experienceTier: 'advanced',
      financeMode: 'split',
      flags: { workflowsInbox: true },
      payload: { amountMinor: 100 },
      defaultChain: defaultRefundChain,
    });
    expect(refundApproverRolesFromChain(chain)).toEqual(['accountant', 'principal', 'school_owner']);
  });

  it('trims Owner from Advanced admission chain when flag is off', () => {
    const defaultAdmissionChain = [
      { role: 'principal' as const, timeoutHours: 48 },
      { role: 'school_owner' as const, timeoutHours: 72 },
    ];
    const chain = resolveEffectiveWorkflowChain({
      workflowType: 'admission_decision',
      experienceTier: 'advanced',
      financeMode: 'combined',
      flags: { workflowsInbox: true, admissionsRequireOwnerApproval: false },
      defaultChain: defaultAdmissionChain,
    });
    expect(refundApproverRolesFromChain(chain)).toEqual(['principal']);
  });

  it('includes Owner in Advanced admission chain when flag is on', () => {
    const defaultAdmissionChain = [
      { role: 'principal' as const, timeoutHours: 48 },
      { role: 'school_owner' as const, timeoutHours: 72 },
    ];
    const chain = resolveEffectiveWorkflowChain({
      workflowType: 'admission_decision',
      experienceTier: 'advanced',
      financeMode: 'combined',
      flags: { workflowsInbox: true, admissionsRequireOwnerApproval: true },
      defaultChain: defaultAdmissionChain,
    });
    expect(refundApproverRolesFromChain(chain)).toEqual(['principal', 'school_owner']);
  });
});

describe('shouldSkipLeadershipStep', () => {
  const shared = 'user-1';

  it('skips the other leadership hat for the same user', () => {
    expect(
      shouldSkipLeadershipStep({
        actorUserId: shared,
        actorRole: 'school_owner',
        stepApproverRole: 'principal',
        ownerUserId: shared,
        principalUserId: shared,
      }),
    ).toBe(true);
  });

  it('does not skip when leadership users differ', () => {
    expect(
      shouldSkipLeadershipStep({
        actorUserId: 'owner-user',
        actorRole: 'school_owner',
        stepApproverRole: 'principal',
        ownerUserId: 'owner-user',
        principalUserId: 'principal-user',
      }),
    ).toBe(false);
  });
});
