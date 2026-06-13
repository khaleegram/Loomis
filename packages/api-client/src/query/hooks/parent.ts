import { useQuery } from '@tanstack/react-query';
import type { ParentDashboardResponse } from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { queryKeys } from '../keys.js';

const STALE_MS = 30_000;

export function useParentDashboard(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.parent.dashboard(),
    queryFn: () => client.get<ParentDashboardResponse>('/parents/me/dashboard'),
    staleTime: STALE_MS,
    enabled,
  });
}
