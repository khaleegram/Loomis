/**
 * Typed TanStack Query key factory (Frontend Architecture §5.1).
 * Tenant-scoped keys always place `tenantId` as the second element (§5.2).
 */

export type StudentListFilters = {
  status?: string;
  classArmId?: string;
};

export const queryKeys = {
  identity: {
    /** User-scoped — not tenant-partitioned. */
    sessions: () => ['identity', 'sessions'] as const,
    devices: () => ['identity', 'devices'] as const,
  },
  students: {
    all: (tenantId: string) => ['students', tenantId] as const,
    list: (tenantId: string, filters: StudentListFilters = {}) =>
      ['students', tenantId, 'list', filters] as const,
    detail: (tenantId: string, studentId: string) =>
      ['students', tenantId, 'detail', studentId] as const,
    profile: (tenantId: string, studentId: string) =>
      ['students', tenantId, 'profile', studentId] as const,
  },
  hrm: {
    all: (tenantId: string) => ['hrm', tenantId] as const,
    staffList: (tenantId: string) => ['hrm', tenantId, 'staff', 'list'] as const,
    staffDetail: (tenantId: string, staffProfileId: string) =>
      ['hrm', tenantId, 'staff', 'detail', staffProfileId] as const,
  },
} as const;

/** Asserts tenant-scoped roots place tenantId at index 1 (security invariant). */
export function assertTenantScopedKey(key: readonly unknown[], tenantId: string): void {
  if (key.length < 2 || key[1] !== tenantId) {
    throw new Error(`Query key must include tenantId "${tenantId}" as element 2`);
  }
}
