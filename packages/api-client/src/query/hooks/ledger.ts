import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';

const STALE_MS = 30_000;

export function usePsfObligations(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['ledger', 'psf-obligations', tenantId],
    queryFn: () => client.get<any>(`/tenants/${tenantId}/psf-obligations`),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId),
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
