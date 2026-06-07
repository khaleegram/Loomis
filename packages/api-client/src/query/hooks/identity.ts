import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DeregisterDeviceRequest,
  DeviceListResponse,
  RevokeSessionRequest,
  SessionListResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { queryKeys } from '../keys.js';

const SESSIONS_STALE_MS = 60_000;
const DEVICES_STALE_MS = 60_000;

export function sessionsQueryOptions(client: ApiClient) {
  return {
    queryKey: queryKeys.identity.sessions(),
    queryFn: () => client.get<SessionListResponse>('/identity/sessions'),
    staleTime: SESSIONS_STALE_MS,
  };
}

export function devicesQueryOptions(client: ApiClient) {
  return {
    queryKey: queryKeys.identity.devices(),
    queryFn: () => client.get<DeviceListResponse>('/identity/devices'),
    staleTime: DEVICES_STALE_MS,
  };
}

/** Lists the caller's active sessions (US-HRM-008). */
export function useSessions() {
  const client = useApiClient();
  return useQuery(sessionsQueryOptions(client));
}

/** Lists the caller's registered devices (US-HRM-008). */
export function useDevices() {
  const client = useApiClient();
  return useQuery(devicesQueryOptions(client));
}

/** Revokes an active session (US-HRM-008). */
export function useRevokeSession() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RevokeSessionRequest) =>
      client.post<void>('/identity/sessions/revoke', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.identity.sessions() });
    },
  });
}

/** Deregisters a device (US-HRM-008). */
export function useDeregisterDevice() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DeregisterDeviceRequest) =>
      client.post<void>('/identity/devices/deregister', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.identity.devices() });
    },
  });
}
