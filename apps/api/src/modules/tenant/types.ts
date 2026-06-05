import type {
  PsfRateScope,
  ProvisionTenantRequest,
  SuspendTenantRequest,
  TenantStatus,
  UpsertConfigurationRequest,
} from '@loomis/contracts';

export type { PsfRateScope, TenantStatus };

/** Actor context for tenant writes — set from the verified access token. */
export interface ActorContext {
  userId: string;
  role: string;
}

/** Service input types mirror the validated request contracts. */
export type ProvisionTenantInput = ProvisionTenantRequest;

export type SuspendTenantInput = SuspendTenantRequest;

export interface SetGlobalPsfRateInput {
  rateMinor: number;
  effectiveFrom: Date;
  reason: string;
}

export interface RequestPsfRateOverrideInput {
  tenantId: string;
  rateMinor: number;
  effectiveFrom: Date;
  justification: string;
}

export interface CreatePsfRateSnapshotInput {
  scope: PsfRateScope;
  tenantId: string | null;
  rateMinor: number;
  previousRateMinor: number | null;
  effectiveFrom: Date;
  reason: string | null;
  changedById: string;
  approvedById?: string | null;
  workflowInstanceId?: string | null;
}

export type UpsertConfigurationInput = UpsertConfigurationRequest;
