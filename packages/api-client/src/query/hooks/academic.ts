import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AcademicTermListResponse,
  AcademicTermResponse,
  AcademicYearListResponse,
  AcademicYearResponse,
  CensusLockRequest,
  CensusLockResponse,
  CensusPreviewResponse,
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
  StagePromotionRequest,
  StepUpAction,
  StepUpRequest,
  StepUpResponse,
  UpsertProgressionRequest,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import type { StepUpTokenResult } from '../../mutations/financial-mutation.js';
import { useFinancialMutation } from '../../mutations/useFinancialMutation.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { useApiClient } from '../context.js';
import { assertTenantScopedKey, queryKeys } from '../keys.js';

const ACADEMIC_STALE_MS = 30_000;

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

export function censusPreviewQueryOptions(
  client: ApiClient,
  tenantId: string,
  termId: string,
) {
  const queryKey = queryKeys.academic.censusPreview(tenantId, termId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<CensusPreviewResponse>(
        `/tenants/${tenantId}/terms/${termId}/census/preview`,
      ),
    staleTime: ACADEMIC_STALE_MS,
  };
}

/** Lists academic years for the tenant (US-ASM-001). */
export function useAcademicYears(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    ...academicYearsQueryOptions(client, tenantId),
    enabled: Boolean(tenantId),
  });
}

/** Terms for an academic year (US-ASM-002). */
export function useAcademicTerms(tenantId: string, yearId: string) {
  const client = useApiClient();
  return useQuery({
    ...termsQueryOptions(client, tenantId, yearId),
    enabled: Boolean(tenantId && yearId),
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

/** Pre-lock census review (US-ASM-003). */
export function useCensusPreview(tenantId: string, termId: string) {
  const client = useApiClient();
  return useQuery({
    ...censusPreviewQueryOptions(client, tenantId, termId),
    enabled: Boolean(tenantId && termId),
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

export interface UseLockCensusConfig {
  tenantId: string;
  yearId: string;
  termId: string;
  ensureStepUpToken: (action: StepUpAction) => Promise<StepUpTokenResult>;
}

/** Locks the enrollment census — PSF trigger (US-ASM-003). */
export function useLockCensus(config: UseLockCensusConfig) {
  const { tenantId, yearId, termId, ensureStepUpToken } = config;
  return useFinancialMutation<CensusLockRequest, CensusLockResponse>({
    endpoint: `/tenants/${tenantId}/terms/${termId}/census/lock`,
    action: 'census_lock',
    ensureStepUpToken,
    invalidates: [
      queryKeys.academic.terms(tenantId, yearId),
      queryKeys.academic.term(tenantId, termId),
      queryKeys.academic.censusPreview(tenantId, termId),
    ],
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
