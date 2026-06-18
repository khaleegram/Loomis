// @ts-nocheck
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  SendAnnouncementRequest,
  SendClassMessageRequest,
  SendStudentParentMessageRequest,
  MessageResponse,
  NotificationResponse,
  RegisterPushSubscriptionRequest,
  PushSubscriptionResponse,
  WebPushConfigResponse,
} from '@loomis/contracts';
import type { RegisterWebDeviceResponse } from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { useApiClient } from '../context.js';
import { assertTenantScopedKey, queryKeys } from '../keys.js';

const STALE_MS = 15_000;

interface NotificationListResponse {
  notifications: NotificationResponse[];
}

async function fetchNotifications(client: ApiClient, tenantId: string): Promise<NotificationListResponse> {
  const data = await client.get<NotificationResponse[]>(`/tenants/${tenantId}/comms/notifications`);
  return { notifications: Array.isArray(data) ? data : [] };
}

// ── Announcements & Messages ────────────────────────────────────────────────────

export function useNotifications(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.comms.notifications(tenantId),
    queryFn: () => fetchNotifications(client, tenantId),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId),
  });
}

/** Aggregates in-app notifications across multiple linked schools (parent US-COM-003). */
export function useParentInboxNotifications(tenantIds: string[]) {
  const client = useApiClient();
  const uniqueTenantIds = [...new Set(tenantIds.filter(Boolean))];

  const queries = useQueries({
    queries: uniqueTenantIds.map((tenantId) => ({
      queryKey: queryKeys.comms.notifications(tenantId),
      queryFn: () => fetchNotifications(client, tenantId),
      staleTime: STALE_MS,
      enabled: Boolean(tenantId),
    })),
  });

  const notifications = uniqueTenantIds.flatMap((tenantId, index) => {
    const rows = queries[index]?.data?.notifications ?? [];
    return rows.map((notification) => ({
      ...notification,
      tenantId: notification.tenantId ?? tenantId,
    }));
  });

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    notifications,
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
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

export function useSendStudentParentMessage(tenantId: string) {
  return useIdempotentMutation<SendStudentParentMessageRequest, MessageResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<MessageResponse>(`/tenants/${tenantId}/comms/messages/student-parents`, body, {
        idempotencyKey,
      }),
    invalidates: [queryKeys.comms.all(tenantId)],
  });
}

export function useMessageThread(tenantId: string, threadId: string | null) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.comms.thread(tenantId, threadId ?? ''),
    queryFn: async () => {
      const messages = await client.get<MessageResponse[]>(
        `/tenants/${tenantId}/comms/threads/${threadId}`,
      );
      return { messages: Array.isArray(messages) ? messages : [] };
    },
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && threadId),
  });
}

export function useMarkNotificationRead(tenantId: string) {
  return useIdempotentMutation<{ notificationId: string }, void>({
    mutationFn: (client, body) =>
      client.post(`/tenants/${tenantId}/comms/notifications/${body.notificationId}/read`, {}),
    invalidates: [queryKeys.comms.all(tenantId)],
  });
}

/** Mark read for any linked school tenant (parent unified inbox). */
export function useMarkAnyNotificationRead() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { tenantId: string; notificationId: string }) =>
      client.post(`/tenants/${input.tenantId}/comms/notifications/${input.notificationId}/read`, {}),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comms.all(input.tenantId) });
    },
  });
}

export function useMessage(tenantId: string, messageId: string | null) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.comms.message(tenantId, messageId ?? ''),
    queryFn: () => client.get<MessageResponse>(`/tenants/${tenantId}/comms/messages/${messageId}`),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && messageId),
  });
}

export function useReplyToMessage(tenantId: string) {
  return useIdempotentMutation<{ messageId: string; body: string }, MessageResponse>({
    mutationFn: (client, input, idempotencyKey) =>
      client.post<MessageResponse>(
        `/tenants/${tenantId}/comms/messages/${input.messageId}/replies`,
        { body: input.body },
        { idempotencyKey },
      ),
    invalidates: [queryKeys.comms.all(tenantId)],
  });
}

export function useWebPushConfig() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['comms', 'push', 'config'] as const,
    queryFn: () => client.get<WebPushConfigResponse>('/comms/push/config'),
    staleTime: STALE_MS,
  });
}

export function useRegisterWebDevice() {
  return useIdempotentMutation<{ deviceFingerprint: string }, RegisterWebDeviceResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<RegisterWebDeviceResponse>('/identity/devices/register-web', body, {
        idempotencyKey,
      }),
  });
}

export function useRegisterPushSubscription() {
  return useIdempotentMutation<RegisterPushSubscriptionRequest, PushSubscriptionResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<PushSubscriptionResponse>('/comms/push-subscriptions', body, { idempotencyKey }),
  });
}
