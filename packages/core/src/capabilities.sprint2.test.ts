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

  it('principal may lock census (master plan §2.2)', () => {
    expect(can('principal', 'census.lock')).toBe(true);
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

  it('admin officer cannot view balances or confirm promotions', () => {
    expect(can('admin_officer', 'finance.balances.view')).toBe(false);
    expect(can('admin_officer', 'student.promote.confirm')).toBe(false);
    expect(can('admin_officer', 'student.graduate')).toBe(false);
  });

  it('owner and principal confirm promotions; admin stages only', () => {
    expect(can('school_owner', 'student.promote.confirm')).toBe(true);
    expect(can('principal', 'student.promote.confirm')).toBe(true);
    expect(can('admin_officer', 'student.promote')).toBe(true);
  });

  it('only owner may export tenant audit log', () => {
    expect(can('school_owner', 'audit.export')).toBe(true);
    expect(can('principal', 'audit.export')).toBe(false);
  });
});
