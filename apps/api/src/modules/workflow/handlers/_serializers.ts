import type {
  WorkflowDecisionResponse,
  WorkflowInstanceResponse,
  WorkflowStepResponse,
  WorkflowTemplateResponse,
} from '@loomis/contracts';
import type {
  WorkflowDecisionRow,
  WorkflowInstanceRow,
  WorkflowStepRow,
} from '../repository/workflow.repository.js';

export function workflowStepToResponse(step: WorkflowStepRow): WorkflowStepResponse {
  return {
    id: step.id,
    sequence: step.sequence,
    approverRole: step.approverRole as WorkflowStepResponse['approverRole'],
    status: step.status as WorkflowStepResponse['status'],
    timeoutHours: step.timeoutHours,
    escalatesToRole: (step.escalatesToRole as WorkflowStepResponse['escalatesToRole']) ?? null,
    dueAt: step.dueAt?.toISOString() ?? null,
    activatedAt: step.activatedAt?.toISOString() ?? null,
    completedAt: step.completedAt?.toISOString() ?? null,
    escalatedAt: step.escalatedAt?.toISOString() ?? null,
  };
}

export function workflowDecisionToResponse(
  decision: WorkflowDecisionRow,
): WorkflowDecisionResponse {
  return {
    id: decision.id,
    workflowStepId: decision.workflowStepId,
    actorUserId: decision.actorUserId,
    actorRole: decision.actorRole as WorkflowDecisionResponse['actorRole'],
    decision: decision.decision as WorkflowDecisionResponse['decision'],
    comment: decision.comment,
    createdAt: decision.createdAt.toISOString(),
  };
}

export function workflowInstanceToResponse(
  instance: WorkflowInstanceRow,
  steps?: WorkflowStepRow[],
  decisions?: WorkflowDecisionRow[],
): WorkflowInstanceResponse {
  return {
    id: instance.id,
    tenantId: instance.tenantId,
    workflowType: instance.workflowType as WorkflowInstanceResponse['workflowType'],
    status: instance.status as WorkflowInstanceResponse['status'],
    requestedById: instance.requestedById,
    requestedByRole: instance.requestedByRole as WorkflowInstanceResponse['requestedByRole'],
    subjectType: instance.subjectType,
    subjectId: instance.subjectId,
    title: instance.title,
    payload: instance.payload,
    currentStepSequence: instance.currentStepSequence,
    completedAt: instance.completedAt?.toISOString() ?? null,
    createdAt: instance.createdAt.toISOString(),
    updatedAt: instance.updatedAt.toISOString(),
    steps: steps?.map(workflowStepToResponse),
    decisions: decisions?.map(workflowDecisionToResponse),
  };
}

export function workflowTemplateToResponse(
  template: WorkflowTemplateResponse,
): WorkflowTemplateResponse {
  return template;
}
