import { describe, expect, it } from 'vitest';
import { mergeExperienceFlags, toTenantExperienceView } from './experience.js';

describe('mergeExperienceFlags', () => {
  it('returns Core defaults when partial is empty', () => {
    expect(mergeExperienceFlags({})).toEqual({
      workflowsInbox: false,
      timetableDedicatedOfficer: false,
      deputyExamEnabled: false,
      totpOptional: false,
    });
  });

  it('merges explicit overrides', () => {
    expect(mergeExperienceFlags({ workflowsInbox: true })).toMatchObject({
      workflowsInbox: true,
      deputyExamEnabled: false,
    });
  });
});

describe('toTenantExperienceView', () => {
  it('resolves flags in the response', () => {
    const view = toTenantExperienceView('019c0000-0000-7000-8000-000000000099', 'advanced', 'split', {
      workflowsInbox: true,
    });
    expect(view.experienceTier).toBe('advanced');
    expect(view.financeMode).toBe('split');
    expect(view.flags.workflowsInbox).toBe(true);
    expect(view.flags.deputyExamEnabled).toBe(false);
  });
});
