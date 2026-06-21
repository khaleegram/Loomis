import type { TenantListResponse, TenantResponse, TierSummary } from '@loomis/contracts';
import { mergeExperienceFlags } from '@loomis/core';
import { LoomisError } from '../../../shared/errors.js';
import { tenantEvents } from '../events/index.js';
import { psfRateSnapshotRepository } from '../repository/psf-rate.repository.js';
import { tenantRepository } from '../repository/tenant.repository.js';
import { tierRepository } from '../repository/tier.repository.js';
import type { ActorContext, ProvisionTenantInput, SuspendTenantInput } from '../types.js';
import { psfRateService } from './psf-rate.service.js';
import { attributionService } from '../../referral/services/attribution.service.js';

type TenantRow = NonNullable<Awaited<ReturnType<typeof tenantRepository.findById>>>;

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

    // Admin-set initial rate (US-PLT-001 allows setting the initial PSF rate at
    // provisioning). Recorded as an immutable snapshot. If omitted, the tenant
    // bills at the global default / tier default resolved at census time.
    if (input.initialPsfRateMinor !== undefined) {
      const snapshot = await psfRateSnapshotRepository.create({
        scope: 'tenant',
        tenantId: tenant.id,
        rateMinor: input.initialPsfRateMinor,
        previousRateMinor: null,
        effectiveFrom: new Date(),
        reason: 'Initial PSF rate set at provisioning',
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
    }

    const activated = await tenantRepository.setStatus(tenant.id, 'active');
    const result = activated ?? tenant;

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
    return rows.map((tier) => ({
      id: tier.id,
      code: tier.code,
      name: tier.name,
      description: tier.description ?? null,
      defaultPsfRateMinor: tier.defaultPsfRateMinor,
      maxStudents: tier.maxStudents ?? null,
      createdAt: tier.createdAt.toISOString(),
    }));
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

    return {
      id: tenant.id,
      name: tenant.name,
      region: tenant.region,
      contactEmail: tenant.contactEmail,
      address: tenant.address,
      status: tenant.status as TenantResponse['status'],
      tierId: tenant.tierId,
      tierCode: tier?.code ?? '',
      referralCode: tenant.referralCode ?? null,
      currentPsfRateMinor,
      experienceTier: tenant.experienceTier as TenantResponse['experienceTier'],
      financeMode: tenant.financeMode as TenantResponse['financeMode'],
      experienceFlags: mergeExperienceFlags(
        tenant.experienceFlags as TenantResponse['experienceFlags'],
      ),
      suspendedReason: tenant.suspendedReason ?? null,
      suspendedAt: tenant.suspendedAt ? tenant.suspendedAt.toISOString() : null,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  },
};
