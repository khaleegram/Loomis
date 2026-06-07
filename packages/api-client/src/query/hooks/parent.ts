import { useQuery } from '@tanstack/react-query';
import type { ParentDashboardResponse } from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';

const STALE_MS = 30_000;

export function useParentDashboard() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['parent', 'dashboard'] as const,
    queryFn: () => client.get<ParentDashboardResponse>('/parents/me/dashboard'),
    staleTime: STALE_MS,
  });
}
