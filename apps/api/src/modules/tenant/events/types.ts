/** Events published by the Tenant module (System Design §3.2). */

export interface TenantProvisionedEvent {
  eventId: string;
  tenantId: string;
  name: string;
  region: string;
  tierId: string;
  referralCode: string | null;
  provisionedById: string;
  occurredAt: string;
}

export interface TenantSuspendedEvent {
  eventId: string;
  tenantId: string;
  reason: string;
  suspendedById: string;
  occurredAt: string;
}

export interface TenantReinstatedEvent {
  eventId: string;
  tenantId: string;
  reinstatedById: string;
  occurredAt: string;
}

export interface TenantPsfRateChangedEvent {
  eventId: string;
  snapshotId: string;
  scope: 'global' | 'tenant';
  tenantId: string | null;
  rateMinor: number;
  previousRateMinor: number | null;
  effectiveFrom: string;
  changedById: string;
  approvedById: string | null;
  occurredAt: string;
}

export interface TenantActivatedEvent {
  eventId: string;
  tenantId: string;
  activatedById: string;
  activatedAt: string;
  occurredAt: string;
}

export interface TenantTierMigratedEvent {
  eventId: string;
  tenantId: string;
  previousTierId: string;
  previousTierCode: string;
  newTierId: string;
  newTierCode: string;
  reason: string;
  migratedById: string;
  occurredAt: string;
}

export const TENANT_EVENT_TYPES = {
  provisioned: 'tenant.provisioned',
  suspended: 'tenant.suspended',
  reinstated: 'tenant.reinstated',
  psfRateChanged: 'tenant.psf_rate.changed',
  activated: 'tenant.activated',
  tierMigrated: 'tenant.tier.migrated',
} as const;
