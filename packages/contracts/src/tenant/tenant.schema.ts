import { z } from 'zod';

/**
 * Tenant module contracts (System Design §3.2; SRS FR-PLT-001..003; US-PLT-001..003).
 * Shared by the API (request/response validation) and the web/mobile clients.
 */

export const tenantStatus = z.enum(['provisioning', 'active', 'suspended']);
export type TenantStatus = z.infer<typeof tenantStatus>;

/** PSF rate snapshot scope: a global platform default or a per-tenant override. */
export const psfRateScope = z.enum(['global', 'tenant']);
export type PsfRateScope = z.infer<typeof psfRateScope>;

/**
 * A PSF rate, in kobo (minor NGN units), per billable student per term.
 * CON-011: a rate of zero is permanently blocked — enforced here AND by a DB
 * CHECK constraint. The amount must be a positive integer (no floats — money is
 * always stored as BIGINT kobo per loomis-financial-integrity).
 */
export const psfRateMinor = z
  .number({ invalid_type_error: 'PSF rate must be an integer amount in kobo' })
  .int('PSF rate must be an integer amount in kobo')
  .positive('A PSF rate of zero is permanently blocked (CON-011)');

// ── Tiers ────────────────────────────────────────────────────────────────────

export const tierSummary = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultPsfRateMinor: z.number().int(),
  maxStudents: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});
export type TierSummary = z.infer<typeof tierSummary>;

// ── Tenant provisioning (US-PLT-001 / FR-PLT-001) ──────────────────────────────

export const provisionTenantRequest = z.object({
  name: z.string().min(2).max(200),
  region: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  address: z.string().min(2).max(500),
  tierCode: z.string().min(1).max(50),
  /** Referral code used at onboarding — permanently linked (CON-009). */
  referralCode: z.string().min(1).max(64).optional(),
  /** Optional pre-approved override; otherwise the tier/global default applies. */
  initialPsfRateMinor: psfRateMinor.optional(),
});
export type ProvisionTenantRequest = z.infer<typeof provisionTenantRequest>;

export const tenantResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  region: z.string(),
  contactEmail: z.string().email(),
  address: z.string(),
  status: tenantStatus,
  tierId: z.string().uuid(),
  tierCode: z.string(),
  referralCode: z.string().nullable(),
  currentPsfRateMinor: z.number().int().nullable(),
  suspendedReason: z.string().nullable(),
  suspendedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TenantResponse = z.infer<typeof tenantResponse>;

// ── Suspend / reinstate (US-PLT-002) ───────────────────────────────────────────

export const suspendTenantRequest = z.object({
  reason: z.string().min(3).max(500),
});
export type SuspendTenantRequest = z.infer<typeof suspendTenantRequest>;

export const reinstateTenantRequest = z.object({
  reason: z.string().min(3).max(500).optional(),
});
export type ReinstateTenantRequest = z.infer<typeof reinstateTenantRequest>;

// ── PSF rate management (US-PLT-003 / US-PLT-004 / FR-PLT-002) ──────────────────

/** Set the platform-wide default PSF rate. Step-up MFA required (US-PLT-003). */
export const setGlobalPsfRateRequest = z.object({
  rateMinor: psfRateMinor,
  /** Applies from the next billing term only; never alters existing obligations. */
  effectiveFrom: z.string().datetime(),
  reason: z.string().min(3).max(500),
});
export type SetGlobalPsfRateRequest = z.infer<typeof setGlobalPsfRateRequest>;

/**
 * Request a per-school PSF rate override. Requires two-person approval
 * (FR-PLT-002, CON-013) — the requester cannot approve their own request.
 */
export const requestPsfRateOverrideRequest = z.object({
  rateMinor: psfRateMinor,
  effectiveFrom: z.string().datetime(),
  justification: z.string().min(3).max(500),
});
export type RequestPsfRateOverrideRequest = z.infer<typeof requestPsfRateOverrideRequest>;

export const psfRateSnapshotResponse = z.object({
  id: z.string().uuid(),
  scope: psfRateScope,
  tenantId: z.string().uuid().nullable(),
  rateMinor: z.number().int(),
  previousRateMinor: z.number().int().nullable(),
  effectiveFrom: z.string().datetime(),
  reason: z.string().nullable(),
  changedById: z.string().uuid(),
  approvedById: z.string().uuid().nullable(),
  workflowInstanceId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type PsfRateSnapshotResponse = z.infer<typeof psfRateSnapshotResponse>;

export const psfRateHistoryResponse = z.object({
  snapshots: z.array(psfRateSnapshotResponse),
});
export type PsfRateHistoryResponse = z.infer<typeof psfRateHistoryResponse>;

// ── Tenant configuration (key/value) ───────────────────────────────────────────

export const upsertConfigurationRequest = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
});
export type UpsertConfigurationRequest = z.infer<typeof upsertConfigurationRequest>;

export const configurationResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  key: z.string(),
  value: z.unknown(),
  updatedAt: z.string().datetime(),
});
export type ConfigurationResponse = z.infer<typeof configurationResponse>;

export const configurationListResponse = z.object({
  configurations: z.array(configurationResponse),
});
export type ConfigurationListResponse = z.infer<typeof configurationListResponse>;
