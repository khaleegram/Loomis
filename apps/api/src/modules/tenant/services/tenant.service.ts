import type {
  TenantListResponse,
  TenantResponse,
  TierSummary,
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
import { attributionService } from '../../referral/services/attribution.service.js';

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

    const tenant = await tenantRepository.create({
      ...input,
      tierId: tier.id,
      provisionedById: actor.userId,
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
      effectiveFrom: new Date(),
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

    const activated = await tenantRepository.setStatus(tenant.id, 'active');
    const result = activated ?? tenant;

    await tenantOwnerService.provisionOwner(
      {
        tenantId: result.id,
        schoolName: result.name,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      },
      actor,
    );

    await tenantEvents.publishProvisioned({
      tenantId: result.id,
      name: result.name,
      region: result.region,
      tierId: result.tierId,
      referralCode: result.referralCode,
      provisionedById: actor.userId,
    });

    return result;
  },

  /** Lists all tenants for the platform console (US-PLT-001). */
  async listTenants(): Promise<TenantListResponse> {
    const rows = await tenantRepository.listAll();
    const tenantResponses = await Promise.all(rows.map((row) => this.toResponse(row)));
    return { tenants: tenantResponses, total: tenantResponses.length };
  },

  async listTiers(): Promise<TierSummary[]> {
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
        createdAt: tier.createdAt.toISOString(),
      }));
  },

  async updateTenantProfile(
    id: string,
    input: UpdateTenantProfileRequest,
    _actor: ActorContext,
  ): Promise<TenantRow> {
    await this.getTenant(id);
    const updated = await tenantRepository.updateProfile(id, input);
    if (!updated) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
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
  async toResponse(tenant: TenantRow): Promise<TenantResponse> {
    const tier = await tierRepository.findById(tenant.tierId);
    const currentPsfRateMinor = await psfRateService.resolveEffectiveRateMinor(
      tenant.id,
      tenant.tierId,
    );
    const suggestedPsfRateMinor = await psfSuggestionService.getSuggestedRateMinor(tenant.id);
    const ownerSetup = await tenantOwnerService.getOwnerSetupStatus(tenant.id);

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
      suspendedReason: tenant.suspendedReason ?? null,
      suspendedAt: tenant.suspendedAt ? tenant.suspendedAt.toISOString() : null,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  },
};
