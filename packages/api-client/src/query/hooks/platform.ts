import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BreakGlassSessionResponse,
  DecidePrivilegedChangeRequest,
  IvpAnomalyCaseResponse,
  IvpCasesListResponse,
  PlatformRevenueChartResponse,
  PlatformRevenueSummaryResponse,
  PrivilegedChangeResponse,
  ProvisionTenantRequest,
  ReferralParticipantsListResponse,
  RequestPsfRateOverrideRequest,
  StartBreakGlassRequest,
  SuspendTenantRequest,
  TenantListResponse,
  TenantResponse,
  TierListResponse,
  UpdateIvpCaseRequest,
} from '@loomis/contracts';
import { useApiClient } from '../context.js';
import { queryKeys } from '../keys.js';
import type { StepUpTokenResult } from '../../mutations/financial-mutation.js';
import { useFinancialMutation } from '../../mutations/useFinancialMutation.js';
import type { StepUpAction } from '@loomis/contracts';

const PLATFORM_STALE_MS = 30_000;

// ── Revenue dashboard ──────────────────────────────────────────────────────────

export function usePlatformRevenueSummary() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.platform.revenueSummary(),
    queryFn: () => client.get<PlatformRevenueSummaryResponse>('/platform/ledger/revenue/summary'),
    staleTime: PLATFORM_STALE_MS,
  });
}

export function usePlatformRevenueChart(period: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.platform.revenueChart(period),
    queryFn: () =>
      client.get<PlatformRevenueChartResponse>(`/platform/ledger/revenue/chart?period=${period}`),
    staleTime: PLATFORM_STALE_MS,
    enabled: Boolean(period),
  });
}

// ── Tenants ────────────────────────────────────────────────────────────────────

export function usePlatformTenants() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.platform.tenants(),
    queryFn: () => client.get<TenantListResponse>('/platform/tenants'),
    staleTime: PLATFORM_STALE_MS,
  });
}

export function usePlatformTenant(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.platform.tenant(tenantId),
    queryFn: () => client.get<TenantResponse>(`/platform/tenants/${tenantId}`),
    staleTime: PLATFORM_STALE_MS,
    enabled: Boolean(tenantId),
  });
}

export function usePlatformTiers() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.platform.tiers(),
    queryFn: () => client.get<TierListResponse>('/platform/tiers'),
    staleTime: 5 * 60_000,
  });
}

export function useProvisionTenant() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: ProvisionTenantRequest;
      idempotencyKey: string;
    }) =>
      client.post<TenantResponse>('/platform/tenants', body, { idempotencyKey }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants() });
    },
  });
}

export function useSuspendTenant(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: SuspendTenantRequest;
      idempotencyKey: string;
    }) =>
      client.post<TenantResponse>(`/platform/tenants/${tenantId}/suspend`, body, {
        idempotencyKey,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenant(tenantId) });
    },
  });
}

export function useReinstateTenant(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: { reason?: string };
      idempotencyKey: string;
    }) =>
      client.post<TenantResponse>(`/platform/tenants/${tenantId}/reinstate`, body, {
        idempotencyKey,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenant(tenantId) });
    },
  });
}

// ── PSF rates ──────────────────────────────────────────────────────────────────

export function usePlatformPsfRates() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.platform.psfRates(),
    queryFn: () =>
      client.get<{ snapshots: import('@loomis/contracts').PsfRateSnapshotResponse[] }>(
        '/platform/psf-rates',
      ),
    staleTime: PLATFORM_STALE_MS,
  });
}

export function usePsfRateHistory(tenantId: string | null) {
  const client = useApiClient();
  const endpoint = tenantId
    ? `/platform/tenants/${tenantId}/psf-rate/history`
    : '/platform/psf-rates/global/history';
  return useQuery({
    queryKey: queryKeys.platform.psfRateHistory(tenantId),
    queryFn: () =>
      client.get<{ snapshots: import('@loomis/contracts').PsfRateSnapshotResponse[] }>(endpoint),
    staleTime: PLATFORM_STALE_MS,
  });
}

export interface UseRequestPsfRateOverrideConfig {
  tenantId: string;
  ensureStepUpToken: (action: StepUpAction) => Promise<StepUpTokenResult>;
}

export function useRequestPsfRateOverride(config: UseRequestPsfRateOverrideConfig) {
  const { tenantId, ensureStepUpToken } = config;
  return useFinancialMutation<RequestPsfRateOverrideRequest, { id: string }>({
    endpoint: `/platform/tenants/${tenantId}/psf-rate/override-requests`,
    action: 'psf_rate_change',
    ensureStepUpToken,
    invalidates: [
      queryKeys.platform.psfRates(),
      queryKeys.platform.psfRateHistory(tenantId),
      queryKeys.platform.privilegedChanges(),
    ],
  });
}

// ── IVP Risk cases ─────────────────────────────────────────────────────────────

export function usePlatformRiskCases(filters?: { status?: string; priority?: string }) {
  const client = useApiClient();
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  const qs = params.toString();
  return useQuery({
    queryKey: queryKeys.platform.riskCases(filters),
    queryFn: () =>
      client.get<IvpCasesListResponse>(`/platform/risk/cases${qs ? `?${qs}` : ''}`),
    staleTime: 15_000,
  });
}

export function usePlatformRiskCase(caseId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.platform.riskCase(caseId),
    queryFn: () => client.get<IvpAnomalyCaseResponse>(`/platform/risk/cases/${caseId}`),
    staleTime: 15_000,
    enabled: Boolean(caseId),
  });
}

export function useUpdateRiskCase(caseId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateIvpCaseRequest) =>
      client.patch<IvpAnomalyCaseResponse>(`/platform/risk/cases/${caseId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.riskCases() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.riskCase(caseId) });
    },
  });
}

// ── Privileged changes (dual-approval) ────────────────────────────────────────

export function usePlatformPrivilegedChanges(status?: string) {
  const client = useApiClient();
  const qs = status ? `?status=${status}` : '';
  return useQuery({
    queryKey: queryKeys.platform.privilegedChanges(status),
    queryFn: () =>
      client.get<{ changes: PrivilegedChangeResponse[]; total: number }>(
        `/platform/risk/privileged-changes${qs}`,
      ),
    staleTime: 20_000,
  });
}

export interface UseDecidePrivilegedChangeConfig {
  changeId: string;
  ensureStepUpToken: (action: StepUpAction) => Promise<StepUpTokenResult>;
}

export function useDecidePrivilegedChange(config: UseDecidePrivilegedChangeConfig) {
  const { changeId, ensureStepUpToken } = config;
  return useFinancialMutation<DecidePrivilegedChangeRequest, PrivilegedChangeResponse>({
    endpoint: `/platform/risk/privileged-changes/${changeId}/decide`,
    action: 'psf_rate_change',
    ensureStepUpToken,
    invalidates: [
      queryKeys.platform.privilegedChanges(),
      queryKeys.platform.privilegedChange(changeId),
      queryKeys.platform.psfRates(),
    ],
  });
}

// ── Break-glass (US-PLT-006) ──────────────────────────────────────────────────

export function useStartBreakGlass() {
  const client = useApiClient();
  return useMutation({
    mutationFn: ({
      body,
      mfaToken,
      idempotencyKey,
    }: {
      body: StartBreakGlassRequest;
      mfaToken: string;
      idempotencyKey: string;
    }) =>
      client.post<BreakGlassSessionResponse>('/platform/risk/break-glass', body, {
        idempotencyKey,
        mfaToken,
      }),
  });
}

// ── Referrals (US-PLT-007 / US-REV-006) ───────────────────────────────────────

export function usePlatformReferralParticipants() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.platform.referralParticipants(),
    queryFn: () =>
      client.get<ReferralParticipantsListResponse>('/platform/referrals/participants'),
    staleTime: PLATFORM_STALE_MS,
  });
}

export function usePlatformPayoutCycles() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.platform.payoutCycles(),
    queryFn: () =>
      client.get<{ cycles: import('@loomis/contracts').PayoutCycleResponse[] }>(
        '/platform/referrals/payout-cycles',
      ),
    staleTime: PLATFORM_STALE_MS,
  });
}
