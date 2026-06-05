/** Payload published by HRM when a staff member's role changes (System Design §3.2). */
export interface StaffRoleChangedEvent {
  eventId: string;
  userId: string;
  tenantId: string;
  previousRole: string;
  newRole: string;
  changedAt: string;
}

/** Payload published by HRM when a staff member is deactivated. */
export interface StaffDeactivatedEvent {
  eventId: string;
  userId: string;
  tenantId: string;
  deactivatedAt: string;
}
