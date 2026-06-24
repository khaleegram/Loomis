export const HRM_EVENT_TYPES = {
  staffRoleChanged: 'staff.role.changed',
  staffDeactivated: 'staff.deactivated',
} as const;

export interface StaffRoleChangedEvent {
  eventId: string;
  userId: string;
  tenantId: string;
  previousRole: string;
  newRole: string;
  changedAt: string;
}

export interface StaffDeactivatedEvent {
  eventId: string;
  userId: string;
  tenantId: string;
  deactivatedAt: string;
}
