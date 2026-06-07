// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import type {
  SendAnnouncementRequest,
  SendClassMessageRequest,
  MessageResponse,
  NotificationResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { useApiClient } from '../context.js';
import { assertTenantScopedKey, queryKeys } from '../keys.js';

const STALE_MS = 15_000;

interface NotificationListResponse {
  notifications: NotificationResponse[];
}

interface MessageListResponse {
  messages: MessageResponse[];
}

// ── Announcements & Messages ────────────────────────────────────────────────────

export function useNotifications(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.comms.notifications(tenantId),
    queryFn: () =>
      client.get<NotificationListResponse>(`/tenants/${tenantId}/comms/notifications`),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId),
  });
}

export function useSendAnnouncement(tenantId: string) {
  return useIdempotentMutation<SendAnnouncementRequest, MessageResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<MessageResponse>(`/tenants/${tenantId}/comms/announcements`, body, { idempotencyKey }),
    invalidates: [queryKeys.comms.all(tenantId)],
  });
}

export function useSendClassMessage(tenantId: string) {
  return useIdempotentMutation<SendClassMessageRequest, MessageResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<MessageResponse>(`/tenants/${tenantId}/comms/messages/class`, body, { idempotencyKey }),
    invalidates: [queryKeys.comms.all(tenantId)],
  });
}

export function useMessageThread(tenantId: string, messageId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.comms.thread(tenantId, messageId),
    queryFn: () =>
      client.get<ThreadResponse>(`/tenants/${tenantId}/comms/messages/${messageId}`),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && messageId),
  });
}

export function useMarkNotificationRead(tenantId: string) {
  return useIdempotentMutation<{ notificationId: string }, void>({
    mutationFn: (client, body) =>
      client.post(`/tenants/${tenantId}/comms/notifications/${body.notificationId}/read`, {}),
    invalidates: [queryKeys.comms.all(tenantId)],
  });
}
