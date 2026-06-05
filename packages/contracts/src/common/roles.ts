import { z } from 'zod';

/** The 16 platform roles (SRS §3, loomis-roles rule). */
export const role = z.enum([
  'platform_owner',
  'platform_admin',
  'dpo',
  'regional_manager',
  'regional_subordinate',
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
  'parent',
  'student',
]);

export type Role = z.infer<typeof role>;

/** Roles whose JWT carries a null tenant_id (cross-tenant / platform actors). */
export const NULL_TENANT_ROLES: ReadonlySet<Role> = new Set<Role>([
  'platform_owner',
  'platform_admin',
  'dpo',
  'regional_manager',
  'regional_subordinate',
  'parent',
]);
