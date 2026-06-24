/** Enrollment statuses that allow parent/student portal read access (incl. suspended). */
export const PORTAL_ENROLLMENT_STATUSES = ['active', 'active_billable', 'suspended'] as const;

/** Billable / messaging enrollments — used for parent notifications and fee reminders. */
export const BILLABLE_ENROLLMENT_STATUSES = ['active', 'active_billable'] as const;

export type PortalEnrollmentStatus = (typeof PORTAL_ENROLLMENT_STATUSES)[number];
export type BillableEnrollmentStatus = (typeof BILLABLE_ENROLLMENT_STATUSES)[number];

export function isPortalEnrollmentStatus(status: string): status is PortalEnrollmentStatus {
  return (PORTAL_ENROLLMENT_STATUSES as readonly string[]).includes(status);
}

export function isBillableEnrollmentStatus(status: string): status is BillableEnrollmentStatus {
  return (BILLABLE_ENROLLMENT_STATUSES as readonly string[]).includes(status);
}
