import type { Role } from '@loomis/contracts';

export interface ActorContext {
  userId: string;
  role: Role;
  tenantId: string | null;
}

export interface OutboxEventInput {
  tenantId: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/** DSAR response deadline (NDPA 2023 — System Design §19.3). */
export const DSAR_DEADLINE_DAYS = 30;
export const DSAR_ESCALATION_DAY_21 = 21;
export const DSAR_ESCALATION_DAY_28 = 28;

/** NDPC breach notification window (System Design §19.4). */
export const BREACH_NDPC_HOURS = 72;
export const BREACH_DPO_ESCALATION_HOURS = 48;

/** Hard delete grace period after anonymisation (System Design §19.2). */
export const RETENTION_HARD_DELETE_DAYS = 90;

export const OPEN_DSAR_STATUSES = ['received', 'in_progress'] as const;
export const OPEN_BREACH_STATUSES = ['suspected', 'confirmed', 'contained'] as const;
