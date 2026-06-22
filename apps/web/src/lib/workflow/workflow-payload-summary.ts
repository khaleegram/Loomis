import type { WorkflowInboxItemResponse, WorkflowType } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';

import { formatRoleLabel } from '@/components/school/school-nav-config';
import { refundAmountFromPayload } from '@/lib/leadership/leadership-attention';

export function summarizeWorkflowPayload(item: WorkflowInboxItemResponse): string[] {
  const payload = item.instance.payload ?? {};
  const lines: string[] = [];

  switch (item.instance.workflowType as WorkflowType) {
    case 'fee_structure_change': {
      const total = payload.proposedTotalMinor;
      const itemCount = Array.isArray(payload.items) ? payload.items.length : null;
      if (typeof total === 'number') {
        lines.push(`Proposed total: ${formatKobo(total)}`);
      }
      if (itemCount !== null) {
        lines.push(`${itemCount} fee line${itemCount === 1 ? '' : 's'}`);
      }
      if (typeof payload.justification === 'string' && payload.justification.trim()) {
        lines.push(payload.justification.trim());
      }
      break;
    }
    case 'student_transfer_out': {
      if (typeof payload.destinationSchool === 'string') {
        lines.push(`Destination: ${payload.destinationSchool}`);
      }
      if (typeof payload.reason === 'string' && payload.reason.trim()) {
        lines.push(payload.reason.trim());
      }
      break;
    }
    case 'held_back_override': {
      if (typeof payload.heldBackReason === 'string' && payload.heldBackReason.trim()) {
        lines.push(`Reason: ${payload.heldBackReason.trim()}`);
      }
      break;
    }
    case 'staff_role_change': {
      const role = payload.primaryRole;
      if (typeof role === 'string') {
        lines.push(`New role: ${formatRoleLabel(role)}`);
      }
      break;
    }
    case 'refund_request':
      lines.push(formatKobo(refundAmountFromPayload(payload)));
      break;
    default:
      if (item.instance.title) {
        lines.push(item.instance.title);
      }
  }

  return lines;
}
