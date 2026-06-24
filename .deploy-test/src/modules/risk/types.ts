import type {
  CreatePrivilegedChangeRequest,
  DecidePrivilegedChangeRequest,
  IvpCaseStatus,
  RequestIvpRecountRequest,
  StartBreakGlassRequest,
  UpdateIvpCaseRequest,
} from '@loomis/contracts';
import type { Role } from '@loomis/contracts';

export interface ActorContext {
  userId: string;
  role: Role;
  tenantId: string | null;
}

export type UpdateIvpCaseInput = UpdateIvpCaseRequest;
export type RequestIvpRecountInput = RequestIvpRecountRequest;
export type CreatePrivilegedChangeInput = CreatePrivilegedChangeRequest;
export type DecidePrivilegedChangeInput = DecidePrivilegedChangeRequest;
export type StartBreakGlassInput = StartBreakGlassRequest;

export interface CollectedSignals {
  attendanceAnomaly: number;
  gradebookAnomaly: number;
  paymentVolumeRatioMilli: number;
  deviceCount: number;
  parentLinkAnomaly: number;
  activityEstimate: number;
}

export interface IvpScoreResult {
  compositeScore: number;
  zScores: Record<string, number>;
  priority: 'watchlist' | 'standard' | 'urgent';
  estimatedMin: number;
  estimatedMax: number;
}

export interface OutboxEventInput {
  tenantId: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export const ACTIVE_IVP_STATUSES: IvpCaseStatus[] = ['OPEN', 'INVESTIGATING'];

export const IVP_SCORE_WEIGHTS = {
  attendance_anomaly: 0.3,
  gradebook_anomaly: 0.2,
  payment_volume: 0.25,
  device_count: 0.15,
  parent_link: 0.1,
} as const;

export const IVP_OPEN_CASE_THRESHOLD = 2.0;
export const IVP_URGENT_THRESHOLD = 3.5;
export const IVP_WATCHLIST_THRESHOLD = 1.5;

export const BREAK_GLASS_TTL_MS = 30 * 60 * 1000;
