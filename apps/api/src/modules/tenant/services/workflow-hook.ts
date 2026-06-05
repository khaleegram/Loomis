import { LoomisError } from '../../../shared/errors.js';

/**
 * Integration point for the two-person approval workflow (FR-PLT-002, CON-013).
 *
 * A privileged change such as a per-school PSF rate override must be routed
 * through the Workflow module: a first Platform Admin submits the request, and a
 * DIFFERENT Platform Admin approves it (the requester can never approve their own
 * request). On approval the workflow emits `workflow.completed`, whose consumer
 * calls `psfRateService.applyApprovedPsfRateOverride(...)`.
 *
 * BLOCKED — the Workflow module (Phase 2 / Chat 6) is not built yet. There is no
 * `workflow` schema, no approval engine, and nothing to route the request to.
 * Per loomis-implementation-guardrails we DO NOT fake an approval or silently
 * apply the override single-handedly (that would defeat dual approval and break
 * loomis-security segregation-of-duties). The hook is fully wired but fails
 * closed: it rejects the request until the Workflow module ships. When Workflow
 * exists, replace the body below with a real workflow-instance creation that
 * returns the instance id, and remove this guard.
 */
export interface PrivilegedChangeRequest {
  changeType: 'psf_rate_override';
  tenantId: string;
  requestedById: string;
  justification: string;
  payload: Record<string, unknown>;
}

export interface WorkflowInstanceRef {
  workflowInstanceId: string;
  status: 'pending';
}

export const workflowHook = {
  async requestPrivilegedChange(
    _request: PrivilegedChangeRequest,
  ): Promise<WorkflowInstanceRef> {
    throw new LoomisError(
      'TENANT_PSF_RATE_OVERRIDE_PENDING_APPROVAL',
      501,
      'Per-school PSF rate overrides require two-person approval via the Workflow module, which is not yet available. The request was not applied.',
    );
  },
};
