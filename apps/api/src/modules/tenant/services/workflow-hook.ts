import { workflowService } from '../../workflow/index.js';

/**
 * Integration point for the two-person approval workflow (FR-PLT-002, CON-013).
 *
 * A privileged change such as a per-school PSF rate override is routed through
 * the Workflow module: a first Platform Admin submits the request, and a
 * DIFFERENT Platform Admin approves it (the requester can never approve their own
 * request). On approval the workflow emits `workflow.completed`, whose consumer
 * calls `psfRateService.applyApprovedPsfRateOverride(...)`.
 */
export interface PrivilegedChangeRequest {
  changeType: 'psf_rate_override';
  tenantId: string;
  requestedById: string;
  requestedByRole: string;
  justification: string;
  payload: Record<string, unknown>;
}

export interface WorkflowInstanceRef {
  workflowInstanceId: string;
  status: 'pending';
}

export const workflowHook = {
  async requestPrivilegedChange(request: PrivilegedChangeRequest): Promise<WorkflowInstanceRef> {
    const result = await workflowService.startPrivilegedChange({
      workflowType: 'psf_rate_override',
      tenantId: request.tenantId,
      requestedById: request.requestedById,
      requestedByRole: request.requestedByRole,
      justification: request.justification,
      payload: request.payload,
      subjectType: 'tenant',
      subjectId: request.tenantId,
    });

    return {
      workflowInstanceId: result.workflowInstanceId,
      status: 'pending',
    };
  },
};
