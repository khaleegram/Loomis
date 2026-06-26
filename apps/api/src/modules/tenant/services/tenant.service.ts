import type {
  MigrateProductTierRequest,
  TenantListResponse,
  TenantResponse,
  TierSummary,
  UpdateTenantContactsRequest,
  UpdateTenantProfileRequest,
} from '@loomis/contracts';
import { DEFAULT_PSF_RATE_MINOR, mergeExperienceFlags, PRODUCT_TIER_SPECS } from '@loomis/core';
import { LoomisError } from '../../../shared/errors.js';
import { tenantEvents } from '../events/index.js';
import { psfRateSnapshotRepository } from '../repository/psf-rate.repository.js';
import { tenantRepository } from '../repository/tenant.repository.js';
import { tierRepository } from '../repository/tier.repository.js';
import type { ActorContext, ProvisionTenantInput, SuspendTenantInput } from '../types.js';
import { psfRateService } from './psf-rate.service.js';
import { psfSuggestionService } from './psf-suggestion.service.js';
import { tenantOwnerService } from './tenant-owner.service.js';
import { tierCatalogService } from './tier-catalog.service.js';
import { tenantOnboardingService } from './tenant-onboarding.service.js';
import { tenantContactService } from './tenant-contact.service.js';
import { attributionService } from '../../referral/services/attribution.service.js';
import { websiteService } from '../../website/services/website.service.js';

type TenantRow = NonNullable<Awaited<ReturnType<typeof tenantRepository.findById>>>;

function resolveExperienceTierForProductTier(tierCode: string): 'core' | 'advanced' | 'enterprise' {
  const spec = PRODUCT_TIER_SPECS.find((entry) => entry.code === tierCode);
  return spec?.experienceTier ?? 'core';
}

export const tenantService = {
  /**
   * Provisions a new school tenant (US-PLT-001 / FR-PLT-001). Creates the tenant
   * record, optionally records the admin-set initial PSF rate as a per-tenant
   * snapshot, then activates it. The referral code is permanently linked (CON-009).
   */
  async provisionTenant(input: ProvisionTenantInput, actor: ActorContext): Promise<TenantRow> {
    const tier = await tierRepository.findByCode(input.tierCode);
    if (!tier) {
      throw new LoomisError('TENANT_TIER_NOT_FOUND', 404, `Unknown tier '${input.tierCode}'`);
    }

    if (input.initialPsfRateMinor !== undefined && input.initialPsfRateMinor <= 0) {
      // CON-011 — also enforced by Zod and the DB CHECK constraint.
      throw new LoomisError(
        'TENANT_PSF_RATE_ZERO_BLOCKED',
        422,
        'A PSF rate of zero is permanently blocked (CON-011)',
      );
    }

    if (input.referralCode) {
      const validation = await attributionService.validateReferralCode(input.referralCode);
      if (!validation.valid) {
        throw new LoomisError(
          'REFERRAL_CODE_INVALID',
          422,
          'Referral code is invalid or participant is not KYC-verified; tenant activation blocked (US-PLT-001)',
        );
      }
    }

    const now = new Date();

    const tenant = await tenantRepository.create({
      ...input,
      tierId: tier.id,
      provisionedById: actor.userId,
    });

    await tenantContactService.seedFromProvision(tenant.id, {
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      contacts: input.contacts,
    });

    await tenantRepository.updateExperience(tenant.id, {
      experienceTier: resolveExperienceTierForProductTier(tier.code),
    });

    const initialRateMinor = input.initialPsfRateMinor ?? DEFAULT_PSF_RATE_MINOR;
    const snapshot = await psfRateSnapshotRepository.create({
      scope: 'tenant',
      tenantId: tenant.id,
      rateMinor: initialRateMinor,
      previousRateMinor: null,
      effectiveFrom: now,
      reason:
        input.initialPsfRateMinor !== undefined
          ? 'Initial PSF rate set at provisioning'
          : 'Default PSF rate at provisioning (₦1,000)',
      changedById: actor.userId,
    });
    await tenantEvents.publishPsfRateChanged({
      snapshotId: snapshot.id,
      scope: 'tenant',
      tenantId: tenant.id,
      rateMinor: snapshot.rateMinor,
      previousRateMinor: null,
      effectiveFrom: snapshot.effectiveFrom.toISOString(),
      changedById: actor.userId,
      approvedById: null,
    });

    if (tenant.activatedAt) {
      await tenantEvents.publishActivated({
        tenantId: tenant.id,
        activatedById: actor.userId,
        activatedAt: tenant.activatedAt.toISOString(),
      });
    }

    await tenantOwnerService.provisionOwner(
      {
        tenantId: tenant.id,
        schoolName: tenant.name,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      },
      actor,
    );

    await tenantEvents.publishProvisioned({
      tenantId: tenant.id,
      name: tenant.name,
      region: tenant.region,
      tierId: tenant.tierId,
      referralCode: tenant.referralCode,
      provisionedById: actor.userId,
    });

    await websiteService.ensureSite(tenant.id);

    return tenant;
  },

  /** Lists all tenants for the platform console (US-PLT-001). */
  async listTenants(): Promise<TenantListResponse> {
    const rows = await tenantRepository.listAll();
    const tenantResponses = await Promise.all(rows.map((row) => this.toResponse(row)));
    return { tenants: tenantResponses, total: tenantResponses.length };
  },

  async listTiers(): Promise<TierSummary[]> {
    await tierCatalogService.ensureProductTiers();
    const rows = await tierRepository.list();
    return rows
      .filter((tier) => tier.code !== 'demo')
      .map((tier) => ({
        id: tier.id,
        code: tier.code,
        name: tier.name,
        description: tier.description ?? null,
        defaultPsfRateMinor: tier.defaultPsfRateMinor,
        maxStudents: tier.maxStudents ?? null,
        isSystem: tier.isSystem,
        createdAt: tier.createdAt.toISOString(),
      }));
  },

  async updateTenantProfile(
    id: string,
    input: UpdateTenantProfileRequest,
    _actor: ActorContext,
  ): Promise<TenantRow> {
    await this.getTenant(id);
    const updated = await tenantRepository.updateProfile(id, {
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.region !== undefined ? { region: input.region } : {}),
    });
    if (!updated) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    return updated;
  },

  async updateTenantContacts(
    id: string,
    input: UpdateTenantContactsRequest,
    _actor: ActorContext,
  ): Promise<TenantRow> {
    await this.getTenant(id);
    await tenantContactService.replaceContacts(id, input.contacts);
    const tenant = await tenantRepository.findById(id);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    return tenant;
  },

  async migrateProductTier(
    id: string,
    input: MigrateProductTierRequest,
    actor: ActorContext,
  ): Promise<TenantRow> {
    const tenant = await this.getTenant(id);
    const tier = await tierRepository.findByCode(input.tierCode);
    if (!tier) {
      throw new LoomisError('TENANT_TIER_NOT_FOUND', 404, `Unknown tier '${input.tierCode}'`);
    }
    if (tenant.tierId === tier.id) {
      throw new LoomisError('VALIDATION_ERROR', 422, 'Tenant is already on this product tier');
    }
    const previousTier = await tierRepository.findById(tenant.tierId);
    const updated = await tenantRepository.updateTierId(id, tier.id);
    if (!updated) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    await tenantRepository.updateExperience(id, {
      experienceTier: resolveExperienceTierForProductTier(tier.code),
    });
    await tenantEvents.publishTierMigrated({
      tenantId: id,
      previousTierId: tenant.tierId,
      previousTierCode: previousTier?.code ?? '',
      newTierId: tier.id,
      newTierCode: tier.code,
      reason: input.reason,
      migratedById: actor.userId,
    });
    return updated;
  },

  async resendOwnerSetupEmail(id: string, actor: ActorContext) {
    await this.getTenant(id);
    return tenantOwnerService.resendSetupEmail(id, actor);
  },

  async getTenant(id: string): Promise<TenantRow> {
    const tenant = await tenantRepository.findById(id);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    return tenant;
  },

  /** Suspends a tenant (US-PLT-002). Blocks school-layer logins; data preserved. */
  async suspendTenant(id: string, input: SuspendTenantInput, actor: ActorContext): Promise<TenantRow> {
    const tenant = await this.getTenant(id);
    if (tenant.status === 'suspended') {
      throw new LoomisError('TENANT_ALREADY_SUSPENDED', 409, 'Tenant is already suspended');
    }

    const suspended = await tenantRepository.suspend(id, input.reason, actor.userId);
    if (!suspended) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    // NOTE: blocking active school-layer sessions on suspension and emailing the
    // School Owner (US-PLT-002) are handled by consumers of `tenant.suspended`
    // (Identity session invalidation + Comms email). Those consumers are wired
    // when those producers/relay exist; the event is the integration contract.
    await tenantEvents.publishSuspended({
      tenantId: suspended.id,
      reason: input.reason,
      suspendedById: actor.userId,
    });

    return suspended;
  },

  /** Reinstates a suspended tenant (US-PLT-002). Restores logins; audit-logged. */
  async reinstateTenant(id: string, actor: ActorContext): Promise<TenantRow> {
    const tenant = await this.getTenant(id);
    if (tenant.status !== 'suspended') {
      throw new LoomisError('TENANT_NOT_SUSPENDED', 409, 'Tenant is not suspended');
    }

    const reinstated = await tenantRepository.reinstate(id, actor.userId);
    if (!reinstated) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    await tenantEvents.publishReinstated({
      tenantId: reinstated.id,
      reinstatedById: actor.userId,
    });

    return reinstated;
  },

  /** Serialises a tenant row into the public response shape (effective rate included). */
  async toResponse(
    tenant: TenantRow,
    options?: { includeOnboarding?: boolean },
  ): Promise<TenantResponse> {
    const tier = await tierRepository.findById(tenant.tierId);
    const currentPsfRateMinor = await psfRateService.resolveEffectiveRateMinor(
      tenant.id,
      tenant.tierId,
    );
    const suggestedPsfRateMinor = await psfSuggestionService.getSuggestedRateMinor(tenant.id);
    const ownerSetup = await tenantOwnerService.getOwnerSetupStatus(tenant.id);
    const contacts = await tenantContactService.listContacts(tenant.id);
    const onboarding = options?.includeOnboarding
      ? await tenantOnboardingService.getStatus(tenant.id)
      : null;

    return {
      id: tenant.id,
      name: tenant.name,
      region: tenant.region,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone ?? null,
      address: tenant.address,
      status: tenant.status as TenantResponse['status'],
      tierId: tenant.tierId,
      tierCode: tier?.code ?? '',
      referralCode: tenant.referralCode ?? null,
      currentPsfRateMinor,
      suggestedPsfRateMinor,
      experienceTier: tenant.experienceTier as TenantResponse['experienceTier'],
      financeMode: tenant.financeMode as TenantResponse['financeMode'],
      experienceFlags: mergeExperienceFlags(
        tenant.experienceFlags as TenantResponse['experienceFlags'],
      ),
      ownerSetup,
      onboarding,
      contacts,
      goLiveAt: tenant.goLiveAt.toISOString(),
      activatedAt: tenant.activatedAt ? tenant.activatedAt.toISOString() : null,
      suspendedReason: tenant.suspendedReason ?? null,
      suspendedAt: tenant.suspendedAt ? tenant.suspendedAt.toISOString() : null,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  },
};
