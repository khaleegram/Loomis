import { describe, expect, it } from 'vitest';
import { can } from './capabilities.js';

/** Master plan §2.2 school-layer capability matrix spot checks. */
describe('capabilities audit alignment (§2.2)', () => {
  it('leadership finance and census caps', () => {
    expect(can('school_owner', 'finance.balances.view')).toBe(true);
    expect(can('principal', 'finance.balances.view')).toBe(true);
    expect(can('school_owner', 'census.lock')).toBe(true);
    expect(can('principal', 'census.lock')).toBe(true);
  });

  it('finance SoD caps', () => {
    expect(can('accountant', 'payment.verify')).toBe(true);
    expect(can('cashier', 'payment.log')).toBe(true);
    expect(can('cashier', 'payment.verify')).toBe(false);
  });

  it('exam officer learning caps', () => {
    expect(can('exam_officer', 'result.publish')).toBe(true);
    expect(can('exam_officer', 'grading_scheme.configure')).toBe(true);
    expect(can('principal', 'result.publish')).toBe(false);
  });

  it('class teacher attendance only', () => {
    expect(can('class_teacher', 'attendance.mark')).toBe(true);
    expect(can('teacher', 'attendance.mark')).toBe(false);
  });
});
