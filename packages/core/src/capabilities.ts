import type { Role } from '@loomis/contracts';

/**
 * Capability map derived from the SRS Role-Permission Matrix.
 * Used for UI gating ONLY — the server independently enforces authorisation.
 * (Frontend Architecture §9, loomis-frontend rule.)
 */
export type Capability =
  | 'tenant.onboard'
  | 'staff.onboard'
  | 'staff.role.request'
  | 'staff.role.assign'
  | 'staff.deactivate'
  | 'subject.assign'
  | 'classteacher.assign'
  | 'academic_year.manage'
  | 'term.manage'
  | 'census.lock'
  | 'student.promote'
  | 'student.graduate'
  | 'class_structure.manage'
  | 'timetable.manage'
  | 'timetable.view'
  | 'admissions.manage'
  | 'admissions.approve'
  | 'attendance.mark'
  | 'attendance.view'
  | 'gradebook.write'
  | 'gradebook.read'
  | 'grading_scheme.configure'
  | 'result.publish'
  | 'fee.configure'
  | 'finance.balances.view'
  | 'payment.log'
  | 'payment.verify'
  | 'refund.initiate'
  | 'refund.approve'
  | 'psf.rate.configure'
  | 'ledger.view'
  | 'ivp.manage'
  | 'referral.manage'
  | 'regional.analytics.view'
  | 'parent.message'
  | 'dsar.manage'
  | 'audit.view';

const C = <T extends Capability[]>(...caps: T): ReadonlySet<Capability> => new Set(caps);

export const roleCapabilities: Record<Role, ReadonlySet<Capability>> = {
  platform_owner: C(
    'tenant.onboard',
    'psf.rate.configure',
    'ledger.view',
    'ivp.manage',
    'referral.manage',
    'regional.analytics.view',
    'audit.view',
  ),
  platform_admin: C(
    'tenant.onboard',
    'psf.rate.configure',
    'ivp.manage',
    'referral.manage',
    'regional.analytics.view',
    'audit.view',
  ),
  dpo: C('dsar.manage', 'audit.view'),
  regional_manager: C('tenant.onboard', 'referral.manage', 'regional.analytics.view'),
  regional_subordinate: C('tenant.onboard', 'referral.manage'),
  school_owner: C(
    'staff.onboard',
    'staff.role.assign',
    'staff.deactivate',
    'academic_year.manage',
    'term.manage',
    'census.lock',
    'student.promote',
    'student.graduate',
    'class_structure.manage',
    'timetable.manage',
    'admissions.approve',
    'attendance.view',
    'refund.approve',
    'finance.balances.view',
    'ledger.view',
    'audit.view',
    'parent.message',
  ),
  principal: C(
    'staff.onboard',
    'staff.role.request',
    'staff.deactivate',
    'subject.assign',
    'classteacher.assign',
    'academic_year.manage',
    'term.manage',
    'student.promote',
    'student.graduate',
    'class_structure.manage',
    'timetable.manage',
    'admissions.approve',
    'attendance.view',
    'gradebook.read',
    'gradebook.write',
    'refund.approve',
    'finance.balances.view',
    'audit.view',
    'parent.message',
  ),
  admin_officer: C(
    'staff.onboard',
    'subject.assign',
    'classteacher.assign',
    'student.promote',
    'student.graduate',
    'class_structure.manage',
    'admissions.manage',
    'admissions.approve',
    'timetable.view',
    'attendance.view',
    'finance.balances.view',
    'parent.message',
  ),
  accountant: C('fee.configure', 'payment.verify', 'refund.approve', 'finance.balances.view', 'ledger.view'),
  cashier: C('payment.log', 'refund.initiate'),
  exam_officer: C(
    'grading_scheme.configure',
    'result.publish',
    'gradebook.read',
    'student.graduate',
    'parent.message',
  ),
  deputy_exam_officer: C(
    'grading_scheme.configure',
    'result.publish',
    'gradebook.read',
    'parent.message',
  ),
  timetable_officer: C('timetable.manage'),
  teacher: C('gradebook.write', 'timetable.view'),
  class_teacher: C(
    'attendance.mark',
    'attendance.view',
    'gradebook.read',
    'parent.message',
    'timetable.view',
  ),
  parent: C(),
  student: C('timetable.view'),
};

export function can(role: Role, capability: Capability): boolean {
  return roleCapabilities[role]?.has(capability) ?? false;
}
