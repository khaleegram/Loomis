import type { WorkflowType } from '@loomis/contracts';

const WORKFLOW_TYPE_LABELS: Partial<Record<WorkflowType, string>> = {
  term_closure: 'Term closure',
  academic_year_closure: 'Academic year closure',
  student_promotion_batch: 'Promotion batch',
  student_graduation: 'Graduation',
  held_back_override: 'Held back override',
  refund_request: 'Refund request',
  grade_correction: 'Grade correction',
  admission_decision: 'Admission decision',
  financial_adjustment: 'Financial adjustment',
  fee_structure_change: 'Fee structure change',
  student_transfer_out: 'Student transfer',
  psf_waiver: 'PSF waiver',
  psf_rate_override: 'PSF rate override',
  ledger_adjustment: 'Ledger adjustment',
  support_break_glass: 'Break-glass access',
  staff_onboarding: 'Staff onboarding',
  staff_role_change: 'Staff role change',
  staff_deactivation: 'Staff deactivation',
  mfa_device_reset: 'MFA device reset',
  psf_reversal_on_refund: 'PSF reversal on refund',
  ivp_enforcement_action: 'IVP enforcement',
  dsar_request: 'DSAR request',
};

export function formatWorkflowTypeLabel(type: WorkflowType | string): string {
  const label = WORKFLOW_TYPE_LABELS[type as WorkflowType];
  if (label) return label;
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
