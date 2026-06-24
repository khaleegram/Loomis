import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  PsfAdjustmentRequestListResponse,
  PsfAdjustmentRequestResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { dashboardLiveQueryExtras, type QueryLiveOptions } from '../dashboard-live.js';

const STALE_MS = 30_000;

export function usePsfObligations(tenantId: string, options?: QueryLiveOptions) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['ledger', 'psf-obligations', tenantId],
    queryFn: () => client.get<any>(`/tenants/${tenantId}/psf-obligations`),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId),
    ...dashboardLiveQueryExtras(options?.live),
  });
}

export function usePlatformLedger() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['platform', 'ledger', 'entries'],
    queryFn: () => client.get<any>('/platform/ledger/entries'),
    staleTime: STALE_MS,
  });
}

export function usePlatformBillingAdjustments() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['platform', 'billing', 'adjustments', 'pending'],
    queryFn: () =>
      client.get<PsfAdjustmentRequestListResponse>('/admin/billing/adjustments?status=pending'),
    staleTime: STALE_MS,
  });
}

export function useApproveBillingAdjustment() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      client.post<PsfAdjustmentRequestResponse>(`/admin/billing/adjustments/${id}/approve`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'billing', 'adjustments'] });
    },
  });
}

export function useRejectBillingAdjustment() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; rejectionReason: string }) =>
      client.post<PsfAdjustmentRequestResponse>(
        `/admin/billing/adjustments/${input.id}/reject`,
        { rejectionReason: input.rejectionReason },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'billing', 'adjustments'] });
    },
  });
}
