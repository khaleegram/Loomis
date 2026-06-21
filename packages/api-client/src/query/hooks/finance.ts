import { useMutation, useQuery, type QueryKey } from '@tanstack/react-query';
import type {
  AmendFeeStructureRequest,
  CreateFeeStructureRequest,
  CreateRefundRequest,
  CreateRefundResponse,
  FeeStructureAmendmentResponse,
  FeeStructureListResponse,
  FeeStructureResponse,
  InitializeOnlinePaymentRequest,
  InitializeOnlinePaymentResponse,
  InvoiceListResponse,
  InvoiceResponse,
  LogOfflinePaymentRequest,
  OutstandingBalancesResponse,
  PaymentListResponse,
  PaymentGatewayConfigResponse,
  PaymentResponse,
  ParentPaymentSendOtpResponse,
  ReconciliationExceptionListResponse,
  ReconciliationExceptionResponse,
  ResolveReconciliationExceptionRequest,
  RefundRequestListResponse,
  RefundRequestResponse,
  StepUpAction,
  UpdateFeeStructureRequest,
  VerifyOfflinePaymentRequest,
  WorkflowDecideRequest,
  WorkflowInstanceResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import type { StepUpTokenResult } from '../../mutations/financial-mutation.js';
import { useFinancialMutation } from '../../mutations/useFinancialMutation.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { useApiClient } from '../context.js';
import {
  assertTenantScopedKey,
  queryKeys,
  type OutstandingBalancesFilters,
  type PaymentsListFilters,
  type RefundsListFilters,
} from '../keys.js';

const FINANCE_STALE_MS = 25_000;

function financeInvalidation(tenantId: string, termId?: string): QueryKey[] {
  const keys: QueryKey[] = [queryKeys.finance.all(tenantId)];
  if (termId) {
    keys.push(
      queryKeys.finance.feeStructures(tenantId, termId),
      queryKeys.finance.invoices(tenantId, termId),
      queryKeys.finance.outstandingBalances(tenantId, termId),
      queryKeys.finance.payments(tenantId, { termId }),
      queryKeys.finance.refunds(tenantId, { termId }),
    );
  }
  return keys;
}

export function feeStructuresQueryOptions(client: ApiClient, tenantId: string, termId: string) {
  const queryKey = queryKeys.finance.feeStructures(tenantId, termId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<FeeStructureListResponse>(`/tenants/${tenantId}/terms/${termId}/fee-structures`),
    staleTime: FINANCE_STALE_MS,
  };
}

export function feeStructureQueryOptions(
  client: ApiClient,
  tenantId: string,
  feeStructureId: string,
) {
  const queryKey = queryKeys.finance.feeStructure(tenantId, feeStructureId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<FeeStructureResponse>(`/tenants/${tenantId}/fee-structures/${feeStructureId}`),
    staleTime: FINANCE_STALE_MS,
  };
}

export function invoicesQueryOptions(client: ApiClient, tenantId: string, termId: string) {
  const queryKey = queryKeys.finance.invoices(tenantId, termId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<InvoiceListResponse>(`/tenants/${tenantId}/terms/${termId}/invoices`),
    staleTime: FINANCE_STALE_MS,
  };
}

export function invoiceQueryOptions(client: ApiClient, tenantId: string, invoiceId: string) {
  const queryKey = queryKeys.finance.invoice(tenantId, invoiceId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () => client.get<InvoiceResponse>(`/tenants/${tenantId}/invoices/${invoiceId}`),
    staleTime: FINANCE_STALE_MS,
  };
}

export function outstandingBalancesQueryOptions(
  client: ApiClient,
  tenantId: string,
  termId: string,
  filters: OutstandingBalancesFilters = {},
) {
  const queryKey = queryKeys.finance.outstandingBalances(tenantId, termId, filters);
  assertTenantScopedKey(queryKey, tenantId);
  const params = new URLSearchParams();
  if (filters.classLevelId) params.set('classLevelId', filters.classLevelId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return {
    queryKey,
    queryFn: () =>
      client.get<OutstandingBalancesResponse>(
        `/tenants/${tenantId}/terms/${termId}/outstanding-balances${qs ? `?${qs}` : ''}`,
      ),
    staleTime: FINANCE_STALE_MS,
  };
}

export function paymentsQueryOptions(
  client: ApiClient,
  tenantId: string,
  filters: PaymentsListFilters = {},
) {
  const queryKey = queryKeys.finance.payments(tenantId, filters);
  assertTenantScopedKey(queryKey, tenantId);
  const params = new URLSearchParams();
  if (filters.termId) params.set('termId', filters.termId);
  if (filters.studentId) params.set('studentId', filters.studentId);
  if (filters.status) params.set('status', filters.status);
  if (filters.channel) params.set('channel', filters.channel);
  const qs = params.toString();
  return {
    queryKey,
    queryFn: () =>
      client.get<PaymentListResponse>(`/tenants/${tenantId}/payments${qs ? `?${qs}` : ''}`),
    staleTime: FINANCE_STALE_MS,
  };
}

export function paymentQueryOptions(client: ApiClient, tenantId: string, paymentId: string) {
  const queryKey = queryKeys.finance.payment(tenantId, paymentId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () => client.get<PaymentResponse>(`/tenants/${tenantId}/payments/${paymentId}`),
    staleTime: FINANCE_STALE_MS,
  };
}

export function refundsQueryOptions(
  client: ApiClient,
  tenantId: string,
  filters: RefundsListFilters = {},
) {
  const queryKey = queryKeys.finance.refunds(tenantId, filters);
  assertTenantScopedKey(queryKey, tenantId);
  const params = new URLSearchParams();
  if (filters.termId) params.set('termId', filters.termId);
  if (filters.paymentId) params.set('paymentId', filters.paymentId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return {
    queryKey,
    queryFn: () =>
      client.get<RefundRequestListResponse>(`/tenants/${tenantId}/refunds${qs ? `?${qs}` : ''}`),
    staleTime: FINANCE_STALE_MS,
  };
}

export function refundQueryOptions(client: ApiClient, tenantId: string, refundId: string) {
  const queryKey = queryKeys.finance.refund(tenantId, refundId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () => client.get<RefundRequestResponse>(`/tenants/${tenantId}/refunds/${refundId}`),
    staleTime: FINANCE_STALE_MS,
  };
}

export function useFeeStructures(tenantId: string, termId: string) {
  const client = useApiClient();
  return useQuery({
    ...feeStructuresQueryOptions(client, tenantId, termId),
    enabled: Boolean(tenantId && termId),
  });
}

export function useFeeStructure(tenantId: string, feeStructureId: string) {
  const client = useApiClient();
  return useQuery({
    ...feeStructureQueryOptions(client, tenantId, feeStructureId),
    enabled: Boolean(tenantId && feeStructureId),
  });
}

export function useInvoices(tenantId: string, termId: string) {
  const client = useApiClient();
  return useQuery({
    ...invoicesQueryOptions(client, tenantId, termId),
    enabled: Boolean(tenantId && termId),
  });
}

export function useInvoice(tenantId: string, invoiceId: string) {
  const client = useApiClient();
  return useQuery({
    ...invoiceQueryOptions(client, tenantId, invoiceId),
    enabled: Boolean(tenantId && invoiceId),
  });
}

export function useOutstandingBalances(
  tenantId: string,
  termId: string,
  filters: OutstandingBalancesFilters = {},
) {
  const client = useApiClient();
  return useQuery({
    ...outstandingBalancesQueryOptions(client, tenantId, termId, filters),
    enabled: Boolean(tenantId && termId),
  });
}

export function usePayments(tenantId: string, filters: PaymentsListFilters = {}) {
  const client = useApiClient();
  return useQuery({
    ...paymentsQueryOptions(client, tenantId, filters),
    enabled: Boolean(tenantId),
  });
}

export function usePayment(tenantId: string, paymentId: string) {
  const client = useApiClient();
  return useQuery({
    ...paymentQueryOptions(client, tenantId, paymentId),
    enabled: Boolean(tenantId && paymentId),
  });
}

/** Poll payment status after Paystack redirect until verified or terminal failure. */
export function usePaymentStatusPoll(tenantId: string, paymentId: string | null) {
  const client = useApiClient();
  return useQuery({
    ...paymentQueryOptions(client, tenantId, paymentId ?? ''),
    enabled: Boolean(tenantId && paymentId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === 'verified' || status === 'failed' || status === 'cancelled') {
        return false;
      }
      return 3_000;
    },
  });
}

export function usePaymentGatewayConfig() {
  const client = useApiClient();
  return useQuery<PaymentGatewayConfigResponse>({
    queryKey: ['finance', 'payment-gateway', 'config'] as const,
    queryFn: () => client.get<PaymentGatewayConfigResponse>('/finance/payment-gateway/config'),
    staleTime: 60_000,
  });
}

export function useRefunds(tenantId: string, filters: RefundsListFilters = {}) {
  const client = useApiClient();
  return useQuery({
    ...refundsQueryOptions(client, tenantId, filters),
    enabled: Boolean(tenantId),
  });
}

export function useRefund(tenantId: string, refundId: string) {
  const client = useApiClient();
  return useQuery({
    ...refundQueryOptions(client, tenantId, refundId),
    enabled: Boolean(tenantId && refundId),
  });
}

/** US-FIN-001. Create fee structure for a class level + term. */
export function useCreateFeeStructure(tenantId: string, termId: string) {
  return useIdempotentMutation<CreateFeeStructureRequest, FeeStructureResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<FeeStructureResponse>(`/tenants/${tenantId}/fee-structures`, body, {
        idempotencyKey,
      }),
    invalidates: financeInvalidation(tenantId, termId),
  });
}

/** US-FIN-001. Update draft fee structure items. */
export function useUpdateFeeStructure(
  tenantId: string,
  termId: string,
  feeStructureId: string,
) {
  return useIdempotentMutation<UpdateFeeStructureRequest, FeeStructureResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.request<FeeStructureResponse>(
        `/tenants/${tenantId}/fee-structures/${feeStructureId}`,
        { method: 'PUT', body, idempotencyKey },
      ),
    invalidates: [
      ...financeInvalidation(tenantId, termId),
      queryKeys.finance.feeStructure(tenantId, feeStructureId),
    ],
  });
}

/** US-FIN-001. Amend fee structure after term opens (Principal workflow). */
export function useAmendFeeStructure(
  tenantId: string,
  termId: string,
  feeStructureId: string,
) {
  return useIdempotentMutation<AmendFeeStructureRequest, FeeStructureAmendmentResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<FeeStructureAmendmentResponse>(
        `/tenants/${tenantId}/fee-structures/${feeStructureId}/amendments`,
        body,
        { idempotencyKey },
      ),
    invalidates: [
      ...financeInvalidation(tenantId, termId),
      queryKeys.finance.feeStructure(tenantId, feeStructureId),
      queryKeys.workflow.inbox(tenantId),
    ],
  });
}

/** US-FIN-002. Cashier logs offline payment. */
export function useLogOfflinePayment(tenantId: string, termId: string) {
  return useIdempotentMutation<LogOfflinePaymentRequest, PaymentResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<PaymentResponse>(`/tenants/${tenantId}/payments/offline`, body, {
        idempotencyKey,
      }),
    invalidates: financeInvalidation(tenantId, termId),
  });
}

/** US-FIN-003. Accountant verifies offline payment. */
export function useVerifyOfflinePayment(tenantId: string, termId: string, paymentId: string) {
  return useIdempotentMutation<VerifyOfflinePaymentRequest, PaymentResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<PaymentResponse>(
        `/tenants/${tenantId}/payments/${paymentId}/verify`,
        body,
        { idempotencyKey },
      ),
    invalidates: [
      ...financeInvalidation(tenantId, termId),
      queryKeys.finance.payment(tenantId, paymentId),
    ],
  });
}

/** Sends SMS OTP before parent online fee payment (tier plan §4). */
export function useSendParentPaymentOtp(tenantId: string) {
  const client = useApiClient();
  return useMutation({
    mutationFn: () =>
      client.post<ParentPaymentSendOtpResponse>(
        `/tenants/${tenantId}/payments/online/send-otp`,
        {},
      ),
  });
}

/** US-FIN-004 / US-PAR-004. Parent initiates online payment via gateway. */
export function useInitializeOnlinePayment(tenantId: string, termId: string, studentId: string) {
  return useIdempotentMutation<InitializeOnlinePaymentRequest, InitializeOnlinePaymentResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<InitializeOnlinePaymentResponse>(
        `/tenants/${tenantId}/payments/online/initialize`,
        body,
        { idempotencyKey },
      ),
    invalidates: [
      ...financeInvalidation(tenantId, termId),
      queryKeys.parent.fees(tenantId, studentId, termId),
      queryKeys.parent.dashboard(),
    ],
  });
}

/** US-FIN-006. Cashier initiates refund request. */
export function useCreateRefund(tenantId: string, termId: string) {
  return useIdempotentMutation<CreateRefundRequest, CreateRefundResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<CreateRefundResponse>(`/tenants/${tenantId}/refunds`, body, {
        idempotencyKey,
      }),
    invalidates: [
      ...financeInvalidation(tenantId, termId),
      queryKeys.workflow.mine(tenantId),
      queryKeys.workflow.inbox(tenantId),
    ],
  });
}

export interface UseDecideRefundWorkflowConfig {
  tenantId: string;
  instanceId: string;
  stepId: string;
  termId?: string;
  ensureStepUpToken: (action: StepUpAction) => Promise<StepUpTokenResult>;
}

/** US-FIN-006. Approve/reject refund workflow step (step-up MFA required on approve). */
export function useDecideRefundWorkflow(config: UseDecideRefundWorkflowConfig) {
  const { tenantId, instanceId, stepId, termId, ensureStepUpToken } = config;
  return useFinancialMutation<WorkflowDecideRequest, WorkflowInstanceResponse>({
    endpoint: `/tenants/${tenantId}/workflows/instances/${instanceId}/steps/${stepId}/decide`,
    action: 'refund_approve',
    ensureStepUpToken,
    invalidates: [
      queryKeys.workflow.inbox(tenantId),
      queryKeys.workflow.mine(tenantId),
      queryKeys.workflow.instance(tenantId, instanceId),
      ...financeInvalidation(tenantId, termId),
    ],
  });
}

// ── Reconciliation ─────────────────────────────────────────────────────────────

type ResolveReconciliationBody = ResolveReconciliationExceptionRequest & {
  exceptionId: string;
};

export function useReconciliationExceptions(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.finance.reconciliationExceptions(tenantId),
    queryFn: () =>
      client.get<ReconciliationExceptionListResponse>(
        `/tenants/${tenantId}/reconciliation/exceptions`,
      ),
    staleTime: 60_000,
    enabled: Boolean(tenantId),
  });
}

export function useResolveReconciliationException(tenantId: string) {
  return useIdempotentMutation<ResolveReconciliationBody, ReconciliationExceptionResponse>({
    mutationFn: (client, body, idempotencyKey) => {
      const { exceptionId, ...payload } = body;
      return client.post<ReconciliationExceptionResponse>(
        `/tenants/${tenantId}/reconciliation/exceptions/${exceptionId}/resolve`,
        payload,
        { idempotencyKey },
      );
    },
    invalidates: [queryKeys.finance.reconciliationExceptions(tenantId)],
  });
}
