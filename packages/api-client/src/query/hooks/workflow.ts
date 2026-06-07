import { useQuery } from '@tanstack/react-query';
import type {
  WorkflowDecideRequest,
  WorkflowInboxItemResponse,
  WorkflowInstanceResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { useApiClient } from '../context.js';
import { assertTenantScopedKey, queryKeys } from '../keys.js';

const WORKFLOW_STALE_MS = 20_000;

interface WorkflowInboxListResponse {
  items: WorkflowInboxItemResponse[];
}

interface WorkflowMineListResponse {
  instances: WorkflowInstanceResponse[];
}

export function workflowInboxQueryOptions(client: ApiClient, tenantId: string) {
  const queryKey = queryKeys.workflow.inbox(tenantId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<WorkflowInboxListResponse>(`/tenants/${tenantId}/workflows/inbox`),
    staleTime: WORKFLOW_STALE_MS,
  };
}

export function workflowMineQueryOptions(client: ApiClient, tenantId: string) {
  const queryKey = queryKeys.workflow.mine(tenantId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<WorkflowMineListResponse>(`/tenants/${tenantId}/workflows/mine`),
    staleTime: WORKFLOW_STALE_MS,
  };
}

export function workflowInstanceQueryOptions(
  client: ApiClient,
  tenantId: string,
  instanceId: string,
) {
  const queryKey = queryKeys.workflow.instance(tenantId, instanceId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<WorkflowInstanceResponse>(
        `/tenants/${tenantId}/workflows/instances/${instanceId}`,
      ),
    staleTime: WORKFLOW_STALE_MS,
  };
}

/** Pending workflow items for the signed-in approver (US-WRK-002). */
export function useWorkflowInbox(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    ...workflowInboxQueryOptions(client, tenantId),
    enabled: Boolean(tenantId),
  });
}

/** Workflows initiated by the signed-in user (US-WRK-003). */
export function useWorkflowMine(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    ...workflowMineQueryOptions(client, tenantId),
    enabled: Boolean(tenantId),
  });
}

/** Single workflow instance with steps and decisions. */
export function useWorkflowInstance(tenantId: string, instanceId: string) {
  const client = useApiClient();
  return useQuery({
    ...workflowInstanceQueryOptions(client, tenantId, instanceId),
    enabled: Boolean(tenantId && instanceId),
  });
}

/** Approve, reject, or return a workflow step. */
export function useDecideWorkflow(tenantId: string, instanceId: string, stepId: string) {
  return useIdempotentMutation<WorkflowDecideRequest, WorkflowInstanceResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<WorkflowInstanceResponse>(
        `/tenants/${tenantId}/workflows/instances/${instanceId}/steps/${stepId}/decide`,
        body,
        { idempotencyKey },
      ),
    invalidates: [
      queryKeys.workflow.inbox(tenantId),
      queryKeys.workflow.mine(tenantId),
      queryKeys.workflow.instance(tenantId, instanceId),
    ],
  });
}
