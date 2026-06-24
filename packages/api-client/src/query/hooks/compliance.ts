import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AcknowledgeBreachRequest,
  BreachRecordResponse,
  ComplianceDashboardResponse,
  ConsentVersionResponse,
  CreateBreachRecordRequest,
  CreateConsentVersionRequest,
  CreateDsarRequest,
  DsarResponse,
  NdpcNotificationDraft,
  RecordNdpcNotificationRequest,
  RespondDsarRequest,
  RetentionScheduleResponse,
  UpdateBreachRecordRequest,
  UpdateDsarRequest,
  UpdateRetentionScheduleRequest,
} from '@loomis/contracts';
import { useApiClient } from '../context.js';
import { dashboardLiveQueryExtras, type QueryLiveOptions } from '../dashboard-live.js';
import { queryKeys } from '../keys.js';
import type { BreachListFilters, DsarListFilters } from '../keys.js';

const COMPLIANCE_STALE_MS = 20_000;

export function useComplianceDashboard() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.compliance.dashboard(),
    queryFn: () => client.get<ComplianceDashboardResponse>('/compliance/dashboard'),
    staleTime: COMPLIANCE_STALE_MS,
  });
}

export function useDsars(filters?: DsarListFilters, options?: QueryLiveOptions) {
  const client = useApiClient();
  const qs = filters?.status ? `?status=${encodeURIComponent(filters.status)}` : '';
  return useQuery({
    queryKey: queryKeys.compliance.dsars(filters ?? {}),
    queryFn: () => client.get<DsarResponse[]>(`/compliance/dsars${qs}`),
    staleTime: COMPLIANCE_STALE_MS,
    ...dashboardLiveQueryExtras(options?.live),
  });
}

export function useDsar(dsarId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.compliance.dsar(dsarId),
    queryFn: () => client.get<DsarResponse>(`/compliance/dsars/${dsarId}`),
    staleTime: COMPLIANCE_STALE_MS,
    enabled: Boolean(dsarId),
  });
}

export function useCreateDsar() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDsarRequest) => client.post<DsarResponse>('/compliance/dsars', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dsars() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dashboard() });
    },
  });
}

export function useUpdateDsar(dsarId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDsarRequest) =>
      client.patch<DsarResponse>(`/compliance/dsars/${dsarId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dsars() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dsar(dsarId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dashboard() });
    },
  });
}

export function useCollectDsarData(dsarId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post<{ collected: boolean }>(`/compliance/dsars/${dsarId}/collect`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dsar(dsarId) });
    },
  });
}

export function useRespondDsar(dsarId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RespondDsarRequest) =>
      client.post<DsarResponse>(`/compliance/dsars/${dsarId}/respond`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dsars() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dsar(dsarId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dashboard() });
    },
  });
}

export function useBreaches(filters?: BreachListFilters) {
  const client = useApiClient();
  const qs = filters?.status ? `?status=${encodeURIComponent(filters.status)}` : '';
  return useQuery({
    queryKey: queryKeys.compliance.breaches(filters ?? {}),
    queryFn: () => client.get<BreachRecordResponse[]>(`/compliance/breaches${qs}`),
    staleTime: COMPLIANCE_STALE_MS,
  });
}

export function useBreach(breachId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.compliance.breach(breachId),
    queryFn: () => client.get<BreachRecordResponse>(`/compliance/breaches/${breachId}`),
    staleTime: COMPLIANCE_STALE_MS,
    enabled: Boolean(breachId),
  });
}

export function useCreateBreach() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBreachRecordRequest) =>
      client.post<BreachRecordResponse>('/compliance/breaches', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.breaches() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dashboard() });
    },
  });
}

export function useUpdateBreach(breachId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBreachRecordRequest) =>
      client.patch<BreachRecordResponse>(`/compliance/breaches/${breachId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.breaches() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.breach(breachId) });
    },
  });
}

export function useAcknowledgeBreach(breachId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AcknowledgeBreachRequest) =>
      client.post<BreachRecordResponse>(`/compliance/breaches/${breachId}/acknowledge`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.breaches() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.breach(breachId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dashboard() });
    },
  });
}

export function useNdpcDraft(breachId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...queryKeys.compliance.breach(breachId), 'ndpc-draft'] as const,
    queryFn: () =>
      client.get<NdpcNotificationDraft>(`/compliance/breaches/${breachId}/ndpc-draft`),
    enabled: Boolean(breachId),
  });
}

export function useRecordNdpcNotification(breachId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordNdpcNotificationRequest) =>
      client.post<BreachRecordResponse>(
        `/compliance/breaches/${breachId}/ndpc-notification`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.breaches() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.breach(breachId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dashboard() });
    },
  });
}

export function useConsentVersions() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.compliance.consentVersions(),
    queryFn: () => client.get<ConsentVersionResponse[]>('/compliance/consent-versions'),
    staleTime: COMPLIANCE_STALE_MS,
  });
}

export function usePublishConsentVersion() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateConsentVersionRequest) =>
      client.post<ConsentVersionResponse>('/compliance/consent-versions', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.consentVersions() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dashboard() });
    },
  });
}

export function useRetentionSchedules() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.compliance.retentionSchedules(),
    queryFn: () => client.get<RetentionScheduleResponse[]>('/compliance/retention-schedules'),
    staleTime: COMPLIANCE_STALE_MS,
  });
}

export function useUpdateRetentionSchedule(scheduleId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateRetentionScheduleRequest) =>
      client.patch<RetentionScheduleResponse>(
        `/compliance/retention-schedules/${scheduleId}`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.retentionSchedules() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.dashboard() });
    },
  });
}
