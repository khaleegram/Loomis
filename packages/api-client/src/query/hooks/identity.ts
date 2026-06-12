import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ChangePasswordRequest,
  DeregisterDeviceRequest,
  DeviceListResponse,
  MyProfileResponse,
  RevokeSessionRequest,
  SessionListResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { queryKeys } from '../keys.js';

const SESSIONS_STALE_MS = 60_000;
const DEVICES_STALE_MS = 60_000;
const MY_PROFILE_STALE_MS = 30_000;

export function myProfileQueryOptions(client: ApiClient) {
  return {
    queryKey: queryKeys.identity.myProfile(),
    queryFn: () => client.get<MyProfileResponse>('/identity/me/profile'),
    staleTime: MY_PROFILE_STALE_MS,
  };
}

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

/** Fetches the caller's profile (displayName, email, photoStorageObjectId). */
export function useMyProfile() {
  const client = useApiClient();
  return useQuery(myProfileQueryOptions(client));
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

/** Updates the caller's display name and/or email. */
export function useUpdateProfile() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) =>
      client.patch<UpdateProfileResponse>('/identity/me/profile', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.identity.sessions() });
    },
  });
}

/** Changes the caller's password. Requires current password. */
export function useChangePassword() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) =>
      client.post<void>('/auth/change-password', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.identity.sessions() });
    },
  });
}
