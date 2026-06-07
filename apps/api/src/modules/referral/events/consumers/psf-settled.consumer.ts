import { LEDGER_EVENT_TYPES } from '@loomis/contracts';
import { earningService } from '../../services/earning.service.js';

interface OutboxEnvelope {
  event_id: string;
  payload: {
    tenantId: string;
    obligationId: string;
    settledAmountMinor: number;
    termId: string;
    studentId: string;
  };
}

export async function handlePsfObligationSettled(event: OutboxEnvelope): Promise<void> {
  await earningService.handlePsfObligationSettled({
    event_id: event.event_id,
    payload: {
      tenantId: event.payload.tenantId,
      obligationId: event.payload.obligationId,
      settledAmountMinor: event.payload.settledAmountMinor,
      termId: event.payload.termId,
      studentId: event.payload.studentId,
    },
  });
}

export { LEDGER_EVENT_TYPES };
