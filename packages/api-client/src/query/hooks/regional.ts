import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateSubordinateRequest,
  EarningEntryResponse,
  EarningsSummaryResponse,
  ParticipantResponse,
  PayoutCycleResponse,
  ProvisionTenantRequest,
  ReferralCodeSummaryResponse,
  RegionalAnalyticsDashboardResponse,
  TenantResponse,
} from '@loomis/contracts';
import { useApiClient } from '../context.js';
import { dashboardLiveQueryExtras, type QueryLiveOptions } from '../dashboard-live.js';
import { queryKeys } from '../keys.js';

const REGIONAL_STALE_MS = 30_000;

export function useRegionalAnalytics(region?: string, options?: QueryLiveOptions) {
  const client = useApiClient();
  const qs = region ? `?region=${encodeURIComponent(region)}` : '';
  return useQuery({
    queryKey: queryKeys.regional.analytics(region),
    queryFn: () => client.get<RegionalAnalyticsDashboardResponse>(`/regional/analytics${qs}`),
    staleTime: REGIONAL_STALE_MS,
    ...dashboardLiveQueryExtras(options?.live),
  });
}

export function useMyReferralParticipant() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.regional.participant(),
    queryFn: () => client.get<ParticipantResponse>('/platform/referral/participants/me'),
    staleTime: REGIONAL_STALE_MS,
  });
}

export function useEnsureMyReferralParticipant() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post<ParticipantResponse>('/platform/referral/participants/me/ensure'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.regional.participant() });
    },
  });
}

export function useRegionalSubordinates() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.regional.subordinates(),
    queryFn: () => client.get<ParticipantResponse[]>('/platform/referral/participants/subordinates'),
    staleTime: REGIONAL_STALE_MS,
  });
}

export function useCreateSubordinate() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubordinateRequest) =>
      client.post<ParticipantResponse>('/platform/referral/participants/subordinates', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.regional.subordinates() });
    },
  });
}

export function useMyReferralCode() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.regional.referralCode(),
    queryFn: () => client.get<ReferralCodeSummaryResponse>('/platform/referral/codes/me'),
    staleTime: REGIONAL_STALE_MS,
  });
}

export function useMyEarnings() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.regional.earnings(),
    queryFn: () => client.get<EarningEntryResponse[]>('/platform/referral/earnings/me'),
    staleTime: REGIONAL_STALE_MS,
  });
}

export function useMyEarningsSummary() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.regional.earningsSummary(),
    queryFn: () =>
      client.get<EarningsSummaryResponse>('/platform/referral/earnings/me/summary'),
    staleTime: REGIONAL_STALE_MS,
  });
}

export function useRegionalPayoutCycles() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.regional.payoutCycles(),
    queryFn: () => client.get<PayoutCycleResponse[]>('/platform/referral/payout-cycles'),
    staleTime: REGIONAL_STALE_MS,
  });
}

export function useRegionalProvisionTenant() {
  const client = useApiClient();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: ProvisionTenantRequest;
      idempotencyKey: string;
    }) => client.post<TenantResponse>('/tenants', body, { idempotencyKey }),
  });
}

export function usePlatformTiersForRegional() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.platform.tiers(),
    queryFn: () =>
      client.get<{ tiers: import('@loomis/contracts').TierSummary[] }>('/platform/tiers'),
    staleTime: 5 * 60_000,
  });
}

export function useRegionalProvisionDraft() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.regional.provisionDraft(),
    queryFn: () =>
      client.get<import('@loomis/contracts').ProvisionDraftResponse | null>(
        '/regional/provision-drafts/me',
      ),
    staleTime: 10_000,
  });
}

export function useUpsertRegionalProvisionDraft() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: import('@loomis/contracts').UpsertProvisionDraftRequest) =>
      client.put<import('@loomis/contracts').ProvisionDraftResponse>(
        '/regional/provision-drafts/me',
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.regional.provisionDraft() });
    },
  });
}

export function useClearRegionalProvisionDraft() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.delete<{ status: 'cleared' }>('/regional/provision-drafts/me'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.regional.provisionDraft() });
    },
  });
}
