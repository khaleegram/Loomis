import { describe, expect, it } from 'vitest';

import { resolveSchoolNav } from '@/components/school/school-nav-config';
import { DEFAULT_SCHOOL_NAV_CONTEXT } from '@/lib/school/school-nav-context';

const coreCombined = DEFAULT_SCHOOL_NAV_CONTEXT;

const advancedWithFlags = {
  experienceTier: 'advanced' as const,
  financeMode: 'combined' as const,
  flags: {
    workflowsInbox: true,
    timetableDedicatedOfficer: true,
    deputyExamEnabled: true,
    totpOptional: true,
  },
};

describe('school nav Sprint 3', () => {
  it('hides Workflows and PSF nav on Core for principal', () => {
    const nav = resolveSchoolNav('principal', coreCombined);
    expect(nav.some((item) => item.id === 'workflows')).toBe(false);
    expect(nav.some((item) => item.id === 'psf-obligations')).toBe(false);
  });

  it('shows combined Finance desk for accountant in Core', () => {
    const nav = resolveSchoolNav('accountant', coreCombined);
    expect(nav.some((item) => item.id === 'finance-desk')).toBe(true);
    expect(nav.some((item) => item.id === 'finance-verify')).toBe(false);
    expect(nav.some((item) => item.id === 'finance-log')).toBe(false);
  });

  it('shows Balances for owner and principal', () => {
    expect(resolveSchoolNav('school_owner', coreCombined).some((i) => i.id === 'finance-balances')).toBe(
      true,
    );
    expect(resolveSchoolNav('principal', coreCombined).some((i) => i.id === 'finance-balances')).toBe(
      true,
    );
  });

  it('shows Workflows when Advanced flag is on', () => {
    expect(resolveSchoolNav('principal', advancedWithFlags).some((i) => i.id === 'workflows')).toBe(true);
  });

  it('shows PSF top-level nav on Advanced for owner', () => {
    expect(
      resolveSchoolNav('school_owner', advancedWithFlags).some((i) => i.id === 'psf-obligations'),
    ).toBe(true);
  });

  it('hides timetable nav for owner and principal', () => {
    expect(resolveSchoolNav('school_owner', coreCombined).some((i) => i.id === 'timetable')).toBe(false);
    expect(resolveSchoolNav('principal', coreCombined).some((i) => i.id === 'timetable')).toBe(false);
  });
});
