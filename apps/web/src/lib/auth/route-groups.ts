import type { Role } from '@loomis/contracts';

/**
 * Web route groups (Frontend Architecture §7.1). Authenticated consoles live
 * under a URL prefix that mirrors the role's route group so the edge middleware
 * can gate them without resolving Next.js `(group)` folders (which are stripped
 * from the URL).
 *
 * NOTE: this is UX-level protection only (defence in depth). The server is the
 * real authorisation boundary (loomis-frontend, §7.2).
 */
export type RouteGroup = 'platform' | 'regional' | 'school' | 'parent';

/** URL prefix → owning route group for every protected console. */
export const GROUP_PREFIX: Record<RouteGroup, string> = {
  platform: '/platform',
  regional: '/regional',
  school: '/school',
  parent: '/parent',
};

/**
 * Each of the 16 roles maps to exactly one web console group.
 * `student` is mobile-primary; on web it shares the consumer (parent) surface.
 */
export const ROLE_GROUP: Record<Role, RouteGroup> = {
  platform_owner: 'platform',
  platform_admin: 'platform',
  dpo: 'platform',
  regional_manager: 'regional',
  regional_subordinate: 'regional',
  school_owner: 'school',
  principal: 'school',
  admin_officer: 'school',
  accountant: 'school',
  cashier: 'school',
  exam_officer: 'school',
  deputy_exam_officer: 'school',
  timetable_officer: 'school',
  teacher: 'school',
  class_teacher: 'school',
  parent: 'parent',
  student: 'parent',
};

export { homePathForRole, type HomePathContext } from '@/lib/auth/home-path';

/** Resolves which protected group a pathname belongs to, or null if public. */
export function groupForPath(pathname: string): RouteGroup | null {
  for (const [group, prefix] of Object.entries(GROUP_PREFIX) as [RouteGroup, string][]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return group;
    }
  }
  return null;
}

/** True when `role` is permitted to view the console at `pathname`. */
export function roleCanAccessPath(role: Role, pathname: string): boolean {
  const group = groupForPath(pathname);
  if (group === null) return true;
  return ROLE_GROUP[role] === group;
}
