import type {
  ApproverChainStep,
  UpsertWorkflowTemplateRequest,
  WorkflowDecideRequest,
  WorkflowType,
} from '@loomis/contracts';

/** Actor context for workflow writes — set from the verified access token. */
export interface ActorContext {
  userId: string;
  role: string;
  tenantId: string | null;
}

export type UpsertTemplateInput = UpsertWorkflowTemplateRequest;
export type DecideInput = WorkflowDecideRequest;

/** Input for starting a workflow — the public API other modules call. */
export interface StartWorkflowInput {
  workflowType: WorkflowType;
  tenantId: string | null;
  requestedById: string;
  requestedByRole: string;
  subjectType?: string | null;
  subjectId?: string | null;
  title?: string | null;
  payload?: Record<string, unknown>;
}

export interface ResolvedTemplate {
  workflowType: WorkflowType;
  approverChain: ApproverChainStep[];
  isMandatory: boolean;
}

/** A single durable outbox event row to insert inside a producer's transaction. */
export interface OutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  tenantId: string | null;
  payload: Record<string, unknown>;
}
