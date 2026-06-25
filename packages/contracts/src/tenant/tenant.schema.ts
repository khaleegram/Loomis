import { z } from 'zod';
import { experienceTier, financeMode, tenantExperienceFlags } from './experience.schema.js';

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
  isSystem: z.boolean(),
  createdAt: z.string().datetime(),
});
export type TierSummary = z.infer<typeof tierSummary>;

export const createTierRequest = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers, and underscores'),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  defaultPsfRateMinor: psfRateMinor,
  maxStudents: z.number().int().positive().nullable().optional(),
});
export type CreateTierRequest = z.infer<typeof createTierRequest>;

export const updateTierRequest = z
  .object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    defaultPsfRateMinor: psfRateMinor.optional(),
    maxStudents: z.number().int().positive().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateTierRequest = z.infer<typeof updateTierRequest>;

/** Nigerian mobile in E.164 (+234XXXXXXXXXX). */
export const nigerianMobilePhone = z
  .string()
  .regex(/^\+234[789]\d{9}$/, 'Enter a valid Nigerian mobile number (e.g. +2348012345678)');

export const tenantContactRole = z.enum(['primary', 'billing', 'operations', 'proprietor']);
export type TenantContactRole = z.infer<typeof tenantContactRole>;

export const tenantContactInput = z.object({
  role: tenantContactRole,
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email(),
  phone: nigerianMobilePhone.optional(),
  isPrimary: z.boolean().optional(),
});
export type TenantContactInput = z.infer<typeof tenantContactInput>;

export const tenantContact = tenantContactInput.extend({
  id: z.string().uuid(),
});
export type TenantContact = z.infer<typeof tenantContact>;

export const updateTenantContactsRequest = z
  .object({
    contacts: z.array(tenantContactInput).min(1).max(10),
  })
  .refine((value) => value.contacts.filter((c) => c.isPrimary === true || c.role === 'primary').length === 1, {
    message: 'Exactly one primary contact is required',
  });
export type UpdateTenantContactsRequest = z.infer<typeof updateTenantContactsRequest>;

// ── Tenant provisioning (US-PLT-001 / FR-PLT-001) ──────────────────────────────

export const provisionTenantRequest = z.object({
  name: z.string().min(2).max(200),
  region: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  contactPhone: nigerianMobilePhone,
  address: z.string().min(2).max(500),
  tierCode: z.string().min(1).max(50),
  contacts: z.array(tenantContactInput).min(1).max(10).optional(),
  /** Referral code used at onboarding — permanently linked (CON-009). */
  referralCode: z.string().min(1).max(64).optional(),
  /** Optional pre-approved override; otherwise the tier/global default applies. */
  initialPsfRateMinor: psfRateMinor.optional(),
});
export type ProvisionTenantRequest = z.infer<typeof provisionTenantRequest>;

export const migrateProductTierRequest = z.object({
  tierCode: z.string().min(1).max(50),
  reason: z.string().min(3).max(500),
});
export type MigrateProductTierRequest = z.infer<typeof migrateProductTierRequest>;

export const provisionDraftPayload = z.object({
  name: z.string().optional(),
  region: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  tierCode: z.string().optional(),
  referralCode: z.string().optional(),
  initialPsfRateMinor: z.number().int().optional(),
  contacts: z.array(tenantContactInput).optional(),
});
export type ProvisionDraftPayload = z.infer<typeof provisionDraftPayload>;

export const upsertProvisionDraftRequest = z.object({
  stepIndex: z.number().int().min(0).max(10),
  payload: provisionDraftPayload,
});
export type UpsertProvisionDraftRequest = z.infer<typeof upsertProvisionDraftRequest>;

export const provisionDraftResponse = z.object({
  id: z.string().uuid(),
  source: z.enum(['platform', 'regional']),
  stepIndex: z.number().int(),
  payload: provisionDraftPayload,
  updatedAt: z.string().datetime(),
});
export type ProvisionDraftResponse = z.infer<typeof provisionDraftResponse>;

export const tenantPsfStatusResponse = z.object({
  currentRateMinor: z.number().int().nullable(),
  suggestedRateMinor: z.number().int().nullable(),
  suggestionPending: z.boolean(),
  obligationsTotal: z.number().int(),
  obligationsOutstandingMinor: z.number().int(),
  termLabel: z.string().nullable(),
});
export type TenantPsfStatusResponse = z.infer<typeof tenantPsfStatusResponse>;

export const updateTenantProfileRequest = z
  .object({
    contactEmail: z.string().email().optional(),
    contactPhone: nigerianMobilePhone.optional(),
    address: z.string().min(2).max(500).optional(),
    region: z.string().min(2).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateTenantProfileRequest = z.infer<typeof updateTenantProfileRequest>;

export const tenantOwnerSetupStatus = z.object({
  hasOwnerAccount: z.boolean(),
  ownerEmail: z.string().email().nullable(),
  setupEmailSentAt: z.string().datetime().nullable(),
});
export type TenantOwnerSetupStatus = z.infer<typeof tenantOwnerSetupStatus>;

export const resendTenantSetupResponse = z.object({
  status: z.literal('resent'),
  setupEmailSentAt: z.string().datetime(),
  emailDelivery: z.object({
    sent: z.boolean(),
    reason: z.string().optional(),
  }),
});
export type ResendTenantSetupResponse = z.infer<typeof resendTenantSetupResponse>;

export const psfSuggestionResponse = z.object({
  suggestedRateMinor: z.number().int(),
  basisFeesMinor: z.number().int(),
  currentRateMinor: z.number().int().nullable(),
  message: z.string(),
});
export type PsfSuggestionResponse = z.infer<typeof psfSuggestionResponse>;

export const tenantOnboardingStep = z.object({
  id: z.string(),
  label: z.string(),
  complete: z.boolean(),
  detail: z.string().nullable(),
});
export type TenantOnboardingStep = z.infer<typeof tenantOnboardingStep>;

export const tenantOnboardingStatus = z.object({
  readyForOperations: z.boolean(),
  completedStepCount: z.number().int(),
  totalStepCount: z.number().int(),
  steps: z.array(tenantOnboardingStep),
  suggestedPsfBasisMinor: z.number().int().nullable(),
});
export type TenantOnboardingStatus = z.infer<typeof tenantOnboardingStatus>;

export const applyTenantPsfRateRequest = z
  .object({
    rateMinor: psfRateMinor.optional(),
    useSuggested: z.boolean().optional(),
    reason: z.string().min(3).max(500).optional(),
  })
  .refine((value) => value.useSuggested === true || value.rateMinor != null, {
    message: 'Provide rateMinor or set useSuggested to true',
  });
export type ApplyTenantPsfRateRequest = z.infer<typeof applyTenantPsfRateRequest>;

export const applyTenantPsfRateResponse = z.object({
  rateMinor: z.number().int(),
  snapshotId: z.string().uuid(),
});
export type ApplyTenantPsfRateResponse = z.infer<typeof applyTenantPsfRateResponse>;

export const tenantResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  region: z.string(),
  contactEmail: z.string().email(),
  contactPhone: z.string().nullable(),
  address: z.string(),
  status: tenantStatus,
  tierId: z.string().uuid(),
  tierCode: z.string(),
  referralCode: z.string().nullable(),
  currentPsfRateMinor: z.number().int().nullable(),
  suggestedPsfRateMinor: z.number().int().nullable(),
  experienceTier: experienceTier,
  financeMode: financeMode,
  experienceFlags: tenantExperienceFlags,
  ownerSetup: tenantOwnerSetupStatus,
  onboarding: tenantOnboardingStatus.nullable(),
  contacts: z.array(tenantContact),
  goLiveAt: z.string().datetime(),
  activatedAt: z.string().datetime().nullable(),
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

// ── School branding (logo on reports, app bar, documents) ─────────────────────

export const SCHOOL_BRANDING_CONFIG_KEY = 'school.branding';

export const schoolBrandingConfig = z.object({
  logoStorageObjectId: z.string().uuid().nullable(),
});
export type SchoolBrandingConfig = z.infer<typeof schoolBrandingConfig>;

export const updateSchoolBrandingRequest = schoolBrandingConfig;
export type UpdateSchoolBrandingRequest = z.infer<typeof updateSchoolBrandingRequest>;

export const schoolBrandingResponse = z.object({
  tenantId: z.string().uuid(),
  tenantName: z.string(),
  branding: schoolBrandingConfig,
});
export type SchoolBrandingResponse = z.infer<typeof schoolBrandingResponse>;

// ── Tenant list (platform) ──────────────────────────────────────────────────────

export const tenantListResponse = z.object({
  tenants: z.array(tenantResponse),
  total: z.number().int(),
});
export type TenantListResponse = z.infer<typeof tenantListResponse>;

export const tierListResponse = z.object({
  tiers: z.array(tierSummary),
});
export type TierListResponse = z.infer<typeof tierListResponse>;
