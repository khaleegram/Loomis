import { registerEventHandler } from '../../../shared/events/registry.js';
import { WORKFLOW_EVENT_TYPES } from '../../workflow/events/types.js';
import { handleWorkflowCompleted } from './consumers/workflow-events.consumer.js';

/** HRM workflow side effects — staff role change finalize on Owner approval. */
export function registerHrmEventConsumers(): void {
  registerEventHandler(WORKFLOW_EVENT_TYPES.completed, handleWorkflowCompleted);
}
