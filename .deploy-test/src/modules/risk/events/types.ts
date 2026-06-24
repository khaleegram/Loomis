import { RISK_EVENT_TYPES } from '@loomis/contracts';

export { RISK_EVENT_TYPES };

export interface IvpCaseOpenedPayload extends Record<string, unknown> {
  caseId: string;
  tenantId: string;
  termId: string;
  anomalyScore: number;
  priority: string;
  reportedEnrollment: number;
  estimatedMin: number;
  estimatedMax: number;
}

export interface BreakGlassActivatedPayload extends Record<string, unknown> {
  sessionId: string;
  tenantId: string;
  supportUserId: string;
  supportTicketId: string;
  expiresAt: string;
  schoolOwnerUserId: string | null;
}
