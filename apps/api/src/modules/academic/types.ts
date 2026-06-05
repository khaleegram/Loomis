import type {
  CloseTermRequest,
  ConfigureTermRequest,
  CreateAcademicYearRequest,
  CreateClassArmRequest,
  CreateClassLevelRequest,
  CensusLockRequest,
  PromotionDecision,
  StagePromotionRequest,
  UpsertProgressionRequest,
} from '@loomis/contracts';

/** Actor context for academic writes — set from the verified access token. */
export interface ActorContext {
  userId: string;
  role: string;
  tenantId: string | null;
}

export type CreateAcademicYearInput = CreateAcademicYearRequest;
export type ConfigureTermInput = ConfigureTermRequest;
export type CloseTermInput = CloseTermRequest;
export type CensusLockInput = CensusLockRequest;
export type CreateClassLevelInput = CreateClassLevelRequest;
export type CreateClassArmInput = CreateClassArmRequest;
export type UpsertProgressionInput = UpsertProgressionRequest;
export type StagePromotionInput = StagePromotionRequest;
export type PromotionDecisionInput = PromotionDecision;

/** A single durable outbox event row to insert inside a producer's transaction. */
export interface OutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  tenantId: string | null;
  payload: Record<string, unknown>;
}
