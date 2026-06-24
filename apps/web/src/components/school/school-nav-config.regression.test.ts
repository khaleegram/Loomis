import { describe, expect, it } from 'vitest';
import type { Role } from '@loomis/contracts';

import { resolveSchoolNav } from '@/components/school/school-nav-config';
import { DEFAULT_SCHOOL_NAV_CONTEXT } from '@/lib/school/school-nav-context';

const SCHOOL_STAFF_ROLES: Role[] = [
  'school_owner',
  'principal',
  'admin_officer',
  'accountant',
  'cashier',
  'exam_officer',
  'deputy_exam_officer',
  'timetable_officer',
  'teacher',
  'class_teacher',
];

const advancedFlags = {
  workflowsInbox: true,
  timetableDedicatedOfficer: true,
  deputyExamEnabled: true,
  totpOptional: true,
  admissionsRequirePrincipalApproval: false,
  admissionsRequireOwnerApproval: false,
};

const advancedCtx = {
  experienceTier: 'advanced' as const,
  financeMode: 'split' as const,
  flags: advancedFlags,
};

const enterpriseCtx = {
  experienceTier: 'enterprise' as const,
  financeMode: 'combined' as const,
  flags: {
    ...advancedFlags,
    admissionsRequirePrincipalApproval: true,
    admissionsRequireOwnerApproval: true,
  },
};

function navIds(role: Role, ctx: typeof DEFAULT_SCHOOL_NAV_CONTEXT) {
  return resolveSchoolNav(role, ctx).map((item) => item.id);
}

describe('school nav tier regression (Sprint 14)', () => {
  it('Core: no role sees Workflows, PSF top-level, or Attestations', () => {
    for (const role of SCHOOL_STAFF_ROLES) {
      const ids = navIds(role, DEFAULT_SCHOOL_NAV_CONTEXT);
      expect(ids, role).not.toContain('workflows');
      expect(ids, role).not.toContain('attestations');
      if (role === 'principal' || role === 'school_owner') {
        expect(ids, role).not.toContain('psf-obligations');
      }
      if (role === 'school_owner') {
        expect(ids, role).toContain('finance-platform-fee');
      }
      if (role === 'principal') {
        expect(ids, role).not.toContain('finance-platform-fee');
      }
    }
  });

  it('Core: every role with dashboard capability gets at least one nav item', () => {
    for (const role of SCHOOL_STAFF_ROLES) {
      const ids = navIds(role, DEFAULT_SCHOOL_NAV_CONTEXT);
      expect(ids.length, role).toBeGreaterThan(0);
    }
  });

  it('Advanced: Principal sees Workflows, not Exams/Gradebook', () => {
    const ids = navIds('principal', advancedCtx);
    expect(ids).toContain('workflows');
    expect(ids).not.toContain('exams');
    expect(ids).not.toContain('gradebook');
  });

  it('Advanced: Owner sees Platform fee and Workflows', () => {
    const ids = navIds('school_owner', advancedCtx);
    expect(ids).toContain('workflows');
    expect(ids).toContain('finance-platform-fee');
    expect(ids).not.toContain('psf-obligations');
  });

  it('Advanced split: accountant verify, cashier log — not combined desk', () => {
    expect(navIds('accountant', advancedCtx)).toContain('finance-verify');
    expect(navIds('accountant', advancedCtx)).not.toContain('finance-desk');
    expect(navIds('cashier', advancedCtx)).toContain('finance-log');
  });

  it('Enterprise: Owner sees Attestations', () => {
    expect(navIds('school_owner', enterpriseCtx)).toContain('attestations');
  });

  it('Enterprise: Owner and Principal see Attestations', () => {
    expect(navIds('school_owner', enterpriseCtx)).toContain('attestations');
    expect(navIds('principal', enterpriseCtx)).toContain('attestations');
  });

  it('Core: Admin officer has no Balances nav', () => {
    expect(navIds('admin_officer', DEFAULT_SCHOOL_NAV_CONTEXT)).not.toContain('finance-balances');
  });

  it('Core: exam officer lands on exams, not dashboard', () => {
    const ids = navIds('exam_officer', advancedCtx);
    expect(ids).toContain('exams');
    expect(ids).not.toContain('dashboard');
  });

  it('Core: timetable_officer without flag sees only academic + settings', () => {
    const ids = navIds('timetable_officer', DEFAULT_SCHOOL_NAV_CONTEXT);
    expect(ids).toEqual(['academic', 'settings']);
  });

  it('Core: deputy_exam_officer without flag sees only settings', () => {
    const ids = navIds('deputy_exam_officer', DEFAULT_SCHOOL_NAV_CONTEXT);
    expect(ids).toEqual(['settings']);
  });
});
