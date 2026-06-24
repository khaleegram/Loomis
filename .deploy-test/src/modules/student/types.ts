import type {
  AdmissionDecisionRequest,
  CreateAdmissionRequest,
  CreateEnrollmentRequest,
  InitiateParentLinkRequest,
  RecordIdentityAttestationRequest,
  TransferStudentOutRequest,
} from '@loomis/contracts';
import type { Role } from '@loomis/contracts';

export interface ActorContext {
  userId: string;
  role: Role;
  tenantId: string | null;
}

export type CreateAdmissionInput = CreateAdmissionRequest;
export type AdmissionDecisionInput = AdmissionDecisionRequest;
export type CreateEnrollmentInput = CreateEnrollmentRequest;
export type InitiateParentLinkInput = InitiateParentLinkRequest;
export type RecordIdentityAttestationInput = RecordIdentityAttestationRequest;
export type TransferStudentOutInput = TransferStudentOutRequest;

export interface OutboxEventInput {
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}
