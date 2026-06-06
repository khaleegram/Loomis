import type {
  AmendFeeStructureRequest,
  BatchIssueInvoicesRequest,
  CreateFeeStructureRequest,
  FeeItemInput,
  IssueInvoiceRequest,
  UpdateFeeStructureRequest,
} from '@loomis/contracts';

/** Actor context for finance writes — set from the verified access token. */
export interface ActorContext {
  userId: string;
  role: string;
  tenantId: string | null;
}

/** Audit context carried from the request for the immutable audit trail. */
export interface AuditContext {
  requestId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type CreateFeeStructureInput = CreateFeeStructureRequest;
export type UpdateFeeStructureInput = UpdateFeeStructureRequest;
export type AmendFeeStructureInput = AmendFeeStructureRequest;
export type FeeItemInputDto = FeeItemInput;
export type IssueInvoiceInput = IssueInvoiceRequest;
export type BatchIssueInvoicesInput = BatchIssueInvoicesRequest;

/** A single durable outbox event row to insert inside a producer's transaction. */
export interface OutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  tenantId: string | null;
  payload: Record<string, unknown>;
}
