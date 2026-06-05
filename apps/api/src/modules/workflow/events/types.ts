import type { WorkflowType } from '@loomis/contracts';

/** Events published by the Workflow module (System Design §3.2; FR-WFL-003). */
export const WORKFLOW_EVENT_TYPES = {
  completed: 'workflow.completed',
  escalated: 'workflow.escalated',
} as const;

export interface WorkflowCompletedEvent {
  eventId: string;
  workflowInstanceId: string;
  workflowType: WorkflowType;
  tenantId: string | null;
  status: 'approved' | 'rejected' | 'returned';
  requestedById: string;
  approvedById: string | null;
  subjectType: string | null;
  subjectId: string | null;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface WorkflowEscalatedEvent {
  eventId: string;
  workflowInstanceId: string;
  workflowType: WorkflowType;
  tenantId: string | null;
  workflowStepId: string;
  fromRole: string;
  toRole: string;
  dueAt: string | null;
  occurredAt: string;
}
