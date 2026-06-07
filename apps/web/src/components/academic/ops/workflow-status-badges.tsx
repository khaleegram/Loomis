import type {
  GradebookEntryStatus,
  GradeCorrectionStatus,
  WorkflowInstanceStatus,
  WorkflowStepStatus,
} from '@loomis/contracts';
import { Badge } from '@loomis/ui-web';

export function GradeEntryStatusBadge({ status }: { status: GradebookEntryStatus }) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    case 'submitted':
      return <Badge variant="default">Submitted</Badge>;
    case 'correction_pending':
      return <Badge variant="gold">Correction pending</Badge>;
    case 'corrected':
      return <Badge variant="outline">Corrected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function GradeCorrectionStatusBadge({ status }: { status: GradeCorrectionStatus }) {
  switch (status) {
    case 'pending':
      return <Badge variant="gold">Pending</Badge>;
    case 'approved':
      return <Badge variant="default">Approved</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    case 'returned':
      return <Badge variant="secondary">Returned</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function WorkflowStatusBadge({ status }: { status: WorkflowInstanceStatus }) {
  switch (status) {
    case 'pending':
      return <Badge variant="gold">Pending</Badge>;
    case 'approved':
      return <Badge variant="default">Approved</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    case 'returned':
      return <Badge variant="secondary">Returned</Badge>;
    case 'cancelled':
      return <Badge variant="outline">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function WorkflowStepStatusBadge({ status }: { status: WorkflowStepStatus }) {
  switch (status) {
    case 'active':
      return <Badge variant="gold">Awaiting action</Badge>;
    case 'approved':
      return <Badge variant="default">Approved</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    case 'pending':
      return <Badge variant="secondary">Queued</Badge>;
    case 'escalated':
      return <Badge variant="gold">Escalated</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
