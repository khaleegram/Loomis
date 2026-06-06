import { z } from 'zod';
import { role } from '../common/roles.js';

/**
 * Workflow module contracts (SRS §4.10, Appendix D; US-WRK-001..003).
 * Shared by the API and web/mobile clients.
 */

export const workflowType = z.enum([
  'term_closure',
  'academic_year_closure',
  'student_promotion_batch',
  'student_graduation',
  'held_back_override',
  'refund_request',
  'grade_correction',
  'admission_decision',
  'financial_adjustment',
  'fee_structure_change',
  'student_transfer_out',
  'psf_waiver',
  'psf_rate_override',
  'ledger_adjustment',
  'support_break_glass',
  'staff_onboarding',
  'staff_role_change',
  'staff_deactivation',
  'mfa_device_reset',
  'psf_reversal_on_refund',
  'ivp_enforcement_action',
  'dsar_request',
]);
export type WorkflowType = z.infer<typeof workflowType>;

export const workflowInstanceStatus = z.enum([
  'pending',
  'approved',
  'rejected',
  'returned',
  'cancelled',
]);
export type WorkflowInstanceStatus = z.infer<typeof workflowInstanceStatus>;

export const workflowStepStatus = z.enum([
  'pending',
  'active',
  'approved',
  'rejected',
  'returned',
  'skipped',
  'escalated',
]);
export type WorkflowStepStatus = z.infer<typeof workflowStepStatus>;

export const workflowDecisionType = z.enum(['approve', 'reject', 'return']);
export type WorkflowDecisionType = z.infer<typeof workflowDecisionType>;

/** A single approver step in a configurable chain (US-WRK-001). */
export const approverChainStep = z.object({
  role,
  timeoutHours: z.number().int().positive().nullable().optional(),
  escalatesToRole: role.nullable().optional(),
});
export type ApproverChainStep = z.infer<typeof approverChainStep>;

export const upsertWorkflowTemplateRequest = z.object({
  approverChain: z.array(approverChainStep).min(1).max(10),
  isActive: z.boolean().optional(),
});
export type UpsertWorkflowTemplateRequest = z.infer<typeof upsertWorkflowTemplateRequest>;

export const workflowTemplateResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  workflowType,
  approverChain: z.array(approverChainStep),
  isMandatory: z.boolean(),
  isActive: z.boolean(),
  updatedAt: z.string().datetime(),
});
export type WorkflowTemplateResponse = z.infer<typeof workflowTemplateResponse>;

export const workflowDecisionResponse = z.object({
  id: z.string().uuid(),
  workflowStepId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  actorRole: role,
  decision: workflowDecisionType,
  comment: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type WorkflowDecisionResponse = z.infer<typeof workflowDecisionResponse>;

export const workflowStepResponse = z.object({
  id: z.string().uuid(),
  sequence: z.number().int(),
  approverRole: role,
  status: workflowStepStatus,
  timeoutHours: z.number().int().nullable(),
  escalatesToRole: role.nullable(),
  dueAt: z.string().datetime().nullable(),
  activatedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  escalatedAt: z.string().datetime().nullable(),
});
export type WorkflowStepResponse = z.infer<typeof workflowStepResponse>;

export const workflowInstanceResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  workflowType,
  status: workflowInstanceStatus,
  requestedById: z.string().uuid(),
  requestedByRole: role,
  subjectType: z.string().nullable(),
  subjectId: z.string().uuid().nullable(),
  title: z.string().nullable(),
  payload: z.record(z.unknown()),
  currentStepSequence: z.number().int(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  steps: z.array(workflowStepResponse).optional(),
  decisions: z.array(workflowDecisionResponse).optional(),
});
export type WorkflowInstanceResponse = z.infer<typeof workflowInstanceResponse>;

export const workflowInboxItemResponse = z.object({
  instance: workflowInstanceResponse,
  activeStep: workflowStepResponse,
});
export type WorkflowInboxItemResponse = z.infer<typeof workflowInboxItemResponse>;

export const workflowDecideRequest = z.object({
  decision: workflowDecisionType,
  comment: z.string().max(1000).optional(),
});
export type WorkflowDecideRequest = z.infer<typeof workflowDecideRequest>;

/** Default platform/school approver chains (Appendix D). Overridable per tenant. */
export const DEFAULT_WORKFLOW_CHAINS: Record<
  WorkflowType,
  { scope: 'platform' | 'tenant'; chain: ApproverChainStep[]; isMandatory: boolean }
> = {
  term_closure: {
    scope: 'tenant',
    isMandatory: true,
    chain: [{ role: 'principal', timeoutHours: 72, escalatesToRole: 'school_owner' }],
  },
  academic_year_closure: {
    scope: 'tenant',
    isMandatory: true,
    chain: [{ role: 'principal', timeoutHours: 72, escalatesToRole: 'school_owner' }],
  },
  student_promotion_batch: {
    scope: 'tenant',
    isMandatory: false,
    chain: [{ role: 'principal', timeoutHours: 48 }],
  },
  student_graduation: {
    scope: 'tenant',
    isMandatory: false,
    chain: [{ role: 'principal', timeoutHours: 48, escalatesToRole: 'exam_officer' }],
  },
  held_back_override: {
    scope: 'tenant',
    isMandatory: false,
    chain: [{ role: 'school_owner', timeoutHours: 48 }],
  },
  refund_request: {
    scope: 'tenant',
    isMandatory: false,
    chain: [
      { role: 'accountant', timeoutHours: 48, escalatesToRole: 'principal' },
      { role: 'principal', timeoutHours: 48, escalatesToRole: 'school_owner' },
      { role: 'school_owner', timeoutHours: 72 },
    ],
  },
  grade_correction: {
    scope: 'tenant',
    isMandatory: false,
    chain: [
      { role: 'exam_officer', timeoutHours: 48, escalatesToRole: 'deputy_exam_officer' },
      { role: 'principal', timeoutHours: 48 },
    ],
  },
  admission_decision: {
    scope: 'tenant',
    isMandatory: false,
    chain: [
      { role: 'principal', timeoutHours: 48 },
      { role: 'school_owner', timeoutHours: 72 },
    ],
  },
  financial_adjustment: {
    scope: 'tenant',
    isMandatory: false,
    chain: [
      { role: 'principal', timeoutHours: 48 },
      { role: 'school_owner', timeoutHours: 72 },
    ],
  },
  // Amending a fee structure after its term has opened requires Principal
  // approval (US-FIN-001). Mandatory so it can never be disabled per tenant.
  fee_structure_change: {
    scope: 'tenant',
    isMandatory: true,
    chain: [{ role: 'principal', timeoutHours: 48, escalatesToRole: 'school_owner' }],
  },
  student_transfer_out: {
    scope: 'tenant',
    isMandatory: false,
    chain: [{ role: 'principal', timeoutHours: 48 }],
  },
  psf_waiver: {
    scope: 'platform',
    isMandatory: true,
    chain: [{ role: 'platform_admin', timeoutHours: 48 }],
  },
  psf_rate_override: {
    scope: 'platform',
    isMandatory: true,
    chain: [{ role: 'platform_admin', timeoutHours: 48 }],
  },
  ledger_adjustment: {
    scope: 'platform',
    isMandatory: true,
    chain: [{ role: 'platform_admin', timeoutHours: 48 }],
  },
  support_break_glass: {
    scope: 'platform',
    isMandatory: true,
    chain: [{ role: 'platform_admin', timeoutHours: 24 }],
  },
  staff_onboarding: {
    scope: 'tenant',
    isMandatory: false,
    chain: [{ role: 'principal', timeoutHours: 48 }],
  },
  staff_role_change: {
    scope: 'tenant',
    isMandatory: false,
    chain: [{ role: 'school_owner', timeoutHours: 48 }],
  },
  staff_deactivation: {
    scope: 'tenant',
    isMandatory: false,
    chain: [{ role: 'principal', timeoutHours: 48 }],
  },
  mfa_device_reset: {
    scope: 'platform',
    isMandatory: true,
    chain: [{ role: 'platform_admin', timeoutHours: 24 }],
  },
  psf_reversal_on_refund: {
    scope: 'platform',
    isMandatory: true,
    chain: [{ role: 'platform_admin', timeoutHours: 48 }],
  },
  ivp_enforcement_action: {
    scope: 'platform',
    isMandatory: true,
    chain: [{ role: 'platform_admin', timeoutHours: 48 }],
  },
  dsar_request: {
    scope: 'platform',
    isMandatory: true,
    chain: [{ role: 'dpo', timeoutHours: 720 }],
  },
};
