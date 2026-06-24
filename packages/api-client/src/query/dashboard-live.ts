/** Hero KPIs — workflow, admissions, balances, attendance today. */
export const DASHBOARD_HERO_POLL_MS = 15_000;

/** Slower-moving dashboard context — term labels, branding, charts. */
export const DASHBOARD_CONTEXT_POLL_MS = 30_000;

export interface QueryLiveOptions {
  live?: boolean;
}

export function dashboardLiveQueryExtras(
  live?: boolean,
  pollMs: number = DASHBOARD_HERO_POLL_MS,
): {
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  staleTime?: number;
} {
  if (!live) return {};
  return {
    refetchInterval: pollMs,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: Math.min(pollMs, DASHBOARD_HERO_POLL_MS),
  };
}
