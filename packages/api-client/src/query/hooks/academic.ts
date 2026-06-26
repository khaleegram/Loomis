import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AcademicTermListResponse,
  AcademicTermResponse,
  AcademicYearListResponse,
  AcademicYearResponse,
  CreatePsfAdjustmentRequest,
  EnrollmentSnapshotResponse,
  PlatformBillingPreviewResponse,
  PsfAdjustmentRequestListResponse,
  PsfAdjustmentRequestResponse,
  SnapshotNowRequest,
  ClassArmResponse,
  ClassLevelListResponse,
  ClassLevelResponse,
  ClassStructureResponse,
  ConfirmPromotionRequest,
  CreateClassArmRequest,
  CreateClassLevelRequest,
  ProgressionMapResponse,
  ProgressionResponse,
  PromotionListResponse,
  CloseTermRequest,
  ConfigureTermRequest,
  CreateAcademicYearRequest,
  SetupSchoolYearRequest,
  SetupSchoolYearResponse,
  StagePromotionRequest,
  TermClosurePreviewResponse,
  StepUpAction,
  StepUpRequest,
  StepUpResponse,
  StepUpSendSmsRequest,
  StepUpSendSmsResponse,
  UpsertProgressionRequest,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import type { StepUpTokenResult } from '../../mutations/financial-mutation.js';
import { useFinancialMutation } from '../../mutations/useFinancialMutation.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { useApiClient } from '../context.js';
import {
  DASHBOARD_CONTEXT_POLL_MS,
  dashboardLiveQueryExtras,
  type QueryLiveOptions,
} from '../dashboard-live.js';
import { assertTenantScopedKey, queryKeys } from '../keys.js';

const ACADEMIC_STALE_MS = 5 * 60_000;

function invalidateAcademicQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  yearId?: string,
  termId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.academic.years(tenantId) });
  if (yearId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.academic.year(tenantId, yearId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.academic.terms(tenantId, yearId) });
  }
  if (termId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.academic.term(tenantId, termId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.academic.censusPreview(tenantId, termId),
    });
  }
}

export function academicYearsQueryOptions(client: ApiClient, tenantId: string) {
  const queryKey = queryKeys.academic.years(tenantId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<AcademicYearListResponse>(`/tenants/${tenantId}/academic-years`),
    staleTime: ACADEMIC_STALE_MS,
  };
}

export function academicYearQueryOptions(
  client: ApiClient,
  tenantId: string,
  yearId: string,
) {
  const queryKey = queryKeys.academic.year(tenantId, yearId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<AcademicYearResponse>(`/tenants/${tenantId}/academic-years/${yearId}`),
    staleTime: ACADEMIC_STALE_MS,
  };
}

export function termsQueryOptions(client: ApiClient, tenantId: string, yearId: string) {
  const queryKey = queryKeys.academic.terms(tenantId, yearId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<AcademicTermListResponse>(
        `/tenants/${tenantId}/academic-years/${yearId}/terms`,
      ),
    staleTime: ACADEMIC_STALE_MS,
  };
}

export function termQueryOptions(client: ApiClient, tenantId: string, termId: string) {
  const queryKey = queryKeys.academic.term(tenantId, termId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<AcademicTermResponse>(`/tenants/${tenantId}/terms/${termId}`),
    staleTime: ACADEMIC_STALE_MS,
  };
}

export function platformBillingPreviewQueryOptions(
  client: ApiClient,
  tenantId: string,
  termId: string,
) {
  const queryKey = queryKeys.academic.censusPreview(tenantId, termId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<PlatformBillingPreviewResponse>(
        `/tenants/${tenantId}/terms/${termId}/billing/preview`,
      ),
    staleTime: ACADEMIC_STALE_MS,
  };
}

/** @deprecated Use platformBillingPreviewQueryOptions */
export const censusPreviewQueryOptions = platformBillingPreviewQueryOptions;

export function termClosurePreviewQueryOptions(
  client: ApiClient,
  tenantId: string,
  termId: string,
) {
  const queryKey = queryKeys.academic.closurePreview(tenantId, termId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<TermClosurePreviewResponse>(
        `/tenants/${tenantId}/terms/${termId}/closure-preview`,
      ),
    staleTime: 30_000,
  };
}

/** Lists academic years for the tenant (US-ASM-001). */
export function useAcademicYears(tenantId: string, options?: QueryLiveOptions) {
  const client = useApiClient();
  return useQuery({
    ...academicYearsQueryOptions(client, tenantId),
    enabled: Boolean(tenantId),
    ...dashboardLiveQueryExtras(options?.live, DASHBOARD_CONTEXT_POLL_MS),
  });
}

/** Terms for an academic year (US-ASM-002). */
export function useAcademicTerms(
  tenantId: string,
  yearId: string,
  options?: QueryLiveOptions,
) {
  const client = useApiClient();
  return useQuery({
    ...termsQueryOptions(client, tenantId, yearId),
    enabled: Boolean(tenantId && yearId),
    ...dashboardLiveQueryExtras(options?.live, DASHBOARD_CONTEXT_POLL_MS),
  });
}

/** Single term detail. */
export function useAcademicTerm(tenantId: string, termId: string) {
  const client = useApiClient();
  return useQuery({
    ...termQueryOptions(client, tenantId, termId),
    enabled: Boolean(tenantId && termId),
  });
}

/** Platform billing preview (US-ASM-003). */
export function usePlatformBillingPreview(
  tenantId: string,
  termId: string,
  options?: QueryLiveOptions,
) {
  const client = useApiClient();
  return useQuery({
    ...platformBillingPreviewQueryOptions(client, tenantId, termId),
    enabled: Boolean(tenantId && termId),
    ...dashboardLiveQueryExtras(options?.live),
  });
}

/** @deprecated Use usePlatformBillingPreview */
export const useCensusPreview = usePlatformBillingPreview;

/** Pre-close term gate review (US-ASM-004). */
export function useTermClosurePreview(tenantId: string, termId: string, enabled = true) {
  const client = useApiClient();
  return useQuery({
    ...termClosurePreviewQueryOptions(client, tenantId, termId),
    enabled: Boolean(tenantId && termId && enabled),
  });
}

export function classLevelsQueryOptions(client: ApiClient, tenantId: string) {
  const queryKey = queryKeys.academic.classLevels(tenantId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<ClassLevelListResponse>(`/tenants/${tenantId}/class-levels`),
    staleTime: ACADEMIC_STALE_MS,
  };
}

export function classStructureQueryOptions(
  client: ApiClient,
  tenantId: string,
  yearId: string,
) {
  const queryKey = queryKeys.academic.classStructure(tenantId, yearId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<ClassStructureResponse>(
        `/tenants/${tenantId}/academic-years/${yearId}/class-structure`,
      ),
    staleTime: ACADEMIC_STALE_MS,
  };
}

/** Class levels for admission forms (FR-ASM-009). */
export function useClassLevels(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    ...classLevelsQueryOptions(client, tenantId),
    enabled: Boolean(tenantId),
  });
}

/** Class structure (levels + arms) for an academic year. */
export function useClassStructure(tenantId: string, yearId: string) {
  const client = useApiClient();
  return useQuery({
    ...classStructureQueryOptions(client, tenantId, yearId),
    enabled: Boolean(tenantId && yearId),
  });
}

/** Issues a step-up MFA proof for a high-risk action. */
export function useStepUpMfa() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (body: StepUpRequest) =>
      client.post<StepUpResponse>('/auth/stepup', body),
  });
}

/** Dispatches an SMS OTP for Core tier step-up actions. */
export function useSendStepUpSms() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (body: StepUpSendSmsRequest) =>
      client.post<StepUpSendSmsResponse>('/auth/stepup/sms/send', body),
  });
}

/** Creates a school year in one step — active year, terms, current term live (US-ASM-001/002). */
export function useSetupSchoolYear(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SetupSchoolYearRequest) =>
      client.post<SetupSchoolYearResponse>(`/tenants/${tenantId}/academic-years/setup`, body),
    onSuccess: () => invalidateAcademicQueries(queryClient, tenantId),
  });
}

/** Finishes a legacy draft school year with auto-configured terms. */
export function useFinalizeSchoolYear(tenantId: string, yearId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      client.post<SetupSchoolYearResponse>(
        `/tenants/${tenantId}/academic-years/${yearId}/finalize`,
      ),
    onSuccess: () => invalidateAcademicQueries(queryClient, tenantId, yearId),
  });
}

/** Creates a draft academic year (US-ASM-001). */
export function useCreateAcademicYear(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAcademicYearRequest) =>
      client.post<AcademicYearResponse>(`/tenants/${tenantId}/academic-years`, body),
    onSuccess: () => invalidateAcademicQueries(queryClient, tenantId),
  });
}

/** Activates a draft academic year — irreversible (US-ASM-001). */
export function useActivateAcademicYear(tenantId: string, yearId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      client.post<AcademicYearResponse>(
        `/tenants/${tenantId}/academic-years/${yearId}/activate`,
      ),
    onSuccess: () => invalidateAcademicQueries(queryClient, tenantId, yearId),
  });
}

/** Configures a draft term (US-ASM-002). */
export function useConfigureTerm(tenantId: string, yearId: string, termId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ConfigureTermRequest) =>
      client.patch<AcademicTermResponse>(`/tenants/${tenantId}/terms/${termId}`, body),
    onSuccess: () => invalidateAcademicQueries(queryClient, tenantId, yearId, termId),
  });
}

/** Opens a configured draft term (US-ASM-002). */
export function useOpenTerm(tenantId: string, yearId: string, termId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      client.post<AcademicTermResponse>(`/tenants/${tenantId}/terms/${termId}/open`),
    onSuccess: () => invalidateAcademicQueries(queryClient, tenantId, yearId, termId),
  });
}

/** Closes a census-locked term (US-ASM-004). */
export function useCloseTerm(tenantId: string, yearId: string, termId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CloseTermRequest) =>
      client.post<AcademicTermResponse>(`/tenants/${tenantId}/terms/${termId}/close`, body),
    onSuccess: () => invalidateAcademicQueries(queryClient, tenantId, yearId, termId),
  });
}

export interface UseSnapshotNowConfig {
  tenantId: string;
  yearId: string;
  termId: string;
}

/** Takes an early billing snapshot (Owner only, US-ASM-003). */
export function useSnapshotNow(config: UseSnapshotNowConfig) {
  const { tenantId, yearId, termId } = config;
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SnapshotNowRequest) =>
      client.post<EnrollmentSnapshotResponse>(
        `/tenants/${tenantId}/terms/${termId}/billing/snapshot-now`,
        body,
      ),
    onSuccess: () => invalidateAcademicQueries(queryClient, tenantId, yearId, termId),
  });
}

export function useBillingAdjustments(tenantId: string, termId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['billing', 'adjustments', tenantId, termId],
    queryFn: () =>
      client.get<PsfAdjustmentRequestListResponse>(
        `/tenants/${tenantId}/terms/${termId}/billing/adjustments`,
      ),
    enabled: Boolean(tenantId && termId),
    staleTime: ACADEMIC_STALE_MS,
  });
}

export function useRequestBillingAdjustment(tenantId: string, termId: string, yearId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePsfAdjustmentRequest) =>
      client.post<PsfAdjustmentRequestResponse>(
        `/tenants/${tenantId}/terms/${termId}/billing/adjustments`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing', 'adjustments', tenantId, termId] });
      invalidateAcademicQueries(queryClient, tenantId, yearId, termId);
    },
  });
}

export function progressionsQueryOptions(client: ApiClient, tenantId: string) {
  const queryKey = queryKeys.academic.progressions(tenantId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<ProgressionMapResponse>(`/tenants/${tenantId}/class-progression`),
    staleTime: ACADEMIC_STALE_MS,
  };
}

/** Class progression map for year-end promotions (FR-ASM-009). */
export function useProgressions(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    ...progressionsQueryOptions(client, tenantId),
    enabled: Boolean(tenantId),
  });
}

/** Create a class level (FR-ASM-009). */
export function useCreateClassLevel(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateClassLevelRequest) =>
      client.post<ClassLevelResponse>(`/tenants/${tenantId}/class-levels`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.academic.classLevels(tenantId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.academic.all(tenantId) });
    },
  });
}

/** Create a class arm for an academic year (FR-ASM-009). */
export function useCreateClassArm(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateClassArmRequest) =>
      client.post<ClassArmResponse>(`/tenants/${tenantId}/class-arms`, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.academic.classStructure(tenantId, variables.academicYearId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.academic.all(tenantId) });
    },
  });
}

/** Upsert a progression map entry (FR-ASM-009). */
export function useUpsertProgression(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertProgressionRequest) =>
      client.put<ProgressionResponse>(`/tenants/${tenantId}/class-progression`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.academic.progressions(tenantId) });
    },
  });
}

/** List promotion records for a closing year (FR-ASM-007). */
export function usePromotions(tenantId: string, yearId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.academic.promotions(tenantId, yearId),
    queryFn: () =>
      client.get<PromotionListResponse>(`/tenants/${tenantId}/academic-years/${yearId}/promotions`),
    staleTime: ACADEMIC_STALE_MS,
    enabled: Boolean(tenantId && yearId),
  });
}

/** Stage the year-end promotion list (FR-ASM-007). */
export function useStagePromotion(tenantId: string) {
  return useIdempotentMutation<StagePromotionRequest, PromotionListResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<PromotionListResponse>(`/tenants/${tenantId}/promotions`, body, {
        idempotencyKey,
      }),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}

/** Confirm staged promotions — Principal / School Owner only (FR-ASM-007). */
export function useConfirmPromotion(tenantId: string) {
  return useIdempotentMutation<ConfirmPromotionRequest, { confirmed: true }>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post(`/tenants/${tenantId}/promotions/confirm`, body, { idempotencyKey }),
    invalidates: [queryKeys.academic.all(tenantId), queryKeys.students.all(tenantId)],
  });
}
