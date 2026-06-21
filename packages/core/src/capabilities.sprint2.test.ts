import { describe, expect, it } from 'vitest';
import { can } from './capabilities.js';

describe('capabilities Sprint 2 alignment', () => {
  it('principal may request role change but not assign', () => {
    expect(can('principal', 'staff.role.request')).toBe(true);
    expect(can('principal', 'staff.role.assign')).toBe(false);
  });

  it('owner may assign roles and lock census', () => {
    expect(can('school_owner', 'staff.role.assign')).toBe(true);
    expect(can('school_owner', 'census.lock')).toBe(true);
  });

  it('principal cannot lock census', () => {
    expect(can('principal', 'census.lock')).toBe(false);
  });

  it('owner has admissions.approve and finance.balances.view', () => {
    expect(can('school_owner', 'admissions.approve')).toBe(true);
    expect(can('school_owner', 'finance.balances.view')).toBe(true);
  });

  it('accountant has ledger.view for PSF read', () => {
    expect(can('accountant', 'ledger.view')).toBe(true);
  });

  it('admin officer may manage and approve admissions', () => {
    expect(can('admin_officer', 'admissions.manage')).toBe(true);
    expect(can('admin_officer', 'admissions.approve')).toBe(true);
  });
});
