import { registerEventHandler } from '../../../shared/events/registry.js';
import { WORKFLOW_EVENT_TYPES } from '../../workflow/events/types.js';
import { handleWorkflowCompleted } from './consumers/workflow-events.consumer.js';

/**
 * Registers in-process consumers for cross-module events the Finance module
 * reacts to. Currently: `workflow.completed`, which applies an approved
 * fee-structure amendment (US-FIN-001). The registry supports multiple handlers
 * per event type, so this coexists with the Tenant module's consumer; each
 * handler ignores workflow types it does not own and dedupes by event id.
 */
export function registerFinanceEventConsumers(): void {
  registerEventHandler(WORKFLOW_EVENT_TYPES.completed, handleWorkflowCompleted);
}

export { FINANCE_EVENT_TYPES } from './types.js';
export type { FeeStructureEventPayload, InvoiceIssuedPayload } from './types.js';
