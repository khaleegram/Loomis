import { describe, expect, it } from 'vitest';

import { resolveSchoolNav, schoolNavLabel, SCHOOL_NAV } from '@/components/school/school-nav-config';
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
    admissionsRequirePrincipalApproval: false,
    admissionsRequireOwnerApproval: false,
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

  it('shows Admissions nav for principal and admin officer on Core', () => {
    expect(resolveSchoolNav('principal', coreCombined).some((i) => i.id === 'admissions')).toBe(true);
    expect(resolveSchoolNav('admin_officer', coreCombined).some((i) => i.id === 'admissions')).toBe(true);
  });

  it('shows split ledger labels for accountant and cashier', () => {
    const splitCtx = {
      experienceTier: 'advanced' as const,
      financeMode: 'split' as const,
      flags: advancedWithFlags.flags,
    };
    const accountantNav = resolveSchoolNav('accountant', splitCtx);
    const cashierNav = resolveSchoolNav('cashier', splitCtx);
    expect(accountantNav.some((i) => i.id === 'finance-desk')).toBe(false);
    expect(accountantNav.some((i) => i.id === 'finance-verify')).toBe(true);
    expect(cashierNav.some((i) => i.id === 'finance-log')).toBe(true);
    expect(accountantNav.some((i) => i.id === 'workflows')).toBe(true);
  });

  it('hides Exams and Gradebook for Principal on Advanced (§5.4)', () => {
    const nav = resolveSchoolNav('principal', advancedWithFlags);
    expect(nav.some((i) => i.id === 'exams')).toBe(false);
    expect(nav.some((i) => i.id === 'gradebook')).toBe(false);
    expect(nav.some((i) => i.id === 'assignments')).toBe(false);
    expect(nav.some((i) => i.id === 'workflows')).toBe(true);
  });

  it('shows Comms for exam officer', () => {
    expect(resolveSchoolNav('exam_officer', advancedWithFlags).some((i) => i.id === 'comms')).toBe(
      true,
    );
  });

  it('dashboard label is Operations for principal', () => {
    const dashboard = SCHOOL_NAV.find((i) => i.id === 'dashboard')!;
    expect(schoolNavLabel(dashboard, 'principal')).toBe('Operations');
  });
});
