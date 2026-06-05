import { LoomisError } from '../../../shared/errors.js';
import { tenantEvents } from '../events/index.js';
import { psfRateSnapshotRepository } from '../repository/psf-rate.repository.js';
import { tenantRepository } from '../repository/tenant.repository.js';
import { tierRepository } from '../repository/tier.repository.js';
import type {
  ActorContext,
  RequestPsfRateOverrideInput,
  SetGlobalPsfRateInput,
} from '../types.js';
import { workflowHook } from './workflow-hook.js';

type PsfRateSnapshot = Awaited<ReturnType<typeof psfRateSnapshotRepository.create>>;

/**
 * Guards CON-011 in the service layer in addition to the Zod schema and the DB
 * CHECK constraint. Defense in depth — a zero (or non-positive) PSF rate is
 * permanently blocked and can never be set through any path.
 */
function assertRateNonZero(rateMinor: number): void {
  if (!Number.isInteger(rateMinor) || rateMinor <= 0) {
    throw new LoomisError(
      'TENANT_PSF_RATE_ZERO_BLOCKED',
      422,
      'A PSF rate of zero is permanently blocked (CON-011)',
    );
  }
}

export const psfRateService = {
  /**
   * Sets the platform-wide default PSF rate (US-PLT-003). Step-up MFA is enforced
   * at the route. Records an immutable snapshot; never alters existing
   * obligations (those are created at census lock from the then-current rate).
   */
  async setGlobalPsfRate(input: SetGlobalPsfRateInput, actor: ActorContext): Promise<PsfRateSnapshot> {
    assertRateNonZero(input.rateMinor);

    const current = await psfRateSnapshotRepository.findLatestGlobal();
    const previousRateMinor = current?.rateMinor ?? null;

    const snapshot = await psfRateSnapshotRepository.create({
      scope: 'global',
      tenantId: null,
      rateMinor: input.rateMinor,
      previousRateMinor,
      effectiveFrom: input.effectiveFrom,
      reason: input.reason,
      changedById: actor.userId,
    });

    await tenantEvents.publishPsfRateChanged({
      snapshotId: snapshot.id,
      scope: 'global',
      tenantId: null,
      rateMinor: snapshot.rateMinor,
      previousRateMinor,
      effectiveFrom: snapshot.effectiveFrom.toISOString(),
      changedById: actor.userId,
      approvedById: null,
    });

    return snapshot;
  },

  /**
   * Requests a per-school PSF rate override (US-PLT-004 / FR-PLT-002). This needs
   * two-person approval, so it routes through the Workflow module rather than
   * applying directly. The requester is never the approver (CON-013).
   *
   * The Workflow module is not built yet, so `workflowHook` fails closed — see
   * the labelled note there. The override is NOT applied here.
   */
  async requestPsfRateOverride(input: RequestPsfRateOverrideInput, actor: ActorContext) {
    assertRateNonZero(input.rateMinor);

    const tenant = await tenantRepository.findById(input.tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    return workflowHook.requestPrivilegedChange({
      changeType: 'psf_rate_override',
      tenantId: input.tenantId,
      requestedById: actor.userId,
      requestedByRole: actor.role,
      justification: input.justification,
      payload: {
        rateMinor: input.rateMinor,
        effectiveFrom: input.effectiveFrom.toISOString(),
      },
    });
  },

  /**
   * Applies a per-school PSF rate override AFTER dual approval has completed.
   * Called by the `workflow.completed` consumer — not reachable from a route.
   *
   * Enforces segregation of duties (loomis-security): the approver must differ
   * from the requester. NOTE — no caller exists until the Workflow module ships;
   * wired here so the override-application path is correct and testable.
   */
  async applyApprovedPsfRateOverride(params: {
    tenantId: string;
    rateMinor: number;
    effectiveFrom: Date;
    reason: string;
    requestedById: string;
    approvedById: string;
    workflowInstanceId: string;
  }): Promise<PsfRateSnapshot> {
    assertRateNonZero(params.rateMinor);

    if (params.approvedById === params.requestedById) {
      throw new LoomisError(
        'WORKFLOW_APPROVER_IS_REQUESTER',
        403,
        'The approver of a PSF rate override cannot be the requester (CON-013)',
      );
    }

    const tenant = await tenantRepository.findById(params.tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    const current = await psfRateSnapshotRepository.findLatestForTenant(params.tenantId);
    const previousRateMinor = current?.rateMinor ?? null;

    const snapshot = await psfRateSnapshotRepository.create({
      scope: 'tenant',
      tenantId: params.tenantId,
      rateMinor: params.rateMinor,
      previousRateMinor,
      effectiveFrom: params.effectiveFrom,
      reason: params.reason,
      changedById: params.requestedById,
      approvedById: params.approvedById,
      workflowInstanceId: params.workflowInstanceId,
    });

    await tenantEvents.publishPsfRateChanged({
      snapshotId: snapshot.id,
      scope: 'tenant',
      tenantId: params.tenantId,
      rateMinor: snapshot.rateMinor,
      previousRateMinor,
      effectiveFrom: snapshot.effectiveFrom.toISOString(),
      changedById: params.requestedById,
      approvedById: params.approvedById,
    });

    return snapshot;
  },

  /**
   * Resolves the effective PSF rate for a tenant (kobo): the latest per-tenant
   * override if any, else the latest global default, else the tier default.
   * Returns null only if no rate exists anywhere (pre-bootstrap).
   */
  async resolveEffectiveRateMinor(tenantId: string, tierId: string): Promise<number | null> {
    const tenantSnapshot = await psfRateSnapshotRepository.findLatestForTenant(tenantId);
    if (tenantSnapshot) return tenantSnapshot.rateMinor;

    const globalSnapshot = await psfRateSnapshotRepository.findLatestGlobal();
    if (globalSnapshot) return globalSnapshot.rateMinor;

    const tier = await tierRepository.findById(tierId);
    return tier?.defaultPsfRateMinor ?? null;
  },

  async getGlobalHistory() {
    return psfRateSnapshotRepository.listGlobalHistory();
  },

  async getTenantHistory(tenantId: string) {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    return psfRateSnapshotRepository.listTenantHistory(tenantId);
  },
};
